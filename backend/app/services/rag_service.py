import logging
import math
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.schemas import MemoryItem, MemorySearchResult

logger = logging.getLogger("annien.rag")


class RAGService:
    """
    Semantic Memory RAG Service using Google `text-embedding-005` and Cloud Firestore Vector Search.
    Provides semantic recall of elderly personal stories, health conditions, and preferences.
    """

    def __init__(self):
        self.firestore_db = None
        self.genai_client = None
        self._local_memories: List[MemoryItem] = []
        self._init_clients()

    def _init_clients(self):
        # 1. Initialize Gemini Client for text-embedding-005
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("GenAI client initialized for embeddings.")
            except Exception as e:
                logger.warning(f"Could not init GenAI client: {e}")

        # 2. Initialize Firestore
        try:
            from google.cloud import firestore
            self.firestore_db = firestore.Client(
                project=settings.GCP_PROJECT_ID,
                database=settings.FIRESTORE_DATABASE
            )
            logger.info("Firestore client initialized.")
        except Exception as e:
            logger.info(f"Firestore not available in this environment ({e}). Using local in-memory vector store.")
            self.firestore_db = None

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates 768-dimensional vector embedding using Google text-embedding-005.
        """
        if self.genai_client:
            try:
                # Use GenAI SDK models.embed_content
                response = self.genai_client.models.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    contents=text,
                )
                if hasattr(response, 'embeddings') and response.embeddings:
                    return response.embeddings[0].values
                elif hasattr(response, 'embedding') and response.embedding:
                    return response.embedding.values
            except Exception as e:
                logger.warning(f"Failed to generate embedding with Google API ({e}). Falling back to deterministic pseudo-embedding.")

        return self._generate_deterministic_embedding(text)

    def _generate_deterministic_embedding(self, text: str, dimension: int = 768) -> List[float]:
        """
        Generates a normalized pseudo-embedding based on word hashes for local testing and offline modes.
        """
        import hashlib
        vec = [0.0] * dimension
        words = text.lower().split()
        if not words:
            return vec

        for word in words:
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx = h % dimension
            vec[idx] += 1.0

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    async def store_memory(self, memory: MemoryItem) -> str:
        """
        Computes embedding for memory and persists to Firestore and local cache.
        """
        if not memory.embedding:
            memory.embedding = await self.get_embedding(memory.content)

        # Store to local cache
        self._local_memories.append(memory)

        # Persist to Firestore if connected
        if self.firestore_db:
            try:
                from google.cloud.firestore_v1.vector import Vector
                doc_ref = self.firestore_db.collection(settings.COLLECTION_MEMORIES).document(memory.id)
                data = memory.model_dump()
                data["embedding"] = Vector(memory.embedding)
                doc_ref.set(data)
                logger.info(f"Stored memory {memory.id} to Firestore.")
            except Exception as e:
                logger.warning(f"Failed to persist to Firestore: {e}. Saved in memory.")

        return memory.id

    async def search_memories(self, query: str, top_k: int = 3, threshold: float = 0.4, family_id: Optional[str] = None) -> List[MemorySearchResult]:
        """
        Finds the most relevant memories for the current dialogue context, filtered by family.
        """
        query_vec = await self.get_embedding(query)

        # If Firestore is active and has vector search support
        if self.firestore_db:
            try:
                from google.cloud.firestore_v1.vector import Vector
                from google.cloud.firestore_v1.base_vector_query import DistanceMeasure

                collection = self.firestore_db.collection(settings.COLLECTION_MEMORIES)
                vector_query = collection.find_nearest(
                    vector_field="embedding",
                    query_vector=Vector(query_vec),
                    distance_measure=DistanceMeasure.COSINE,
                    limit=top_k
                )
                docs = vector_query.get()
                results = []
                for doc in docs:
                    d = doc.to_dict()
                    emb = d.pop("embedding", None)
                    item = MemoryItem(**d)
                    if not family_id or item.family_id == family_id:
                        results.append(MemorySearchResult(memory=item, similarity=0.95))
                if results:
                    return results
            except Exception as e:
                logger.debug(f"Firestore vector search not supported or index building: {e}. Falling back to cosine calc.")

        # Local cosine similarity search
        scored: List[MemorySearchResult] = []
        for mem in self._local_memories:
            if family_id and mem.family_id != family_id:
                continue
            if mem.embedding:
                sim = self._cosine_similarity(query_vec, mem.embedding)
                if sim >= threshold:
                    scored.append(MemorySearchResult(memory=mem, similarity=round(sim, 4)))

        scored.sort(key=lambda x: x.similarity, reverse=True)
        return scored[:top_k]

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def get_all_memories(self, family_id: Optional[str] = None) -> List[MemoryItem]:
        if not family_id:
            return list(self._local_memories)
        return [m for m in self._local_memories if m.family_id == family_id]


# Global singleton instance
rag_service = RAGService()
