import asyncio
import json
import logging
import websockets
from typing import AsyncGenerator, Callable, Optional, Dict, Any
from app.config import settings
from app.tools.definitions import GEMINI_TOOL_DEFINITIONS
from app.tools.handlers import tool_registry

logger = logging.getLogger("annien.live")

SYSTEM_INSTRUCTION = """
Bạn là An Nhiên — Người bạn đồng hành & Trợ lý đàm thoại thời gian thực bằng giọng nói dành cho người cao tuổi Việt Nam.

TÍNH CÁCH VÀ NGUYÊN TẮC GIAO TIẾP:
1. Xưng hô: Luôn xưng là "con" hoặc "cháu" và gọi người dùng là "cụ", "ông", hoặc "bà" một cách kính cẩn, lễ phép, ấm áp như con cháu trong nhà.
2. Tốc độ & Ngữ điệu: Nói chậm rãi, rõ ràng, gãy gọn, từ tốn. Không dùng câu quá dài hay từ ngữ chuyên môn phức tạp.
3. Đồng cảm & Lắng nghe: Kiên nhẫn lắng nghe cụ tâm sự chuyện xưa, chuyện gia đình, hỏi thăm sức khỏe, giấc ngủ, bữa ăn hằng ngày. Khi cụ buồn hay cô đơn, hãy an ủi, chia sẻ bằng tấm lòng chân thành.
4. An toàn & Khẩn cấp:
   - Nếu cụ báo đau ngực, khó thở, té ngã, chóng mặt không đứng dậy được hoặc kêu cứu: LẬP TỨC gọi công cụ `trigger_sos_alert` để phát chuông và kết nối người thân.
   - Khi cụ nhắc tới thuốc men hoặc giờ uống thuốc: Gọi ngay công cụ `remind_medication` để ghi nhớ và nhắc nhở.
   - Khi cụ tâm sự chuyện vui buồn, chia sẻ nỗi niềm: Gọi công cụ `record_mood` để lưu lại nhật ký an sinh cho gia đình.
"""


class GeminiLiveClient:
    """
    Client for Google Gemini Multimodal Live API (BidiGenerateContent over WebSocket).
    Model: gemini-3.1-flash-live (or fallback gemini-2.0-flash-exp).
    Manages bi-directional audio/text streaming, tool calling, and barge-in handling.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = settings.GEMINI_LIVE_MODEL
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.is_connected = False
        self.is_mock_mode = not bool(self.api_key)
        self.system_instruction: Optional[str] = None
        self._on_message_callback: Optional[Callable[[Dict[str, Any]], None]] = None

    def set_message_callback(self, cb: Callable[[Dict[str, Any]], None]):
        self._on_message_callback = cb

    async def connect(self, system_instruction: Optional[str] = None):
        """Connects to Gemini Live API WebSocket endpoint or initiates mock mode."""
        if system_instruction:
            self.system_instruction = system_instruction

        if self.is_mock_mode:
            logger.info("Starting GeminiLiveClient in MOCK SIMULATION mode (no GEMINI_API_KEY provided).")
            self.is_connected = True
            return

        endpoint = (
            f"wss://generativelanguage.googleapis.com/ws/"
            f"google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={self.api_key}"
        )

        # Try primary model, then fallback
        models_to_try = [self.model, settings.GEMINI_LIVE_MODEL_FALLBACK]
        for i, model_name in enumerate(models_to_try):
            try:
                self.model = model_name
                self.ws = await websockets.connect(
                    endpoint,
                    ping_interval=20,
                    ping_timeout=20,
                    max_size=10 * 1024 * 1024
                )
                self.is_connected = True
                logger.info(f"Connected to Gemini Multimodal Live API with model: {self.model}")

                # Send Setup Handshake and wait for setupComplete
                await self._send_setup_handshake()

                # Wait for setupComplete confirmation (with timeout)
                try:
                    raw_resp = await asyncio.wait_for(self.ws.recv(), timeout=10)
                    resp = json.loads(raw_resp)
                    if "setupComplete" in resp:
                        logger.info(f"Gemini Live setup completed successfully with model: {self.model}")
                        self._setup_complete = True
                        return  # Success!
                    else:
                        logger.warning(f"Unexpected first message from Gemini (model {self.model}): {str(resp)[:200]}")
                        # Still might work, continue
                        return
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout waiting for setupComplete from model {self.model}")
                    if i < len(models_to_try) - 1:
                        await self.ws.close()
                        self.ws = None
                        continue  # Try fallback model
                    # Last model also timed out, proceed anyway
                    return

            except Exception as e:
                logger.warning(f"Failed to connect with model {model_name}: {e}")
                if self.ws:
                    try:
                        await self.ws.close()
                    except:
                        pass
                    self.ws = None
                if i < len(models_to_try) - 1:
                    logger.info(f"Trying fallback model: {models_to_try[i+1]}")
                    continue

        # All models failed, fall back to simulation
        logger.warning("All Gemini Live models failed. Falling back to simulation mode.")
        self.is_mock_mode = True
        self.is_connected = True

    async def _send_setup_handshake(self):
        """Sends the initial setup configuration including tools and system instructions."""
        setup_payload = {
            "setup": {
                "model": f"models/{self.model}",
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": settings.LIVE_VOICE_NAME
                            }
                        }
                    }
                },
                "systemInstruction": {
                    "parts": [{"text": self.system_instruction or SYSTEM_INSTRUCTION}]
                },
                "tools": [
                    {
                        "functionDeclarations": GEMINI_TOOL_DEFINITIONS
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(setup_payload))
        logger.info("Sent Gemini Live setup handshake.")

    async def send_audio_chunk(self, base64_pcm_16k: str):
        """Sends a 16kHz PCM audio chunk from client microphone to Gemini."""
        if not self.is_connected:
            return

        if self.is_mock_mode:
            # In mock mode, we simulate activity
            return

        payload = {
            "realtimeInput": {
                "mediaChunks": [
                    {
                        "mimeType": "audio/pcm;rate=16000",
                        "data": base64_pcm_16k
                    }
                ]
            }
        }
        try:
            await self.ws.send(json.dumps(payload))
        except Exception as e:
            logger.error(f"Error sending audio chunk to Gemini: {e}")

    async def send_text_turn(self, text: str):
        """Sends text input as a user turn."""
        if not self.is_connected:
            return

        if self.is_mock_mode:
            await self._simulate_mock_response(text)
            return

        payload = {
            "clientContent": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turnComplete": True
            }
        }
        try:
            await self.ws.send(json.dumps(payload))
        except Exception as e:
            logger.error(f"Error sending text turn: {e}")

    async def send_tool_response(self, call_id: str, tool_name: str, result: Dict[str, Any]):
        """Sends tool execution result back to Gemini Live API."""
        if self.is_mock_mode or not self.ws:
            return

        payload = {
            "toolResponse": {
                "functionResponses": [
                    {
                        "id": call_id,
                        "name": tool_name,
                        "response": {
                            "output": result
                        }
                    }
                ]
            }
        }
        try:
            await self.ws.send(json.dumps(payload))
            logger.info(f"Dispatched toolResponse for {tool_name} (id: {call_id})")
        except Exception as e:
            logger.error(f"Error sending tool response: {e}")

    async def listen_loop(self, on_audio_chunk: Callable[[str], None], on_transcript: Callable[[str, str], None], on_barge_in: Callable[[], None]):
        """
        Background receiver loop processing serverContent, audio chunks, toolCalls, and barge-in events.
        """
        if self.is_mock_mode:
            # Keep mock listener alive
            while self.is_connected:
                await asyncio.sleep(1)
            return

        try:
            async for raw_msg in self.ws:
                msg = json.loads(raw_msg)

                # 1. Setup complete
                if "setupComplete" in msg:
                    logger.info("Gemini Live session handshake completed successfully.")
                    continue

                # 2. Server content (Model audio & text)
                server_content = msg.get("serverContent")
                if server_content:
                    # Check for Barge-In interruption from Gemini
                    if server_content.get("interrupted"):
                        logger.info("Barge-in detected by Gemini Live API! User interrupted.")
                        on_barge_in()

                    model_turn = server_content.get("modelTurn")
                    if model_turn:
                        parts = model_turn.get("parts", [])
                        for part in parts:
                            # Audio chunk (PCM 24kHz)
                            inline_data = part.get("inlineData")
                            if inline_data and "audio" in inline_data.get("mimeType", ""):
                                pcm_base64 = inline_data.get("data")
                                if pcm_base64:
                                    on_audio_chunk(pcm_base64)

                            # Text transcript
                            text_part = part.get("text")
                            if text_part:
                                on_transcript("model", text_part)

                # 3. Tool Calls (Function Calling)
                tool_call = msg.get("toolCall")
                if tool_call:
                    function_calls = tool_call.get("functionCalls", [])
                    for call in function_calls:
                        call_id = call.get("id")
                        name = call.get("name")
                        args = call.get("args", {})
                        logger.info(f"Gemini Live requested tool call: {name} ({call_id})")

                        # Execute tool handler
                        result = await tool_registry.execute_tool(name, args)

                        # Relay back tool response
                        await self.send_tool_response(call_id, name, result)

        except websockets.ConnectionClosed as e:
            logger.info(f"Gemini Live WebSocket connection closed: {e}")
            if self._on_message_callback:
                self._on_message_callback({
                    "type": "transcript",
                    "role": "system",
                    "text": f"Kết nối tới AI bị gián đoạn. Vui lòng bấm nút Trò Chuyện để kết nối lại.",
                    "is_final": True
                })
        except Exception as e:
            logger.error(f"Error in Gemini Live listen loop: {e}")
            if self._on_message_callback:
                self._on_message_callback({
                    "type": "transcript",
                    "role": "system",
                    "text": f"Lỗi kết nối AI: {str(e)[:100]}. Vui lòng thử lại.",
                    "is_final": True
                })
        finally:
            self.is_connected = False

    async def _simulate_mock_response(self, text: str):
        """Simulates conversational AI response for testing when offline or missing key."""
        from app.services.tts_service import tts_service
        logger.info(f"Simulating response for: {text}")

        # Check for SOS keywords in simulation
        lower = text.lower()
        if any(k in lower for k in ["cứu", "ngã", "đau ngực", "khó thở", "sos"]):
            await tool_registry.execute_tool("trigger_sos_alert", {
                "severity": "CRITICAL",
                "reason": f"Phát hiện qua giọng nói: {text}",
                "location": "Phòng khách"
            })
            return

        if any(k in lower for k in ["thuốc", "uống thuốc", "huyết áp"]):
            await tool_registry.execute_tool("remind_medication", {
                "medicine_name": "Thuốc huyết áp",
                "time_str": "14:00 chiều",
                "dosage": "1 viên sau ăn"
            })
            reply = "Dạ con đã ghi nhớ lịch nhắc cụ uống thuốc rồi ạ. Cụ nhớ uống nhiều nước ấm nhé cụ!"
        else:
            reply = f"Dạ con nghe cụ nói rồi ạ. Con là An Nhiên, luôn sẵn sàng lắng nghe và đồng hành cùng cụ mỗi ngày ạ!"

        # Generate audio
        audio_b64 = await tts_service.synthesize_to_base64(reply)
        if self._on_message_callback:
            self._on_message_callback({
                "type": "audio_chunk",
                "data": audio_b64,
                "sample_rate": 24000
            })
            self._on_message_callback({
                "type": "transcript",
                "role": "model",
                "text": reply,
                "is_final": True
            })

    async def close(self):
        """Closes the WebSocket connection gracefully."""
        self.is_connected = False
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None
