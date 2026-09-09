import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.family_service import family_service


@pytest.fixture
def client():
    return TestClient(app)


def test_list_families_has_default(client):
    res = client.get("/api/v1/families")
    assert res.status_code == 200
    families = res.json()
    assert len(families) >= 1
    assert any(f["pairing_code"] == "ANN-8866" for f in families)


def test_get_family_details(client):
    res = client.get("/api/v1/families/fam_default")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "fam_default"
    assert data["elder"]["preferred_name"] == "Bác An"
    assert data["elder"]["honorific"] == "Bác"


def test_register_new_family(client):
    payload = {
        "family_name": "Gia Đình Bà Nguyễn Thị Năm",
        "admin_phone": "0988776655",
        "elder_full_name": "Nguyễn Thị Năm",
        "elder_preferred_name": "Bà Năm",
        "honorific": "Bà",
        "birth_year": 1945,
        "address": "Cần Thơ",
        "medical_notes": "Tiểu đường tuýp 2"
    }
    res = client.post("/api/v1/families/register", json=payload)
    assert res.status_code == 200
    fam = res.json()
    assert fam["family_name"] == "Gia Đình Bà Nguyễn Thị Năm"
    assert fam["pairing_code"].startswith("ANN-")
    assert fam["elder"]["preferred_name"] == "Bà Năm"
    assert fam["elder"]["honorific"] == "Bà"

    # Verify device pairing using the generated pairing code
    pair_res = client.post("/api/v1/families/pair", json={"pairing_code": fam["pairing_code"]})
    assert pair_res.status_code == 200
    assert pair_res.json()["id"] == fam["id"]


def test_update_elder_profile(client):
    update_data = {
        "medical_notes": "Đã khám lại, thêm đơn thuốc huyết áp mới",
        "primary_caregiver_phone": "0911223344"
    }
    res = client.put("/api/v1/families/fam_default/elder", json=update_data)
    assert res.status_code == 200
    data = res.json()
    assert data["medical_notes"] == "Đã khám lại, thêm đơn thuốc huyết áp mới"
    assert data["primary_caregiver_phone"] == "0911223344"


def test_login_family_by_code_and_phone(client):
    # Test by pairing code
    res1 = client.post("/api/v1/families/login", json={"identifier": "ANN-8866"})
    assert res1.status_code == 200
    assert res1.json()["id"] == "fam_default"

    # Test by admin phone
    res2 = client.post("/api/v1/families/login", json={"identifier": "0912345678"})
    assert res2.status_code == 200
    assert res2.json()["id"] == "fam_default"

    # Test invalid
    res3 = client.post("/api/v1/families/login", json={"identifier": "ANN-0000"})
    assert res3.status_code == 404


def test_login_with_username_and_password(client):
    # Default family credentials
    res = client.post("/api/v1/families/login", json={"username": "giadinh_bacan", "password": "123456"})
    assert res.status_code == 200
    assert res.json()["username"] == "giadinh_bacan"

    # Wrong password should fail
    res_wrong = client.post("/api/v1/families/login", json={"username": "giadinh_bacan", "password": "wrongpassword"})
    assert res_wrong.status_code == 404

    # Register new with custom username/password and login
    new_reg = client.post("/api/v1/families/register", json={
        "username": "con_gai_mai",
        "password": "mypassword123",
        "family_name": "Gia Đình Mẹ Mai",
        "elder_full_name": "Đặng Thị Mai",
        "elder_preferred_name": "Mẹ Mai",
        "ai_name": "Bé Út"
    })
    assert new_reg.status_code == 200
    assert new_reg.json()["username"] == "con_gai_mai"

    # Login with the new account
    login_new = client.post("/api/v1/families/login", json={
        "username": "con_gai_mai",
        "password": "mypassword123"
    })
    assert login_new.status_code == 200
    assert login_new.json()["elder"]["ai_name"] == "Bé Út"


