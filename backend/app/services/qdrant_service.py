import uuid
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings

logger = logging.getLogger(__name__)

class QdrantService:
    def __init__(self, host=None, port=None):
        self.client = None
        _host = host or settings.QDRANT_HOST
        _port = port or settings.QDRANT_PORT
        try:
            self.client = QdrantClient(host=_host, port=_port, timeout=5.0)
            self._ensure_collection()
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {str(e)}")
            self.client = None
            
    def _ensure_collection(self):
        if not self.client:
            return
            
        collection_name = settings.QDRANT_COLLECTION_NAME
        try:
            collections_response = self.client.get_collections()
            collection_names = [c.name for c in collections_response.collections]
            
            if collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=models.Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {collection_name}")
        except Exception as e:
            logger.error(f"Failed to ensure Qdrant collection: {str(e)}")
            self.client = None 

    def upsert_chunks(self, chunks: List[Any]):
        if not self.client or not chunks:
            return False
            
        points = []
        for chunk in chunks:
            point_id = str(uuid.uuid5(uuid.UUID(str(chunk.resource_id)), str(chunk.chunk_index)))
            
            payload = {
                "chunk_id": str(chunk.id),
                "resource_id": str(chunk.resource_id),
                "course_id": str(chunk.course_id),
                "owner_id": str(chunk.owner_id),
                "chunk_index": chunk.chunk_index,
                "start_page": chunk.start_page,
                "end_page": chunk.end_page,
                "start_time": getattr(chunk, 'start_time', None),
                "end_time": getattr(chunk, 'end_time', None),
                "embedding_model": chunk.model_identifier
            }
            
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=chunk.embedding,
                    payload=payload
                )
            )
            
        try:
            self.client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=points
            )
            return True
        except Exception as e:
            logger.error(f"Failed to upsert chunks to Qdrant: {str(e)}")
            return False

    def delete_resource_chunks(self, resource_id: str):
        if not self.client:
            return False
            
        try:
            self.client.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="resource_id",
                                match=models.MatchValue(value=str(resource_id))
                            )
                        ]
                    )
                )
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete chunks from Qdrant: {str(e)}")
            return False

    def search_chunks(self, course_id: str, owner_id: str, query_embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        if not self.client:
            return []
            
        try:
            search_result = self.client.search(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                query_vector=query_embedding,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="course_id",
                            match=models.MatchValue(value=str(course_id))
                        ),
                        models.FieldCondition(
                            key="owner_id",
                            match=models.MatchValue(value=str(owner_id))
                        )
                    ]
                ),
                limit=limit
            )
            
            results = []
            for hit in search_result:
                results.append({
                    "chunk_id": hit.payload["chunk_id"],
                    "resource_id": hit.payload["resource_id"],
                    "score": hit.score,
                    "payload": hit.payload
                })
                
            return results
        except Exception as e:
            logger.error(f"Failed to search Qdrant: {str(e)}")
            return []

qdrant_service = QdrantService()
