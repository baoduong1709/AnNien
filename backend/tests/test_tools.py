import pytest
from app.tools.handlers import tool_registry
from app.tools.definitions import GEMINI_TOOL_DEFINITIONS


def test_tool_definitions_validity():
    assert len(GEMINI_TOOL_DEFINITIONS) == 3
    names = [t["name"] for t in GEMINI_TOOL_DEFINITIONS]
    assert "remind_medication" in names
    assert "trigger_sos_alert" in names
    assert "record_mood" in names


@pytest.mark.asyncio
async def test_remind_medication_tool():
    result = await tool_registry.execute_tool("remind_medication", {
        "medicine_name": "Panadol Extra",
        "time_str": "12:30 trưa",
        "dosage": "1 viên",
        "note": "Sau khi ăn cơm"
    })
    assert result["status"] == "success"
    assert "Panadol Extra" in result["message"]
    assert "reminder_id" in result


@pytest.mark.asyncio
async def test_trigger_sos_alert_tool():
    events_received = []

    def on_event(ev):
        events_received.append(ev)

    tool_registry.register_listener(on_event)

    result = await tool_registry.execute_tool("trigger_sos_alert", {
        "severity": "CRITICAL",
        "reason": "Cụ báo bị ngã ở nhà tắm",
        "location": "Nhà tắm tầng 1"
    })

    tool_registry.unregister_listener(on_event)

    assert result["status"] == "sos_triggered"
    assert "alert_id" in result
    assert len(events_received) == 1
    assert events_received[0]["severity"] == "CRITICAL"
    assert events_received[0]["tts_audio_base64"] is not None


@pytest.mark.asyncio
async def test_record_mood_tool():
    result = await tool_registry.execute_tool("record_mood", {
        "sentiment": "ANXIOUS",
        "emotion": "Lo lắng về thời tiết trở lạnh",
        "notes": "Cụ sợ bị đau khớp đầu gối"
    })
    assert result["status"] == "success"
    assert "record_id" in result
