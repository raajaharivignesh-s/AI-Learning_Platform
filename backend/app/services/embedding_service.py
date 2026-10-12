from typing import List, Optional
from app.core.config import settings
import math

class EmbeddingProvider:
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError

_model = None

class SentenceTransformerProvider(EmbeddingProvider):
    def __init__(self):
        global _model
        if _model is None:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.model = _model
        
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, batch_size=settings.EMBEDDING_BATCH_SIZE, convert_to_numpy=True)
        
        result = []
        for emb in embeddings:
            clean_emb = []
            for val in emb:
                fval = float(val)
                if math.isnan(fval) or math.isinf(fval):
                    clean_emb.append(0.0)
                else:
                    clean_emb.append(fval)
            result.append(clean_emb)
        return result

default_embedding_provider: Optional[EmbeddingProvider] = None

def get_default_provider() -> EmbeddingProvider:
    global default_embedding_provider
    if default_embedding_provider is None:
        default_embedding_provider = SentenceTransformerProvider()
    return default_embedding_provider

def generate_embeddings(texts: List[str], provider: Optional[EmbeddingProvider] = None) -> List[List[float]]:
    if provider is None:
        provider = get_default_provider()
    return provider.get_embeddings(texts)
