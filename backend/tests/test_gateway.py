import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "models" in data
    assert data["models"]["live_speech"] == "gemini-3.1-flash-live"
    assert data["models"]["memory_analysis"] == "gemini-3.8-flash"
    assert data["models"]["rag_embeddings"] == "text-embedding-005"


def test_health_check_cloud_run(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "active_sessions" in data


def test_manual_sos_trigger(client):
    payload = {
        "severity": "CRITICAL",
        "reason": "Cụ bấm nút khẩn cấp trên màn hình",
        "location": "Phòng ngủ"
    }
    response = client.post("/api/v1/sos", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sos_triggered"
    assert "alert_id" in data
    assert len(data["emergency_contacts"]) >= 1


def test_medication_crud(client):
    med = {
        "medicine_name": "Thuốc Amlodipin 5mg",
        "time_str": "08:00 sáng",
        "dosage": "1 viên",
        "note": "Uống sau ăn sáng với nhiều nước ấm"
    }
    # Add medication
    res_add = client.post("/api/v1/medications", json=med)
    assert res_add.status_code == 200

    # Get medications
    res_list = client.get("/api/v1/medications")
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(m["medicine_name"] == "Thuốc Amlodipin 5mg" for m in items)


def test_mood_logging(client):
    mood = {
        "sentiment": "POSITIVE",
        "emotion": "Vui vẻ phấn khởi",
        "notes": "Cháu gái vừa sang thăm và biếu quà"
    }
    res_post = client.post("/api/v1/moods", json=mood)
    assert res_post.status_code == 200

    res_list = client.get("/api/v1/moods")
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(m["sentiment"] == "POSITIVE" for m in items)
