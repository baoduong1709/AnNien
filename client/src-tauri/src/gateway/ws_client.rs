use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(default)]
    pub data: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub sample_rate: Option<u32>,
}

pub struct GatewayClient {
    tx: Arc<Mutex<Option<mpsc::UnboundedSender<String>>>>,
}

impl GatewayClient {
    pub fn new() -> Self {
        Self {
            tx: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect<F>(&self, url: String, mut on_message: F) -> Result<(), String>
    where
        F: FnMut(String) + Send + 'static,
    {
        // Close any existing connection sender
        self.disconnect();

        println!("[GatewayClient] Connecting to: {}", url);

        // Install ring CryptoProvider for rustls (required on Android)
        let _ = rustls::crypto::ring::default_provider().install_default();

        // 10-second timeout to avoid hanging on TLS issues
        let connect_result = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            connect_async(&url)
        ).await;

        let (ws_stream, response) = match connect_result {
            Ok(Ok((stream, resp))) => (stream, resp),
            Ok(Err(e)) => {
                let err_msg = format!("WebSocket connection error: {}", e);
                eprintln!("[GatewayClient] {}", err_msg);
                return Err(err_msg);
            }
            Err(_) => {
                let err_msg = "WebSocket connection timed out after 10s (possible TLS/Cloudflare issue)".to_string();
                eprintln!("[GatewayClient] {}", err_msg);
                return Err(err_msg);
            }
        };

        println!("[GatewayClient] Connected! HTTP status: {}", response.status());

        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();

        {
            let mut current_tx = self.tx.lock().unwrap();
            *current_tx = Some(tx);
        }

        // Outgoing sender task
        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = write.send(Message::Text(msg)).await {
                    eprintln!("[GatewayClient] Send error: {}", e);
                    break;
                }
            }
            println!("[GatewayClient] Outgoing sender task ended");
        });

        // Incoming receiver task
        tokio::spawn(async move {
            println!("[GatewayClient] Listening for incoming messages...");
            while let Some(msg_res) = read.next().await {
                match msg_res {
                    Ok(Message::Text(text)) => {
                        println!("[GatewayClient] Received message: {}...", &text[..text.len().min(100)]);
                        on_message(text);
                    }
                    Ok(Message::Close(_)) => {
                        println!("[GatewayClient] WebSocket closed by server.");
                        break;
                    }
                    Err(e) => {
                        eprintln!("[GatewayClient] WebSocket read error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
            println!("[GatewayClient] Incoming receiver task ended");
        });

        Ok(())
    }

    pub fn send(&self, msg: String) -> Result<(), String> {
        let current_tx = self.tx.lock().unwrap();
        if let Some(tx) = &*current_tx {
            tx.send(msg).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Not connected to gateway".to_string())
        }
    }

    pub fn disconnect(&self) {
        let mut current_tx = self.tx.lock().unwrap();
        *current_tx = None;
    }

    pub fn is_connected(&self) -> bool {
        let current_tx = self.tx.lock().unwrap();
        current_tx.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_message_serialization() {
        let msg = WsMessage {
            msg_type: "audio_chunk".to_string(),
            data: Some("AAAA".to_string()),
            text: None,
            reason: None,
            sample_rate: Some(16000),
        };

        let json_str = serde_json::to_string(&msg).unwrap();
        assert!(json_str.contains("\"type\":\"audio_chunk\""));
        assert!(json_str.contains("\"sample_rate\":16000"));

        let deserialized: WsMessage = serde_json::from_str(&json_str).unwrap();
        assert_eq!(deserialized.msg_type, "audio_chunk");
        assert_eq!(deserialized.sample_rate, Some(16000));
        assert_eq!(deserialized.data, Some("AAAA".to_string()));
    }

    #[test]
    fn test_gateway_client_disconnected_by_default() {
        let client = GatewayClient::new();
        assert!(!client.is_connected());
        assert!(client.send("test".to_string()).is_err());
    }
}


