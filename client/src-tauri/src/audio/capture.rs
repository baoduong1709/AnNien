use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

/// Converts f32 audio samples (-1.0 to 1.0) to 16-bit linear PCM little-endian bytes.
pub fn convert_f32_to_pcm16_le(samples: &[f32]) -> Vec<u8> {
    let mut pcm_bytes = Vec::with_capacity(samples.len() * 2);
    for &sample in samples {
        let clamped = sample.max(-1.0).min(1.0);
        let val = if clamped < 0.0 {
            (clamped * 32768.0) as i16
        } else {
            (clamped * 32767.0) as i16
        };
        pcm_bytes.extend_from_slice(&val.to_le_bytes());
    }
    pcm_bytes
}

/// Downsamples multichannel or non-16kHz audio to 16kHz Mono.
pub fn downsample_and_mix_to_16k_mono(input: &[f32], channels: u16, src_rate: u32) -> Vec<f32> {
    if input.is_empty() {
        return Vec::new();
    }
    let ch = channels.max(1) as usize;
    let num_frames = input.len() / ch;
    if num_frames == 0 {
        return Vec::new();
    }

    // Step 1: Downmix channels to mono
    let mono: Vec<f32> = (0..num_frames)
        .map(|f| {
            let start = f * ch;
            let sum: f32 = input[start..start + ch].iter().sum();
            sum / (ch as f32)
        })
        .collect();

    if src_rate == 16000 {
        return mono;
    }

    // Step 2: Linear resample to 16kHz
    let target_rate = 16000.0_f64;
    let ratio = src_rate as f64 / target_rate;
    let target_len = ((num_frames as f64) / ratio).floor() as usize;
    let mut resampled = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_pos = i as f64 * ratio;
        let idx0 = src_pos.floor() as usize;
        let frac = (src_pos - idx0 as f64) as f32;
        let idx1 = (idx0 + 1).min(mono.len() - 1);
        let s0 = mono.get(idx0).copied().unwrap_or(0.0);
        let s1 = mono.get(idx1).copied().unwrap_or(s0);
        resampled.push(s0 + frac * (s1 - s0));
    }

    resampled
}

pub struct AudioCapture {
    stream: Option<Stream>,
    is_running: Arc<AtomicBool>,
}

unsafe impl Send for AudioCapture {}
unsafe impl Sync for AudioCapture {}

impl AudioCapture {
    pub fn new() -> Self {
        Self {
            stream: None,
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Starts capturing microphone audio at 16kHz 16-bit mono.
    /// Callback receives raw 16-bit linear PCM bytes.
    pub fn start<F>(&mut self, on_pcm_chunk: F) -> Result<(), String>
    where
        F: FnMut(Vec<u8>) + Send + 'static,
    {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| "No default audio input device found".to_string())?;

        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();
        let callback = Arc::new(Mutex::new(on_pcm_chunk));

        let err_fn = |err| eprintln!("Audio capture stream error: {}", err);

        // First attempt: request 16kHz mono directly
        let direct_config = cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(16000),
            buffer_size: cpal::BufferSize::Default,
        };

        let cb_direct = callback.clone();
        let is_running_direct = is_running.clone();
        let direct_res = device.build_input_stream(
            &direct_config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if !is_running_direct.load(Ordering::SeqCst) {
                    return;
                }
                let pcm = convert_f32_to_pcm16_le(data);
                if !pcm.is_empty() {
                    if let Ok(mut lock) = cb_direct.lock() {
                        (lock)(pcm);
                    }
                }
            },
            err_fn,
            None,
        );

        let stream = match direct_res {
            Ok(s) => s,
            Err(_) => {
                let def_config = device
                    .default_input_config()
                    .map_err(|e| format!("Failed to query default input config: {}", e))?;
                let channels = def_config.channels();
                let sample_rate = def_config.sample_rate().0;
                let stream_config: cpal::StreamConfig = def_config.into();

                let cb_fb = callback.clone();
                let is_running_fb = is_running.clone();
                device
                    .build_input_stream(
                        &stream_config,
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            if !is_running_fb.load(Ordering::SeqCst) {
                                return;
                            }
                            let resampled = downsample_and_mix_to_16k_mono(data, channels, sample_rate);
                            let pcm = convert_f32_to_pcm16_le(&resampled);
                            if !pcm.is_empty() {
                                if let Ok(mut lock) = cb_fb.lock() {
                                    (lock)(pcm);
                                }
                            }
                        },
                        err_fn,
                        None,
                    )
                    .map_err(|e| format!("Failed to build fallback input stream: {}", e))?
            }
        };

        stream
            .play()
            .map_err(|e| format!("Failed to play input stream: {}", e))?;

        self.stream = Some(stream);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
        self.stream = None;
    }

    pub fn is_capturing(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_f32_to_pcm16_le() {
        let samples = vec![0.0, 1.0, -1.0, 0.5];
        let pcm = convert_f32_to_pcm16_le(&samples);
        assert_eq!(pcm.len(), 8);

        // 0.0 -> 0
        assert_eq!(i16::from_le_bytes([pcm[0], pcm[1]]), 0);
        // 1.0 -> 32767
        assert_eq!(i16::from_le_bytes([pcm[2], pcm[3]]), 32767);
        // -1.0 -> -32768
        assert_eq!(i16::from_le_bytes([pcm[4], pcm[5]]), -32768);
        // 0.5 -> 16383 approx
        let s3 = i16::from_le_bytes([pcm[6], pcm[7]]);
        assert!(s3 >= 16380 && s3 <= 16390);
    }

    #[test]
    fn test_downsample_and_mix_to_16k_mono() {
        let stereo = vec![0.2, 0.4, 0.6, 0.8, 0.2, 0.4, 0.6, 0.8];
        let mono = downsample_and_mix_to_16k_mono(&stereo, 2, 32000);
        assert_eq!(mono.len(), 2);
    }
}
