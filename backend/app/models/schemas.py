from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import uuid


class AudioChunkMessage(BaseModel):
    """Base64 PCM audio chunk from client or server"""
    type: Literal["audio_chunk"] = "audio_chunk"
    data: str = Field(..., description="Base64 encoded PCM audio bytes")
    sample_rate: int = Field(16000, description="Sample rate in Hz")


class TextMessage(BaseModel):
    """User text message or prompt input"""
    type: Literal["text_message"] = "text_message"
    text: str = Field(..., description="Content of the message")


class BargeInEvent(BaseModel):
    """Barge-in interruption notification when elder starts speaking"""
    type: Literal["barge_in"] = "barge_in"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    reason: str = Field("user_speech_detected", description="Interruption reason")


class TranscriptEvent(BaseModel):
    """Live speech-to-text or model transcript"""
    type: Literal["transcript"] = "transcript"
    role: Literal["user", "model", "system"]
    text: str
    is_final: bool = False


class ToolInvocationEvent(BaseModel):
    """Notification when Gemini invokes a deterministic tool"""
    type: Literal["tool_invocation"] = "tool_invocation"
    tool_name: str
    arguments: Dict[str, Any]
    status: Literal["calling", "completed", "failed"]
    result: Optional[Dict[str, Any]] = None


# --- Medical & Care Schemas ---

class MedicationReminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_id: str = Field("fam_default", description="ID gia đình sở hữu")
    medicine_name: str = Field(..., description="Tên loại thuốc")
    time_str: str = Field(..., description="Thời gian uống thuốc (ví dụ: '08:00', 'sau ăn trưa')")
    dosage: str = Field("1 viên", description="Liều lượng")
    note: Optional[str] = Field(None, description="Lưu ý (ví dụ: uống với nước ấm, uống sau ăn 30 phút)")
    is_taken: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SosAlertRequest(BaseModel):
    family_id: str = Field("fam_default", description="ID gia đình sở hữu")
    severity: Literal["CRITICAL", "HIGH", "MEDIUM"] = Field("CRITICAL", description="Mức độ nghiêm trọng")
    reason: str = Field(..., description="Lý do kích hoạt khẩn cấp")
    location: Optional[str] = Field("Trong nhà", description="Vị trí của cụ trong nhà")
    emergency_contact: Optional[str] = None


class SosAlertEvent(BaseModel):
    type: Literal["sos_alert"] = "sos_alert"
    alert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_id: str = Field("fam_default", description="ID gia đình sở hữu")
    severity: str
    reason: str
    location: Optional[str]
    tts_audio_base64: Optional[str] = Field(None, description="Deterministic TTS audio announcement in base64")
    tts_text: str = Field(..., description="Lời dặn hoặc thông báo phát thanh khẩn cấp")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class MoodRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_id: str = Field("fam_default", description="ID gia đình sở hữu")
    sentiment: Literal["POSITIVE", "NEUTRAL", "NEGATIVE", "ANXIOUS", "TIRED"]
    emotion: str = Field(..., description="Cảm xúc cụ thể: vui vẻ, buồn bã, lo âu, nhớ cháu, mệt...")
    notes: str = Field(..., description="Tóm tắt lời tâm sự hoặc ghi nhận")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# --- Memory & RAG Schemas ---

class MemoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_id: str = Field("fam_default", description="ID gia đình sở hữu")
    category: Literal["family", "health", "hobby", "habit", "past_story", "preference"] = "health"
    content: str = Field(..., description="Nội dung ký ức/thông tin cốt lõi trích xuất được")
    importance: int = Field(3, ge=1, le=5, description="Độ quan trọng 1-5")
    extracted_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    embedding: Optional[List[float]] = None


# --- Family Account & Multi-Tenancy Schemas ---

class ElderProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_id: str
    full_name: str = Field(..., description="Họ và tên đầy đủ của cụ")
    preferred_name: str = Field(..., description="Tên thân mật thường gọi, ví dụ: 'Bà Năm', 'Bác An'")
    honorific: str = Field("Bác", description="Danh xưng khi AI trò chuyện: 'Bác', 'Bà', 'Ông', 'Cụ'")
    birth_year: int = Field(1948, description="Năm sinh của cụ")
    address: Optional[str] = Field("Bến Tre", description="Quê quán hoặc địa chỉ nơi cụ đang ở")
    primary_caregiver_phone: str = Field("0900000000", description="Số điện thoại người thân bảo hộ chính")
    medical_notes: Optional[str] = Field(None, description="Lưu ý bệnh lý (huyết áp, tim mạch, tiểu đường)")
    ai_name: str = Field("An Nhiên", description="Tên con cháu đặt cho AI (ví dụ: An Nhiên, Cháu Út, Bé Bảy)")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class FamilyAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field("giadinh_bacan", description="Tên đăng nhập tài khoản")
    password: str = Field("123456", description="Mật khẩu tài khoản")
    family_name: str = Field(..., description="Tên gia đình, ví dụ: 'Gia đình Cụ Nguyễn Văn An'")
    admin_phone: str = Field(..., description="Số điện thoại quản trị viên gia đình")
    pairing_code: str = Field(..., description="Mã kết nối với máy cụ, ví dụ: 'ANN-8866'")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    elder: Optional[ElderProfile] = None


class FamilyRegistrationRequest(BaseModel):
    username: Optional[str] = Field(None, description="Tên đăng nhập tài khoản")
    password: Optional[str] = Field("123456", description="Mật khẩu tài khoản")
    family_name: Optional[str] = None
    admin_phone: Optional[str] = "0900000000"
    elder_full_name: str
    elder_preferred_name: str
    honorific: str = "Bác"
    birth_year: int = 1948
    address: Optional[str] = None
    medical_notes: Optional[str] = None
    ai_name: Optional[str] = "An Nhiên"


class FamilyPairRequest(BaseModel):
    pairing_code: str


class FamilyLoginRequest(BaseModel):
    username: Optional[str] = Field(None, description="Tên đăng nhập")
    password: Optional[str] = Field(None, description="Mật khẩu")
    identifier: Optional[str] = Field(None, description="Fallback: Mã kết nối hoặc SĐT")




class MemoryExtractRequest(BaseModel):
    conversation_transcript: str = Field(..., description="Nội dung hội thoại cần phân tích trích xuất ký ức")
    elder_name: Optional[str] = "Cụ An"


class MemorySearchResult(BaseModel):
    memory: MemoryItem
    similarity: float


class TTSRequest(BaseModel):
    text: str = Field(..., description="Văn bản tiếng Việt cần đọc chính xác")
    voice_name: Optional[str] = None
    speaking_rate: float = Field(0.9, description="Tốc độ đọc chậm rãi, phù hợp với người già (0.8 - 1.0)")
