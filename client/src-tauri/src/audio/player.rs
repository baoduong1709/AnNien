use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
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

// 150ms of audio at 24kHz = 3,600 samples. Prebuffering prevents underruns/choppy audio.
const PREBUFFER_THRESHOLD_SAMPLES: usize = 3600;

pub struct AudioPlayer {
    buffer: Arc<Mutex<VecDeque<f32>>>,
    /// Flag: true when actively playing audio to speaker
    pub is_playing: Arc<AtomicBool>,
    /// Flag: true when waiting for enough samples before starting playback
    pub is_prebuffering: Arc<AtomicBool>,
    #[allow(dead_code)]
    stream: Option<Stream>,
}

unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Result<Self, String> {
        let buffer: Arc<Mutex<VecDeque<f32>>> = Arc::new(Mutex::new(VecDeque::with_capacity(24000 * 5)));
        let buffer_clone = buffer.clone();
        let is_playing = Arc::new(AtomicBool::new(false));
        let is_playing_clone = is_playing.clone();
        let is_prebuffering = Arc::new(AtomicBool::new(true));
        let is_prebuffering_clone = is_prebuffering.clone();

        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| "No default audio output device found".to_string())?;

        let err_fn = |err| eprintln!("Audio player stream error: {}", err);

        // Try direct 24kHz mono first
        let direct_config = cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(24000),
            buffer_size: cpal::BufferSize::Default,
        };

        let stream = match device.build_output_stream(
            &direct_config,
            {
                let buf_c = buffer_clone.clone();
                let playing_c = is_playing_clone.clone();
                let prebuf_c = is_prebuffering_clone.clone();
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    let mut buf = buf_c.lock().unwrap_or_else(|e| e.into_inner());

                    if prebuf_c.load(Ordering::Relaxed) {
                        for sample in data.iter_mut() {
                            *sample = 0.0;
                        }
                        return;
                    }

                    if buf.is_empty() {
                        prebuf_c.store(true, Ordering::Relaxed);
                        playing_c.store(false, Ordering::Relaxed);
                        for sample in data.iter_mut() {
                            *sample = 0.0;
                        }
                        return;
                    }

                    playing_c.store(true, Ordering::Relaxed);
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
                let def_config = device
                    .default_output_config()
                    .map_err(|e| format!("Failed to query default output config: {}", e))?;
                let channels = def_config.channels() as usize;
                let sample_rate = def_config.sample_rate().0 as f64;
                let stream_config: cpal::StreamConfig = def_config.into();

                let step = 24000.0 / sample_rate;
                let mut current_pos = 0.0_f64;
                let mut last_sample = 0.0_f32;
                let mut next_sample = 0.0_f32;

                let buf_c = buffer_clone.clone();
                let playing_c = is_playing_clone.clone();
                let prebuf_c = is_prebuffering_clone.clone();
                device
                    .build_output_stream(
                        &stream_config,
                        move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                            let mut buf = buf_c.lock().unwrap_or_else(|e| e.into_inner());

                            if prebuf_c.load(Ordering::Relaxed) {
                                for sample in data.iter_mut() {
                                    *sample = 0.0;
                                }
                                return;
                            }

                            if buf.is_empty() {
                                prebuf_c.store(true, Ordering::Relaxed);
                                playing_c.store(false, Ordering::Relaxed);
                                for sample in data.iter_mut() {
                                    *sample = 0.0;
                                }
                                return;
                            }

                            playing_c.store(true, Ordering::Relaxed);
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
            is_playing,
            is_prebuffering,
            stream: Some(stream),
        })
    }

    /// Enqueues raw 16-bit PCM bytes (24kHz) for playback
    pub fn enqueue_pcm(&self, pcm_bytes: &[u8]) {
        let mut buf = self.buffer.lock().unwrap_or_else(|e| e.into_inner());
        let samples = pcm16_le_to_f32(pcm_bytes);
        buf.extend(samples);

        if self.is_prebuffering.load(Ordering::Relaxed) && buf.len() >= PREBUFFER_THRESHOLD_SAMPLES {
            self.is_prebuffering.store(false, Ordering::Relaxed);
            self.is_playing.store(true, Ordering::Relaxed);
        }
    }

    /// Barge-in interrupt: instantly empties playback queue
    pub fn interrupt(&self) {
        let mut buf = self.buffer.lock().unwrap_or_else(|e| e.into_inner());
        buf.clear();
        self.is_playing.store(false, Ordering::Relaxed);
        self.is_prebuffering.store(true, Ordering::Relaxed);
    }

    /// Returns true if currently playing audio
    pub fn is_playing(&self) -> bool {
        self.is_playing.load(Ordering::Relaxed)
    }

    /// Returns current number of samples remaining in playback buffer
    pub fn buffer_len(&self) -> usize {
        let buf = self.buffer.lock().unwrap_or_else(|e| e.into_inner());
        buf.len()
    }
}
