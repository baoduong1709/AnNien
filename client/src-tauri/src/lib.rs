pub mod audio;
pub mod commands;
pub mod gateway;

use audio::capture::AudioCapture;
use commands::{barge_in, send_text, start_listening, start_vad_listening, stop_listening, stop_vad_listening, trigger_emergency_sos, AppState};
use gateway::ws_client::GatewayClient;
use std::sync::{Arc, Mutex};

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "C" fn __cxa_pure_virtual() {
    eprintln!("Pure virtual function call");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            capture: Arc::new(Mutex::new(AudioCapture::new())),
            player: Arc::new(Mutex::new(None)),
            gateway: Arc::new(GatewayClient::new()),
        })
        .invoke_handler(tauri::generate_handler![
            start_listening,
            stop_listening,
            start_vad_listening,
            stop_vad_listening,
            barge_in,
            send_text,
            trigger_emergency_sos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
