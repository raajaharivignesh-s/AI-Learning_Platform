import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from uuid import UUID
from app.services.embedding_service import generate_embeddings
from app.services.qdrant_service import qdrant_service
from app.services.llm_provider import get_llm_provider
from app.models.resource_chunk import ResourceChunk
import logging

logger = logging.getLogger(__name__)

RELEVANCE_THRESHOLD = 0.25

class RAGService:
    def __init__(self, llm_provider=None):
        self.llm_provider = llm_provider
        
    def get_provider(self):
        if self.llm_provider:
            return self.llm_provider
        return get_llm_provider()
        
    def get_answer(self, db: Session, course_id: UUID, owner_id: UUID, question: str, limit: int = 5, source_only: bool = True) -> Dict[str, Any]:
        if not question or len(question.strip()) == 0:
            raise ValueError("Question cannot be empty.")
            
        if len(question) > 2000:
            raise ValueError("Question is too long.")
            
        query_embeddings = generate_embeddings([question])
        if not query_embeddings:
            raise ValueError("Failed to generate embedding for the question.")
        query_embedding = query_embeddings[0]
        
        qdrant_results = qdrant_service.search_chunks(
            course_id=str(course_id),
            owner_id=str(owner_id),
            query_embedding=query_embedding,
            limit=limit * 2
        )
        
        if not qdrant_results:
            return {
                "answer": "I don't have enough information in your course materials to answer this." if source_only else None,
                "citations": [],
                "insufficient_evidence": True
            }
            
        relevant_hits = [r for r in qdrant_results if r["score"] >= RELEVANCE_THRESHOLD][:limit]
        
        if not relevant_hits and source_only:
            return {
                "answer": "I don't have enough information in your course materials to answer this.",
                "citations": [],
                "insufficient_evidence": True
            }
            
        chunk_ids = [hit["chunk_id"] for hit in relevant_hits]
        db_chunks = db.query(ResourceChunk).filter(ResourceChunk.id.in_(chunk_ids)).all()
        db_chunks_map = {str(chunk.id): chunk for chunk in db_chunks}
        
        valid_chunks = []
        for hit in relevant_hits:
            db_chunk = db_chunks_map.get(str(hit["chunk_id"]))
            if db_chunk:
                valid_chunks.append({
                    "hit": hit,
                    "db_chunk": db_chunk
                })
                
        if not valid_chunks and source_only:
            return {
                "answer": "I don't have enough information in your course materials to answer this.",
                "citations": [],
                "insufficient_evidence": True
            }
            
        context_parts = []
        for vc in valid_chunks:
            chunk_id = vc["hit"]["chunk_id"]
            text = vc["db_chunk"].text
            resource_id = vc["hit"]["resource_id"]
            page = vc["hit"]["payload"].get("start_page")
            st = vc["hit"]["payload"].get("start_time")
            loc_str = f"Page: {page}" if page is not None else f"Time: {st}s"
            context_parts.append(f"[Chunk {chunk_id}]\nSource Resource: {resource_id}, {loc_str}\nText:\n{text}\n")
            
        context = "\n---\n".join(context_parts)
        
        try:
            raw_answer = self.get_provider().generate_answer(question, context, source_only)
        except ValueError as e:
            if "LLM Provider is not configured" in str(e):
                raw_answer = "LLM Provider is not configured. Here are the retrieved chunks: " + ", ".join([str(vc['hit']['chunk_id']) for vc in valid_chunks])
            else:
                raise
        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            raise ValueError(f"Generation failed: {str(e)}")
            
        if "INSUFFICIENT_EVIDENCE" in raw_answer.upper():
            return {
                "answer": "I don't have enough information in your course materials to answer this.",
                "citations": [],
                "insufficient_evidence": True
            }
            
        citation_pattern = r'\[Citation:\s*([^\]]+)\]'
        cited_ids_raw = re.findall(citation_pattern, raw_answer)
        cited_ids = []
        for c in cited_ids_raw:
            for part in c.split(','):
                cited_ids.append(part.strip())
                
        valid_chunk_ids = {str(vc["hit"]["chunk_id"]) for vc in valid_chunks}
        
        final_citations = []
        seen = set()
        for cid in cited_ids:
            if cid in valid_chunk_ids and cid not in seen:
                seen.add(cid)
                for vc in valid_chunks:
                    if str(vc["hit"]["chunk_id"]) == cid:
                        final_citations.append({
                            "chunk_id": cid,
                            "resource_id": vc["hit"]["resource_id"],
                            "start_page": vc["hit"]["payload"].get("start_page"),
                            "end_page": vc["hit"]["payload"].get("end_page"),
                            "start_time": vc["hit"]["payload"].get("start_time"),
                            "end_time": vc["hit"]["payload"].get("end_time"),
                            "score": vc["hit"]["score"]
                        })
                        break
                        
        return {
            "answer": raw_answer,
            "citations": final_citations,
            "insufficient_evidence": False
        }

rag_service = RAGService()
