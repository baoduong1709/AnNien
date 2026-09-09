import pytest
from app.services.tts_service import tts_service
from app.services.rag_service import rag_service
from app.services.memory_service import memory_service
from app.models.schemas import MemoryItem


@pytest.mark.asyncio
async def test_tts_service_deterministic():
    text = "Bác sĩ dặn cụ uống 1 viên thuốc huyết áp sau bữa ăn sáng."
    audio_bytes = await tts_service.synthesize_speech(text)
    assert len(audio_bytes) > 44  # Valid WAV with header + PCM data
    assert audio_bytes[:4] == b'RIFF'
    assert audio_bytes[8:12] == b'WAVE'


@pytest.mark.asyncio
async def test_rag_service_store_and_search():
    item1 = MemoryItem(
        category="health",
        content="Cụ An hay bị đau mỏi khớp gối khi thời tiết trở lạnh.",
        importance=4
    )
    item2 = MemoryItem(
        category="hobby",
        content="Cụ thích nghe nhạc tiền chiến và ngâm thơ buổi sáng.",
        importance=3
    )

    await rag_service.store_memory(item1)
    await rag_service.store_memory(item2)

    # Search for health
    results_health = await rag_service.search_memories("đau khớp gối lạnh", top_k=2)
    assert len(results_health) >= 1
    assert any("khớp" in r.memory.content for r in results_health)


@pytest.mark.asyncio
async def test_memory_service_extraction():
    transcript = (
        "Cụ: Con ơi, sáng nay chân cụ nhức quá, chắc tại gió mùa đông bắc về. "
        "An Nhiên: Dạ con thương cụ, cụ nhớ xoa dầu gừng và giữ ấm bàn chân nhé ạ!"
    )
    result = await memory_service.extract_memories_and_wellness(transcript, elder_name="Cụ An")
    assert "memories" in result
    assert "wellness_summary" in result
    assert len(result["memories"]) >= 1
