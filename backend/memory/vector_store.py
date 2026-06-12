"""
Ecomind Vector Store — In-memory TF-IDF based semantic search.
Falls back gracefully when Pinecone is not configured.
"""

import logging
import math
from collections import Counter
from datetime import datetime
from typing import Optional

logger = logging.getLogger("ecomind.memory.vector")


class VectorStore:
    """In-memory vector store using TF-IDF similarity for semantic search."""

    def __init__(self):
        self._documents: dict[str, dict] = {}  # id -> {text, metadata, timestamp}
        logger.info("📐 Vector store initialized (in-memory TF-IDF mode)")

    def _tokenize(self, text: str) -> list[str]:
        """Simple tokenization."""
        return text.lower().split()

    def _tf(self, tokens: list[str]) -> dict[str, float]:
        """Term frequency."""
        counts = Counter(tokens)
        total = len(tokens)
        return {t: c / total for t, c in counts.items()} if total > 0 else {}

    def _idf(self, term: str) -> float:
        """Inverse document frequency."""
        doc_count = sum(
            1 for doc in self._documents.values()
            if term in doc["text"].lower()
        )
        total = len(self._documents)
        if doc_count == 0 or total == 0:
            return 0
        return math.log(total / doc_count)

    def _similarity(self, query_tokens: list[str], doc_text: str) -> float:
        """TF-IDF cosine similarity approximation."""
        doc_tokens = self._tokenize(doc_text)
        doc_tf = self._tf(doc_tokens)
        query_tf = self._tf(query_tokens)

        score = 0.0
        for term in query_tokens:
            idf = self._idf(term)
            score += query_tf.get(term, 0) * doc_tf.get(term, 0) * idf * idf
        return score

    def upsert(self, key: str, text: str, metadata: Optional[dict] = None):
        """Store a document."""
        self._documents[key] = {
            "text": text,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
        }
        logger.debug("📥 Stored document: %s", key)

    def query(self, query_text: str, top_k: int = 5) -> list[dict]:
        """Search for similar documents."""
        if not self._documents:
            return []

        query_tokens = self._tokenize(query_text)
        results = []

        for doc_id, doc in self._documents.items():
            score = self._similarity(query_tokens, doc["text"])
            if score > 0:
                results.append({
                    "id": doc_id,
                    "text": doc["text"],
                    "score": round(score, 4),
                    "metadata": doc["metadata"],
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def delete(self, key: str):
        """Delete a document."""
        self._documents.pop(key, None)

    def count(self) -> int:
        return len(self._documents)


vector_store = VectorStore()