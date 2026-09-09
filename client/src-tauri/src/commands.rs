use crate::audio::capture::AudioCapture;
use crate::audio::player::AudioPlayer;
use crate::gateway::ws_client::GatewayClient;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde_json::json;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

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
        let mut player_lock = state.player.lock().unwrap();
        if player_lock.is_none() {
            match AudioPlayer::new() {
                Ok(p) => *player_lock = Some(p),
                Err(e) => eprintln!("Audio player warning: {}", e),
            }
        }
    }

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
                            let player_guard = player_clone.lock().unwrap();
                            if let Some(player) = &*player_guard {
                                player.enqueue_pcm(&bytes);
                            }
                        }
                    }
                } else if val.get("type").and_then(|t| t.as_str()) == Some("barge_in") {
                    let player_guard = player_clone.lock().unwrap();
                    if let Some(player) = &*player_guard {
                        player.interrupt();
                    }
                }
            }
        })
        .await?;

    // 3. Start Audio Capture (16kHz PCM)
    let gateway_audio = state.gateway.clone();
    let mut capture = state.capture.lock().unwrap();
    capture.start(move |pcm_bytes| {
        let b64 = BASE64.encode(&pcm_bytes);
        let msg = json!({
            "type": "audio_chunk",
            "data": b64,
            "sample_rate": 16000
        })
        .to_string();

        let _ = gateway_audio.send(msg);
    })?;

    Ok("Listening started successfully".to_string())
}

#[tauri::command]
pub async fn stop_listening(state: State<'_, AppState>) -> Result<String, String> {
    let mut capture = state.capture.lock().unwrap();
    capture.stop();

    let player_guard = state.player.lock().unwrap();
    if let Some(player) = &*player_guard {
        player.interrupt();
    }

    state.gateway.disconnect();

    Ok("Listening stopped".to_string())
}

#[tauri::command]
pub async fn barge_in(state: State<'_, AppState>) -> Result<String, String> {
    let player_guard = state.player.lock().unwrap();
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
        let cap = state.capture.lock().unwrap();
        assert!(!cap.is_capturing());
    }
}
