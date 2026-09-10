use crate::audio::capture::AudioCapture;
use crate::audio::player::AudioPlayer;
use crate::gateway::ws_client::GatewayClient;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde_json::json;
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Emitter, State};

/// Helper to lock a Mutex, recovering from poison if a previous thread panicked.
fn lock_or_recover<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|poisoned| {
        eprintln!("[AnNien] Recovering from poisoned mutex");
        poisoned.into_inner()
    })
}

struct SendVad(webrtc_vad::Vad);
unsafe impl Send for SendVad {}
impl SendVad {
    pub fn is_voice(&mut self, segment: &[i16]) -> Result<bool, ()> {
        self.0.is_voice_segment(segment)
    }
}

pub struct AppState {
    pub capture: Arc<Mutex<AudioCapture>>,
    pub player: Arc<Mutex<Option<AudioPlayer>>>,
    pub gateway: Arc<GatewayClient>,
}

#[tauri::command]
pub async fn start_listening(
    app: AppHandle,
    state: State<'_, AppState>,
    gateway_url: String,
) -> Result<String, String> {
    // 1. Initialize Player if not yet initialized
    {
        let mut player_lock = lock_or_recover(&state.player);
        if player_lock.is_none() {
            match AudioPlayer::new() {
                Ok(p) => *player_lock = Some(p),
                Err(e) => eprintln!("Audio player warning: {}", e),
            }
        }
    }

    // Spawn playback state monitor to notify frontend of exact speaker start/finish
    let player_for_monitor = state.player.clone();
    let app_for_monitor = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut last_state = false;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            let current_state = {
                let guard = player_for_monitor.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(player) = &*guard {
                    player.is_playing()
                } else {
                    false
                }
            };
            if current_state != last_state {
                last_state = current_state;
                let _ = app_for_monitor.emit(
                    "playback_state",
                    serde_json::json!({ "is_playing": current_state }).to_string(),
                );
            }
        }
    });

    let gateway = state.gateway.clone();
    let app_clone = app.clone();
    let player_clone = state.player.clone();

    // 2. Connect to WebSocket Gateway
    gateway
        .connect(gateway_url, move |raw_msg| {
            // Forward event to Tauri frontend
            let _ = app_clone.emit("gateway_message", raw_msg.clone());

            // Check if audio chunk to play
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&raw_msg) {
                if val.get("type").and_then(|t| t.as_str()) == Some("audio_chunk") {
                    if let Some(b64) = val.get("data").and_then(|d| d.as_str()) {
                        if let Ok(bytes) = BASE64.decode(b64) {
                            let player_guard = lock_or_recover(&player_clone);
                            if let Some(player) = &*player_guard {
                                player.enqueue_pcm(&bytes);
                            }
                        }
                    }
                } else if val.get("type").and_then(|t| t.as_str()) == Some("barge_in") {
                    let player_guard = lock_or_recover(&player_clone);
                    if let Some(player) = &*player_guard {
                        player.interrupt();
                    }
                }
            }
        })
        .await?;

    // 3. Start Audio Capture (16kHz PCM) with VAD & Echo Protection
    let gateway_audio = state.gateway.clone();
    let player_echo = state.player.clone();
    let mut capture = lock_or_recover(&state.capture);
    capture.stop();

    use std::sync::atomic::{AtomicU64, Ordering};
    static CHUNK_COUNTER: AtomicU64 = AtomicU64::new(0);


    capture.start(move |pcm_bytes| {
        let count = CHUNK_COUNTER.fetch_add(1, Ordering::Relaxed);

        // Check if Gemini is currently speaking
        let is_speaker_active = {
            let player_guard = player_echo.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(player) = &*player_guard {
                player.is_playing()
            } else {
                false
            }
        };

        // Echo protection: mute mic while Gemini is speaking through the speaker
        if is_speaker_active {
            return;
        }

        if count % 100 == 0 {
            let mut sum_sq: f64 = 0.0;
            let sample_count = pcm_bytes.len() / 2;
            for chunk in pcm_bytes.chunks_exact(2) {
                let sample = i16::from_le_bytes([chunk[0], chunk[1]]) as f64;
                sum_sq += sample * sample;
            }
            let rms = if sample_count > 0 { (sum_sq / sample_count as f64).sqrt() } else { 0.0 };
            println!("[AudioCapture] Streaming chunk #{} (rms={:.0})", count, rms);
        }

        let b64 = BASE64.encode(&pcm_bytes);
        let msg = json!({
            "type": "audio_chunk",
            "data": b64,
            "sample_rate": 16000
        }).to_string();

        let _ = gateway_audio.send(msg);
    })?;

    Ok("Listening started successfully".to_string())
}

/// VAD mode: mic on, only detect voice activity, emit event to frontend.
/// Khi phát hiện giọng nói, emit "voice_detected" → frontend sẽ gọi start_listening.
#[tauri::command]
pub async fn start_vad_listening(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut capture = lock_or_recover(&state.capture);

    if capture.is_vad_active() {
        return Ok("VAD already running".to_string());
    }

    // Stop regular capture if running
    if capture.is_capturing() {
        capture.stop();
        state.gateway.disconnect();
    }

    let app_clone = app.clone();
    let voice_detected_sent = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

    capture.start_vad(move || {
        // Chỉ emit 1 lần cho mỗi "phiên" phát hiện giọng nói
        if !voice_detected_sent.swap(true, std::sync::atomic::Ordering::SeqCst) {
            println!("[VAD] Voice detected! Emitting event to frontend.");
            let _ = app_clone.emit("voice_detected", "voice_activity");
        }
    })?;

    Ok("VAD listening started".to_string())
}

#[tauri::command]
pub async fn stop_vad_listening(state: State<'_, AppState>) -> Result<String, String> {
    let mut capture = lock_or_recover(&state.capture);
    capture.stop_vad();
    Ok("VAD listening stopped".to_string())
}

#[tauri::command]
pub async fn stop_listening(state: State<'_, AppState>) -> Result<String, String> {
    let mut capture = lock_or_recover(&state.capture);
    capture.stop();

    let player_guard = lock_or_recover(&state.player);
    if let Some(player) = &*player_guard {
        player.interrupt();
    }

    state.gateway.disconnect();

    Ok("Listening stopped".to_string())
}

#[tauri::command]
pub async fn barge_in(state: State<'_, AppState>) -> Result<String, String> {
    let player_guard = lock_or_recover(&state.player);
    if let Some(player) = &*player_guard {
        player.interrupt();
    }

    let msg = json!({"type": "interrupt"}).to_string();
    let _ = state.gateway.send(msg);

    Ok("Barge-in dispatched".to_string())
}

#[tauri::command]
pub async fn send_text(state: State<'_, AppState>, text: String) -> Result<String, String> {
    let msg = json!({
        "type": "text_message",
        "text": text
    })
    .to_string();

    state.gateway.send(msg)?;
    Ok("Text sent".to_string())
}

#[tauri::command]
pub async fn trigger_emergency_sos(
    state: State<'_, AppState>,
    reason: String,
) -> Result<String, String> {
    let msg = json!({
        "type": "trigger_sos",
        "reason": reason
    })
    .to_string();

    state.gateway.send(msg)?;
    Ok("SOS triggered".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_creation() {
        let state = AppState {
            capture: Arc::new(Mutex::new(AudioCapture::new())),
            player: Arc::new(Mutex::new(None)),
            gateway: Arc::new(GatewayClient::new()),
        };

        assert!(!state.gateway.is_connected());
        let cap = lock_or_recover(&state.capture);
        assert!(!cap.is_capturing());
    }
}
