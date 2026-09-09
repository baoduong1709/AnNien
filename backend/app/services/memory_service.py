import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.config import settings
from app.models.schemas import MemoryItem
from app.services.rag_service import rag_service

logger = logging.getLogger("annien.memory")


class MemoryService:
    """
    Background Diary & Memory Extraction Service using Google Gemini 3.8 Flash.
    Extracts enduring facts, emotional trends, and health signals from elder dialogues.
    """

    def __init__(self):
        self.genai_client = None
        self._init_client()

    def _init_client(self):
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("GenAI client initialized for Gemini 3.8 Flash memory extraction.")
            except Exception as e:
                logger.warning(f"Failed to init GenAI client for memory service: {e}")

    async def extract_memories_and_wellness(self, transcript: str, elder_name: str = "Cụ") -> Dict[str, Any]:
        """
        Analyzes conversation transcript to extract memories, family info, and wellness diary.
        """
        if not transcript or not transcript.strip():
            return {"memories": [], "wellness_summary": "Không có dữ liệu hội thoại để phân tích."}

        if self.genai_client:
            try:
                prompt = f"""
Bạn là chuyên gia phân tích tâm lý & an sinh người cao tuổi của dự án An Nhiên.
Hãy đọc kỹ đoạn hội thoại sau giữa {elder_name} và trợ lý An Nhiên.
Trích xuất:
1. Danh sách các ký ức/thông tin lâu dài cần ghi nhớ (family, health, hobby, habit, past_story, preference).
2. Báo cáo nhật ký an sinh trong ngày (tâm trạng chung, dấu hiệu sức khỏe, điều cần người thân lưu ý).

Trả về định dạng JSON duy nhất với cấu trúc:
{{
  "memories": [
    {{
      "category": "family|health|hobby|habit|past_story|preference",
      "content": "Nội dung ký ức súc tích",
      "importance": 1-5
    }}
  ],
  "wellness_summary": {{
    "overall_mood": "Tích cực / Bình thường / Buồn rầu / Lo âu / Mệt mỏi",
    "health_signals": ["Đau nhức chân", "Ngủ ngon..."],
    "caregiver_notes": "Lời khuyên cho con cháu chăm sóc cụ hôm nay"
  }}
}}

Đoạn hội thoại:
\"\"\"{transcript}\"\"\"
"""
                response = self.genai_client.models.generate_content(
                    model=settings.GEMINI_FLASH_MODEL,
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )

                result_text = response.text.strip()
                parsed = json.loads(result_text)

                # Persist extracted memories into RAG service
                saved_memories = []
                for m_data in parsed.get("memories", []):
                    item = MemoryItem(
                        category=m_data.get("category", "health"),
                        content=m_data.get("content", ""),
                        importance=m_data.get("importance", 3)
                    )
                    await rag_service.store_memory(item)
                    saved_memories.append(item)

                return {
                    "memories": [m.model_dump() for m in saved_memories],
                    "wellness_summary": parsed.get("wellness_summary", {}),
                    "extracted_at": datetime.utcnow().isoformat()
                }

            except Exception as e:
                logger.error(f"Error extracting memory with Gemini 3.8 Flash: {e}")

        # Fallback heuristic extractor
        return await self._fallback_extract(transcript, elder_name)

    async def _fallback_extract(self, transcript: str, elder_name: str) -> Dict[str, Any]:
        """
        Rule-based heuristic extractor for offline/testing scenarios.
        """
        lower = transcript.lower()
        memories = []

        if any(w in lower for w in ["đau", "nhức", "mỏi", "uống thuốc", "huyết áp", "khó ngủ"]):
            mem = MemoryItem(
                category="health",
                content=f"{elder_name} có dấu hiệu sức khỏe cần theo dõi: {transcript[:100]}...",
                importance=4
            )
            await rag_service.store_memory(mem)
            memories.append(mem)

        if any(w in lower for w in ["cháu", "con", "bác", "cô", "chú", "ông xã", "bà xã"]):
            mem = MemoryItem(
                category="family",
                content=f"Thông tin gia đình của {elder_name}: {transcript[:100]}...",
                importance=3
            )
            await rag_service.store_memory(mem)
            memories.append(mem)

        return {
            "memories": [m.model_dump() for m in memories],
            "wellness_summary": {
                "overall_mood": "Bình ổn",
                "health_signals": ["Cần theo dõi thêm trong ngày"],
                "caregiver_notes": "Cụ trò chuyện ấm áp, nhắc nhở cụ uống nước và nghỉ ngơi đều đặn."
            },
            "extracted_at": datetime.utcnow().isoformat()
        }


# Global singleton instance
memory_service = MemoryService()
