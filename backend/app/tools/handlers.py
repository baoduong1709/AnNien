import logging
from typing import Dict, Any, List, Optional, Callable
from app.config import settings
from app.models.schemas import MedicationReminder, SosAlertEvent, MoodRecord
from app.services.tts_service import tts_service

logger = logging.getLogger("annien.tools")


class ToolRegistry:
    """
    Central executor for deterministic tool calls triggered by Gemini Live.
    Dispatches to medications, emergency SOS, and emotional logs.
    """

    def __init__(self):
        self.medications: List[MedicationReminder] = []
        self.sos_events: List[SosAlertEvent] = []
        self.mood_records: List[MoodRecord] = []
        self._event_listeners: List[Callable[[Dict[str, Any]], None]] = []

    def register_listener(self, listener: Callable[[Dict[str, Any]], None]):
        self._event_listeners.append(listener)

    def unregister_listener(self, listener: Callable[[Dict[str, Any]], None]):
        if listener in self._event_listeners:
            self._event_listeners.remove(listener)

    def _notify(self, event_data: Dict[str, Any]):
        for listener in self._event_listeners:
            try:
                listener(event_data)
            except Exception as e:
                logger.error(f"Error notifying listener: {e}")

    async def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes named tool with provided arguments and returns standard output dict.
        """
        logger.info(f"Executing tool '{tool_name}' with args: {args}")

        if tool_name == "remind_medication":
            return await self._handle_remind_medication(args)
        elif tool_name == "trigger_sos_alert":
            return await self._handle_trigger_sos(args)
        elif tool_name == "record_mood":
            return await self._handle_record_mood(args)
        elif tool_name == "mark_medication_taken":
            return await self._handle_mark_medication_taken(args)
        elif tool_name == "enter_standby":
            return await self._handle_enter_standby(args)
        else:
            return {
                "status": "error",
                "message": f"Không tìm thấy công cụ '{tool_name}'."
            }

    def get_medications(self, family_id: Optional[str] = None) -> List[MedicationReminder]:
        if not family_id:
            return self.medications
        return [m for m in self.medications if m.family_id == family_id]

    def get_sos_events(self, family_id: Optional[str] = None) -> List[SosAlertEvent]:
        if not family_id:
            return self.sos_events
        return [s for s in self.sos_events if s.family_id == family_id]

    def get_mood_records(self, family_id: Optional[str] = None) -> List[MoodRecord]:
        if not family_id:
            return self.mood_records
        return [m for m in self.mood_records if m.family_id == family_id]

    async def _handle_remind_medication(self, args: Dict[str, Any]) -> Dict[str, Any]:
        family_id = args.get("family_id", "fam_default")
        medicine_name = args.get("medicine_name", "Thuốc")
        time_str = args.get("time_str", "Đúng giờ")
        dosage = args.get("dosage", "1 viên")
        note = args.get("note", "")

        reminder = MedicationReminder(
            family_id=family_id,
            medicine_name=medicine_name,
            time_str=time_str,
            dosage=dosage,
            note=note
        )
        self.medications.append(reminder)

        # Notify active clients
        self._notify({
            "type": "medication_reminder_created",
            "reminder": reminder.model_dump()
        })

        message = f"Con đã ghi nhớ lịch uống thuốc {medicine_name}, liều lượng {dosage} vào lúc {time_str}. Con sẽ nhắc cụ đúng giờ ạ!"
        return {
            "status": "success",
            "message": message,
            "reminder_id": reminder.id
        }

    async def _handle_trigger_sos(self, args: Dict[str, Any]) -> Dict[str, Any]:
        family_id = args.get("family_id", "fam_default")
        severity = args.get("severity", "CRITICAL")
        reason = args.get("reason", "Khẩn cấp")
        location = args.get("location", "Trong nhà")

        # 1. Deterministic Vietnamese emergency announcement via Google Cloud TTS
        alert_speech_text = (
            f"Thông báo khẩn cấp! Đã kích hoạt hệ thống cứu trợ cho cụ vì lý do {reason}. "
            f"Con cháu và số cấp cứu 115 đang được liên lạc ngay lập tức. "
            f"Cụ hãy ngồi yên một chỗ, thở đều và giữ bình tĩnh nhé cụ!"
        )
        tts_base64 = await tts_service.synthesize_to_base64(alert_speech_text)

        event = SosAlertEvent(
            family_id=family_id,
            severity=severity,
            reason=reason,
            location=location,
            tts_audio_base64=tts_base64,
            tts_text=alert_speech_text
        )
        self.sos_events.append(event)

        # Broadcast instant emergency signal to UI
        self._notify(event.model_dump())

        return {
            "status": "sos_triggered",
            "alert_id": event.alert_id,
            "severity": severity,
            "emergency_contacts": [
                {"name": "Cấp cứu Y tế", "phone": settings.EMERGENCY_CONTACT_PHONE},
                {"name": settings.PRIMARY_CAREGIVER_NAME, "phone": settings.PRIMARY_CAREGIVER_PHONE}
            ],
            "message": f"Đã kích hoạt còi báo động khẩn cấp và kết nối tới {settings.PRIMARY_CAREGIVER_NAME}."
        }

    async def _handle_record_mood(self, args: Dict[str, Any]) -> Dict[str, Any]:
        family_id = args.get("family_id", "fam_default")
        sentiment = args.get("sentiment", "NEUTRAL")
        emotion = args.get("emotion", "Bình thường")
        notes = args.get("notes", "")

        record = MoodRecord(
            family_id=family_id,
            sentiment=sentiment,
            emotion=emotion,
            notes=notes
        )
        self.mood_records.append(record)

        self._notify({
            "type": "mood_recorded",
            "record": record.model_dump()
        })

        return {
            "status": "success",
            "message": "Đã lưu lại tâm sự và cảm xúc của cụ vào sổ an sinh.",
            "record_id": record.id
        }

    async def _handle_mark_medication_taken(self, args: Dict[str, Any]) -> Dict[str, Any]:
        family_id = args.get("family_id", "fam_default")
        medicine_name = args.get("medicine_name", "").strip().lower()

        matched = None
        for m in self.medications:
            if m.family_id == family_id:
                if not medicine_name or medicine_name in m.medicine_name.lower():
                    m.is_taken = True
                    matched = m
                    break

        if matched:
            self._notify({
                "type": "medication_updated",
                "medication": matched.model_dump()
            })
            return {
                "status": "success",
                "message": f"Dạ, cháu đã ghi nhận cụ đã uống thuốc {matched.medicine_name} rồi ạ!",
                "medication_id": matched.id
            }
        return {
            "status": "not_found",
            "message": "Dạ, cháu đã ghi nhận cụ đã uống thuốc rồi ạ!"
        }

    async def _handle_enter_standby(self, args: Dict[str, Any]) -> Dict[str, Any]:
        reason = args.get("reason", "user_requested_sleep")
        self._notify({
            "type": "standby_mode",
            "reason": reason
        })
        return {
            "status": "standby",
            "message": "Dạ vâng, cháu xin phép tạm nghỉ. Khi nào cụ cần cứ gọi 'Cháu ơi' là cháu có mặt ngay ạ!"
        }


# Global tool registry
tool_registry = ToolRegistry()
