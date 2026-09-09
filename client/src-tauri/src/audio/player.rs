use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

/// Converts raw 16-bit little-endian PCM bytes to f32 samples (-1.0 to 1.0).
pub fn pcm16_le_to_f32(pcm_bytes: &[u8]) -> Vec<f32> {
    let mut samples = Vec::with_capacity(pcm_bytes.len() / 2);
    for chunk in pcm_bytes.chunks_exact(2) {
        let sample_i16 = i16::from_le_bytes([chunk[0], chunk[1]]);
        let sample_f32 = sample_i16 as f32 / 32768.0;
        samples.push(sample_f32);
    }
    samples
}

pub struct AudioPlayer {
    buffer: Arc<Mutex<VecDeque<f32>>>,
    #[allow(dead_code)]
    stream: Option<Stream>,
}

unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Result<Self, String> {
        let buffer = Arc::new(Mutex::new(VecDeque::new()));
        let buffer_clone = buffer.clone();

        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| "No default audio output device found".to_string())?;

        let err_fn = |err| eprintln!("Audio player stream error: {}", err);

        // Try direct 24kHz mono first
        let direct_config = cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(24000), // 24kHz matching Gemini Live output
            buffer_size: cpal::BufferSize::Default,
        };

        let stream = match device.build_output_stream(
            &direct_config,
            {
                let buf_c = buffer_clone.clone();
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    let mut buf = buf_c.lock().unwrap();
                    for sample in data.iter_mut() {
                        *sample = buf.pop_front().unwrap_or(0.0);
                    }
                }
            },
            err_fn,
            None,
        ) {
            Ok(s) => s,
            Err(_) => {
                // Fallback to default output device config
                let def_config = device
                    .default_output_config()
                    .map_err(|e| format!("Failed to query default output config: {}", e))?;
                let channels = def_config.channels() as usize;
                let sample_rate = def_config.sample_rate().0 as f64;
                let stream_config: cpal::StreamConfig = def_config.into();

                // Ratio: native_rate / 24000
                let step = 24000.0 / sample_rate;
                let mut current_pos = 0.0_f64;
                let mut last_sample = 0.0_f32;
                let mut next_sample = 0.0_f32;

                let buf_c = buffer_clone.clone();
                device
                    .build_output_stream(
                        &stream_config,
                        move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                            let mut buf = buf_c.lock().unwrap();
                            let num_frames = data.len() / channels;

                            for f in 0..num_frames {
                                while current_pos >= 1.0 {
                                    current_pos -= 1.0;
                                    last_sample = next_sample;
                                    next_sample = buf.pop_front().unwrap_or(0.0);
                                }
                                let interpolated = last_sample + (current_pos as f32) * (next_sample - last_sample);
                                for c in 0..channels {
                                    data[f * channels + c] = interpolated;
                                }
                                current_pos += step;
                            }
                        },
                        err_fn,
                        None,
                    )
                    .map_err(|e| format!("Failed to build fallback audio output stream: {}", e))?
            }
        };

        stream
            .play()
            .map_err(|e| format!("Failed to start audio playback stream: {}", e))?;

        Ok(Self {
            buffer,
            stream: Some(stream),
        })
    }

    /// Enqueues raw 16-bit PCM bytes (24kHz) for playback
    pub fn enqueue_pcm(&self, pcm_bytes: &[u8]) {
        let mut buf = self.buffer.lock().unwrap();
        let samples = pcm16_le_to_f32(pcm_bytes);
        buf.extend(samples);
    }

    /// Barge-in interrupt: instantly empties playback queue
    pub fn interrupt(&self) {
        let mut buf = self.buffer.lock().unwrap();
        buf.clear();
    }

    /// Returns current number of samples remaining in playback buffer
    pub fn buffer_len(&self) -> usize {
        let buf = self.buffer.lock().unwrap();
        buf.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pcm16_le_to_f32_conversion() {
        let mut pcm = Vec::new();
        pcm.extend_from_slice(&0_i16.to_le_bytes());
        pcm.extend_from_slice(&32767_i16.to_le_bytes());
        pcm.extend_from_slice(&(-32768_i16).to_le_bytes());

        let samples = pcm16_le_to_f32(&pcm);
        assert_eq!(samples.len(), 3);
        assert_eq!(samples[0], 0.0);
        assert!((samples[1] - 1.0).abs() < 0.001);
        assert_eq!(samples[2], -1.0);
    }

    #[test]
    fn test_audio_player_queue_and_interrupt() {
        let buffer = Arc::new(Mutex::new(VecDeque::new()));
        let player = AudioPlayer {
            buffer: buffer.clone(),
            stream: None,
        };

        assert_eq!(player.buffer_len(), 0);

        let pcm = vec![0u8; 480]; // 240 samples
        player.enqueue_pcm(&pcm);
        assert_eq!(player.buffer_len(), 240);

        // Barge-in interrupt: should clear instantly
        player.interrupt();
        assert_eq!(player.buffer_len(), 0);
    }
}
