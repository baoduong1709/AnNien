import asyncio
import json
import logging
from typing import Dict, Optional, Set
from fastapi import WebSocket
from app.core.live_client import GeminiLiveClient
from app.core.audio_relay import AudioRelay
from app.tools.handlers import tool_registry

logger = logging.getLogger("annien.session")


class LiveSession:
    """
    Manages a single real-time conversation session between a Client WebSocket
    and the Google Gemini Multimodal Live API upstream.
    """

    def __init__(self, session_id: str, client_ws: WebSocket, family=None):
        self.session_id = session_id
        self.client_ws = client_ws
        self.family = family
        self.live_client = GeminiLiveClient()
        self.is_active = False
        self.is_model_speaking = False
        self._tasks: Set[asyncio.Task] = set()

    async def start(self):
        """Initializes the upstream Gemini connection and starts message forwarding."""
        self.is_active = True
        logger.info(f"Starting session {self.session_id} for family: {self.family.family_name if self.family else 'Default'}")

        # Listen to tool execution events (e.g. SOS alerts or medication logs)
        tool_registry.register_listener(self._on_tool_event)

        # Set mock callback if running without API key
        self.live_client.set_message_callback(self._on_live_client_message)

        # Build personalized elder system instruction if family is specified
        custom_instruction = None
        ai_name = "An Nhiên"
        if self.family and self.family.elder:
            e = self.family.elder
            ai_name = getattr(e, "ai_name", "An Nhiên") or "An Nhiên"
            custom_instruction = (
                f"Bạn là {ai_name} — một trợ lý đồng hành bằng giọng nói nhân hậu, ấm áp, kiên nhẫn và ân cần của người cao tuổi.\n"
                f"Tên của bạn là '{ai_name}'. Người nhà và cụ thường gọi bạn là '{ai_name}', 'Cháu ơi', hoặc 'An Nhiên ơi'.\n"
                f"Bạn đang trò chuyện riêng với {e.preferred_name} (Họ tên đầy đủ: {e.full_name}).\n"
                f"Quy tắc xưng hô: Luôn xưng là 'Cháu' (hoặc '{ai_name}') và gọi người dùng là '{e.honorific}'.\n"
                f"Thông tin người thân: Năm sinh {e.birth_year}, quê quán/nơi ở: {e.address}.\n"
                f"Lưu ý sức khỏe đặc biệt: {e.medical_notes or 'Không có ghi chú'}.\n"
                f"SĐT người thân bảo hộ: {e.primary_caregiver_phone}.\n\n"
                f"QUY TẮC ĐIỀU KHIỂN BẰNG GIỌNG NÓI TOÀN DIỆN (HANDS-FREE VOICE UX):\n"
                f"1. ĐÁNH THỨC & CHÀO HỎI:\n"
                f"   - Khi nghe cụ gọi 'Cháu ơi', '{ai_name} ơi', 'An Nhiên ơi', bạn phải lập tức cất tiếng dạ thưa ấm áp: 'Dạ, cháu nghe đây ạ! {e.honorific} {e.preferred_name} cần cháu giúp gì không ạ?'.\n"
                f"2. NGHỈ NGƠI / TẠM DỪNG (STANDBY):\n"
                f"   - Khi cụ bảo 'Thôi cháu nghỉ đi', 'Dừng lại', 'Im lặng', 'Tắt đi', bạn phải lễ phép thưa: 'Dạ vâng, khi nào {e.honorific} cần cứ gọi \"Cháu ơi\" là cháu có mặt ngay nhé ạ!' và gọi ngay công cụ `enter_standby`.\n"
                f"3. THUỐC MEN:\n"
                f"   - Khi cụ hỏi về thuốc: Đọc to, rõ ràng từng cữ thuốc.\n"
                f"   - Khi cụ bảo 'Tôi uống thuốc rồi' hoặc 'Cụ uống rồi': Gọi ngay công cụ `mark_medication_taken` để ghi nhận và khen ngợi cụ.\n"
                f"   - Khi cụ dặn nhắc cữ thuốc mới: Gọi công cụ `remind_medication`.\n"
                f"4. KHO KÝ ỨC GIA ĐÌNH & KỂ CHUYỆN:\n"
                f"   - Khi cụ muốn nghe chuyện xưa, ôn lại kỷ niệm dạy học hay quê quán: Hãy kể lại với giọng ấm áp, tình cảm, khơi gợi niềm tự hào và niềm vui của cụ.\n"
                f"5. BÁO ĐỘNG KHẨN CẤP SOS:\n"
                f"   - Nếu cụ kêu cứu, kêu đau ngực, khó thở, chóng mặt, té ngã: LẬP TỨC gọi công cụ `trigger_sos_alert` và cất lời trấn an, dặn cụ ngồi yên chờ cứu trợ.\n"
                f"6. TÂM SỰ & CẢM XÚC:\n"
                f"   - Khi cụ tâm sự chuyện vui buồn: Lắng nghe chân thành và gọi công cụ `record_mood`."
            )

        # Connect to Gemini Live upstream
        await self.live_client.connect(system_instruction=custom_instruction)

        # Send session started greeting to client
        await self.send_json({
            "type": "session_started",
            "session_id": self.session_id,
            "sample_rate_in": 16000,
            "sample_rate_out": 24000,
            "model": self.live_client.model,
            "mock_mode": self.live_client.is_mock_mode,
            "family_id": self.family.id if self.family else "fam_default",
            "elder_name": self.family.elder.preferred_name if self.family and self.family.elder else "Cụ",
            "ai_name": ai_name,
            "wake_words": ["cháu ơi", f"{ai_name.lower()} ơi", "an nhiên ơi"]
        })

        # Start listening to upstream Gemini messages
        upstream_task = asyncio.create_task(
            self.live_client.listen_loop(
                on_audio_chunk=self._on_upstream_audio,
                on_transcript=self._on_upstream_transcript,
                on_barge_in=self._on_upstream_barge_in
            )
        )
        self._tasks.add(upstream_task)
        upstream_task.add_done_callback(self._tasks.discard)

    def _on_live_client_message(self, msg: Dict):
        asyncio.create_task(self.send_json(msg))

    def _on_tool_event(self, event: Dict):
        """Dispatches tool events (like SOS or medication created) directly to client."""
        asyncio.create_task(self.send_json(event))
        # If SOS alert has deterministic TTS audio announcement, stream it as audio_chunk so client speaks it immediately
        if event.get("type") == "sos_alert" and event.get("tts_audio_base64"):
            asyncio.create_task(self.send_json({
                "type": "audio_chunk",
                "data": event["tts_audio_base64"],
                "sample_rate": 24000
            }))

    def _on_upstream_audio(self, pcm_base64: str):
        """Upstream Gemini generated a 24kHz PCM audio chunk."""
        self.is_model_speaking = True
        asyncio.create_task(self.send_json({
            "type": "audio_chunk",
            "data": pcm_base64,
            "sample_rate": 24000
        }))

    def _on_upstream_transcript(self, role: str, text: str):
        """Upstream Gemini generated speech-to-text or model transcript."""
        asyncio.create_task(self.send_json({
            "type": "transcript",
            "role": role,
            "text": text,
            "is_final": True
        }))

    def _on_upstream_barge_in(self):
        """Gemini detected that the elder interrupted the AI."""
        self.is_model_speaking = False
        asyncio.create_task(self.send_json({
            "type": "barge_in",
            "reason": "upstream_interrupted"
        }))

    async def handle_client_message(self, data: str):
        """Processes an incoming JSON message from the Client WebSocket."""
        try:
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "audio_chunk":
                # Audio from client microphone (PCM 16kHz base64)
                pcm_b64 = msg.get("data", "")
                if pcm_b64:
                    # Check for client-side Barge-In if AI is currently speaking
                    if self.is_model_speaking:
                        raw_bytes = AudioRelay.decode_base64_pcm(pcm_b64)
                        if AudioRelay.is_speech_active(raw_bytes, threshold_rms=0.03):
                            logger.info("Local barge-in detected! Elder interrupted playing audio.")
                            self.is_model_speaking = False
                            await self.send_json({
                                "type": "barge_in",
                                "reason": "elder_spoke"
                            })

                    # Relay to Gemini Live API
                    await self.live_client.send_audio_chunk(pcm_b64)

            elif msg_type == "text_message":
                text = msg.get("text", "")
                logger.info(f"Received text message from elder: {text}")
                await self.live_client.send_text_turn(text)

            elif msg_type == "interrupt":
                # Manual barge-in button pressed on client
                self.is_model_speaking = False
                await self.send_json({"type": "barge_in", "reason": "manual"})

            elif msg_type == "trigger_sos":
                # Instant SOS trigger over WebSocket
                reason = msg.get("reason", "Báo động khẩn cấp từ người cao tuổi")
                severity = msg.get("severity", "CRITICAL")
                location = msg.get("location", "Trong nhà")
                logger.warning(f"Elder triggered manual SOS over WebSocket: {reason}")
                await tool_registry.execute_tool("trigger_sos_alert", {
                    "severity": severity,
                    "reason": reason,
                    "location": location
                })

            elif msg_type == "record_mood":
                sentiment = msg.get("sentiment", "NEUTRAL")
                emotion = msg.get("emotion", "Bình thường")
                notes = msg.get("notes", "")
                await tool_registry.execute_tool("record_mood", {
                    "sentiment": sentiment,
                    "emotion": emotion,
                    "notes": notes
                })

            elif msg_type == "ping":
                await self.send_json({"type": "pong"})


        except json.JSONDecodeError:
            logger.error("Received non-JSON message from client.")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")

    async def send_json(self, data: Dict):
        """Sends a JSON message down to the client WebSocket."""
        if not self.is_active:
            return
        try:
            await self.client_ws.send_text(json.dumps(data))
        except Exception as e:
            logger.debug(f"Failed to send to client WebSocket ({e}). Marking session inactive.")
            self.is_active = False

    async def close(self):
        """Closes session and cleans up resources."""
        self.is_active = False
        tool_registry.unregister_listener(self._on_tool_event)

        for task in list(self._tasks):
            task.cancel()

        await self.live_client.close()
        logger.info(f"Session {self.session_id} closed cleanly.")


class SessionManager:
    """Tracks active client sessions connected to the gateway."""

    def __init__(self):
        self._sessions: Dict[str, LiveSession] = {}

    def add_session(self, session: LiveSession):
        self._sessions[session.session_id] = session

    def remove_session(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def get_session(self, session_id: str) -> Optional[LiveSession]:
        return self._sessions.get(session_id)

    @property
    def active_count(self) -> int:
        return len(self._sessions)


session_manager = SessionManager()
