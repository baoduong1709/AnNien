import os
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, FileResponse
from typing import Optional, List, Dict, Any

from app.config import settings
from app.models.schemas import (
    MedicationReminder,
    SosAlertRequest,
    SosAlertEvent,
    MoodRecord,
    MemoryItem,
    MemoryExtractRequest,
    TTSRequest,
    FamilyAccount,
    ElderProfile,
    FamilyRegistrationRequest,
    FamilyPairRequest,
    FamilyLoginRequest,
)
from app.core.session import LiveSession, session_manager
from app.services.tts_service import tts_service
from app.services.rag_service import rag_service
from app.services.memory_service import memory_service
from app.services.family_service import family_service
from app.tools.handlers import tool_registry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("annien.gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Target Region: {settings.GCP_LOCATION} (Cloud Run ready)")
    logger.info(f"Live Model: {settings.GEMINI_LIVE_MODEL}")
    logger.info(f"Memory Model: {settings.GEMINI_FLASH_MODEL}")
    logger.info(f"Embedding Model: {settings.EMBEDDING_MODEL}")
    yield
    logger.info("Shutting down AnNien Gateway...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Trợ lý đàm thoại đồng hành thời gian thực cho người cao tuổi — Backend Proxy Gateway",
    lifespan=lifespan
)

# CORS configuration for Tauri v2 Desktop/Mobile and Web preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "region": settings.GCP_LOCATION,
        "models": {
            "live_speech": settings.GEMINI_LIVE_MODEL,
            "memory_analysis": settings.GEMINI_FLASH_MODEL,
            "rag_embeddings": settings.EMBEDDING_MODEL
        }
    }


@app.get("/health")
async def health_check():
    """Cloud Run liveness and readiness probe endpoint."""
    return {
        "status": "healthy",
        "active_sessions": session_manager.active_count,
        "environment": "cloud-run" if settings.GCP_PROJECT_ID else "local"
    }


# ==========================================
# Realtime WebSocket Proxy to Gemini Live API
# ==========================================

@app.websocket("/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    pairing_code: Optional[str] = Query(None),
    family_id: Optional[str] = Query(None)
):
    """
    Bi-directional audio/event stream between Client (Tauri/Web) and Gemini Live API.
    Audio in: PCM 16kHz mono (Client Mic)
    Audio out: PCM 24kHz mono (Gemini Voice)
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())

    family = None
    if pairing_code:
        family = family_service.get_family_by_code(pairing_code)
    elif family_id:
        family = family_service.get_family(family_id)
    if not family:
        family = family_service.get_family("fam_default")

    session = LiveSession(session_id, websocket, family=family)
    session_manager.add_session(session)

    try:
        await session.start()
        while True:
            data = await websocket.receive_text()
            await session.handle_client_message(data)
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"Error in websocket live stream {session_id}: {e}")
    finally:
        await session.close()
        session_manager.remove_session(session_id)


# ==========================================
# Family Accounts & Multi-Tenancy APIs
# ==========================================

@app.get("/api/v1/families", response_model=List[FamilyAccount])
async def list_families():
    """Lists registered family accounts."""
    return family_service.list_families()


@app.get("/api/v1/families/{family_id}", response_model=FamilyAccount)
async def get_family_details(family_id: str):
    """Retrieves specific family account and elder profile."""
    fam = family_service.get_family(family_id)
    if not fam:
        raise HTTPException(status_code=404, detail="Không tìm thấy gia đình này.")
    return fam


@app.post("/api/v1/families/register", response_model=FamilyAccount)
async def register_family(req: FamilyRegistrationRequest):
    """Registers a new family account with unique pairing code."""
    return family_service.create_family(req)


@app.post("/api/v1/families/pair", response_model=FamilyAccount)
async def pair_family_device(req: FamilyPairRequest):
    """Pairs an elder mobile device using family pairing code."""
    fam = family_service.get_family_by_code(req.pairing_code)
    if not fam:
        raise HTTPException(status_code=404, detail="Mã kết nối không hợp lệ hoặc đã hết hạn.")
    return fam


@app.post("/api/v1/families/login", response_model=FamilyAccount)
async def login_family(req: FamilyLoginRequest):
    """Logs in family using username and password (or pairing code / admin phone)."""
    fam = family_service.login_family(req)
    if not fam:
        raise HTTPException(status_code=404, detail="Tên đăng nhập hoặc mật khẩu không chính xác.")
    return fam



@app.put("/api/v1/families/{family_id}/elder", response_model=ElderProfile)
async def update_elder_profile(family_id: str, updates: Dict[str, Any]):
    """Updates the elder profile details (name, honorific, medical notes, phone)."""
    updated = family_service.update_elder_profile(family_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Gia đình hoặc hồ sơ cụ không tồn tại.")
    return updated


# ==========================================
# Healthcare, SOS & Wellness APIs
# ==========================================

@app.post("/api/v1/sos", response_model=Dict[str, Any])
async def trigger_manual_sos(req: SosAlertRequest):
    """Triggers one-tap emergency SOS alert from client UI."""
    return await tool_registry.execute_tool("trigger_sos_alert", req.model_dump())


@app.get("/api/v1/sos/logs", response_model=List[SosAlertEvent])
async def get_sos_logs(family_id: Optional[str] = Query(None)):
    """Retrieves all triggered SOS emergency events, filtered by family."""
    return tool_registry.get_sos_events(family_id)


@app.get("/api/v1/medications", response_model=List[MedicationReminder])
async def get_medications(family_id: Optional[str] = Query(None)):
    """Retrieves active medication reminders for the elder, filtered by family."""
    return tool_registry.get_medications(family_id)


@app.post("/api/v1/medications", response_model=Dict[str, Any])
async def add_medication(reminder: MedicationReminder):
    """Manually registers a medication schedule."""
    tool_registry.medications.append(reminder)
    return {"status": "success", "reminder": reminder}


@app.get("/api/v1/moods", response_model=List[MoodRecord])
async def get_moods(family_id: Optional[str] = Query(None)):
    """Retrieves emotional wellness logs, filtered by family."""
    return tool_registry.get_mood_records(family_id)


@app.post("/api/v1/moods", response_model=Dict[str, Any])
async def log_mood(record: MoodRecord):
    """Manually logs a mood or emotional observation."""
    tool_registry.mood_records.append(record)
    return {"status": "success", "record": record}


# ==========================================
# Google Ecosystem: Cloud TTS, Gemini 3.8 Flash Memory, text-embedding-005 RAG
# ==========================================

@app.post("/api/v1/tts/synthesize")
async def synthesize_speech(req: TTSRequest):
    """
    Generates deterministic Vietnamese audio via Google Cloud Text-to-Speech
    for medical accuracy without hallucination.
    """
    audio_bytes = await tts_service.synthesize_speech(
        text=req.text,
        speaking_rate=req.speaking_rate,
        voice_name=req.voice_name
    )
    return Response(content=audio_bytes, media_type="audio/wav")


@app.post("/api/v1/memories/extract")
async def extract_memories(req: MemoryExtractRequest):
    """
    Analyzes conversation transcripts with Gemini 3.8 Flash to extract
    durable memories, family facts, and wellness summary.
    """
    return await memory_service.extract_memories_and_wellness(
        transcript=req.conversation_transcript,
        elder_name=req.elder_name or "Cụ"
    )


@app.get("/api/v1/memories")
async def search_memories(
    q: Optional[str] = Query(None, description="Search query for semantic recall"),
    family_id: Optional[str] = Query(None, description="Filter by family ID")
):
    """
    Retrieves stored memories or performs semantic vector search using text-embedding-005.
    """
    if q:
        results = await rag_service.search_memories(query=q, family_id=family_id)
        return {"query": q, "results": [r.model_dump() for r in results]}
    return {"memories": [m.model_dump() for m in rag_service.get_all_memories(family_id=family_id)]}


@app.post("/api/v1/memories", response_model=Dict[str, Any])
async def create_memory(memory: MemoryItem):
    """Caregivers manually upload family stories, photos, and background facts."""
    mem_id = await rag_service.store_memory(memory)
    return {"status": "success", "memory_id": mem_id, "memory": memory.model_dump()}


@app.delete("/api/v1/medications/{med_id}", response_model=Dict[str, Any])
async def delete_medication(med_id: str):
    """Deletes or cancels a medication reminder."""
    tool_registry.medications = [m for m in tool_registry.medications if m.id != med_id]
    return {"status": "success", "deleted_id": med_id}


@app.get("/api/v1/download/apk")
async def download_elder_apk():
    """Provides the Android APK file for download to install on the elder's phone."""
    apk_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../AnNien-TroLyNguoiCaoTuoi.apk")
    )
    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="File APK chưa sẵn sàng.")
    return FileResponse(
        path=apk_path,
        filename="AnNien-TroLyNguoiCaoTuoi.apk",
        media_type="application/vnd.android.package-archive"
    )


