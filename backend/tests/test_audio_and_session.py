import pytest
import struct
from fastapi.testclient import TestClient
from app.main import app
from app.core.audio_relay import AudioRelay


def test_audio_relay_calculations():
    # Create 1600 samples of silence (16-bit)
    silence = bytearray(1600 * 2)
    rms_silence = AudioRelay.calculate_rms(silence)
    assert rms_silence == 0.0
    assert not AudioRelay.is_speech_active(silence)

    # Create 1600 samples of loud tone (amplitude 20000)
    loud = bytearray()
    for _ in range(1600):
        loud.extend(struct.pack("<h", 20000))
    rms_loud = AudioRelay.calculate_rms(loud)
    assert rms_loud > 0.5
    assert AudioRelay.is_speech_active(loud)


def test_audio_relay_wav_wrapping():
    pcm = b"\x00\x00" * 480 # 480 samples
    wav = AudioRelay.pcm_to_wav(pcm, sample_rate=24000, channels=1)
    assert wav[:4] == b"RIFF"
    assert wav[8:12] == b"WAVE"
    assert len(wav) == 44 + len(pcm)


def test_audio_relay_wav_stripping():
    original_pcm = b"\x12\x34" * 240
    wav = AudioRelay.pcm_to_wav(original_pcm, sample_rate=24000, channels=1)
    extracted = AudioRelay.strip_wav_header(wav)
    assert extracted == original_pcm

    # Non-wav input should be returned unchanged
    raw = b"\x99\x88\x77"
    assert AudioRelay.strip_wav_header(raw) == raw


def test_websocket_live_endpoint_lifecycle():
    client = TestClient(app)
    with client.websocket_connect("/ws/live") as websocket:
        # First message from server should be session_started
        greeting = websocket.receive_json()
        assert greeting["type"] == "session_started"
        assert greeting["sample_rate_in"] == 16000
        assert greeting["sample_rate_out"] == 24000

        # Send ping
        websocket.send_json({"type": "ping"})
        pong = websocket.receive_json()
        assert pong["type"] == "pong"

        # Send audio chunk
        sample_audio = AudioRelay.encode_pcm_base64(b"\x00\x00" * 320)
        websocket.send_json({
            "type": "audio_chunk",
            "data": sample_audio,
            "sample_rate": 16000
        })

        # Send manual interrupt / barge-in
        websocket.send_json({"type": "interrupt"})
        interrupt_reply = websocket.receive_json()
        assert interrupt_reply["type"] == "barge_in"


def test_websocket_trigger_sos():
    client = TestClient(app)
    with client.websocket_connect("/ws/live") as websocket:
        greeting = websocket.receive_json()
        assert greeting["type"] == "session_started"

        # Trigger SOS over WebSocket
        websocket.send_json({
            "type": "trigger_sos",
            "reason": "Cụ bị trượt chân ở phòng tắm",
            "severity": "CRITICAL",
            "location": "Phòng tắm"
        })

        # Expect sos_alert event
        event = websocket.receive_json()
        assert event["type"] == "sos_alert"
        assert event["severity"] == "CRITICAL"
        assert "phòng tắm" in event["reason"]
        assert event["tts_audio_base64"] is not None

        # Expect spoken audio_chunk for the emergency warning
        audio_chunk = websocket.receive_json()
        assert audio_chunk["type"] == "audio_chunk"
        assert audio_chunk["sample_rate"] == 24000
        assert len(audio_chunk["data"]) > 0

