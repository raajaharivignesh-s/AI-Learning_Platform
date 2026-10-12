import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.resource import Resource, ProcessingStatus
from app.models.resource_chunk import ResourceChunk
from app.models.resource_video import ResourceVideoSegment
import os

@pytest.fixture
def mock_ffmpeg(monkeypatch):
    import app.services.video_extraction_service as ves
    def mock_check_ffmpeg():
        return True
    
    def mock_extract_audio(video_path, audio_path):
        with open(audio_path, "wb") as f:
            f.write(b"dummy audio")
            
    def mock_extract_keyframes(video_path, output_dir, interval):
        os.makedirs(output_dir, exist_ok=True)
        frame1 = os.path.join(output_dir, "frame_0000.jpg")
        with open(frame1, "wb") as f:
            f.write(b"dummy frame")
        return [{"path": frame1, "filename": "frame_0000.jpg", "timestamp": 0.0}]

    monkeypatch.setattr(ves, "check_ffmpeg", mock_check_ffmpeg)
    monkeypatch.setattr(ves, "extract_audio", mock_extract_audio)
    monkeypatch.setattr(ves, "extract_keyframes", mock_extract_keyframes)


def test_video_upload_and_processing(client: TestClient, db_session: Session, monkeypatch, mock_ffmpeg):
    from uuid import uuid4
    email = f"p32_{uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "strongpassword", "full_name": "P3.2 User"})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    course_id = client.post("/api/v1/courses", json={"title": "Video Course"}, headers=headers).json()["id"]

    from app.services import llm_provider, qdrant_service, resource_processing_service
    from app.services.embedding_service import EmbeddingProvider

    class MockEmbeddingProvider(EmbeddingProvider):
        def get_embeddings(self, texts):
            return [[0.1] * 384 for _ in texts]

    def mock_generate_video_transcript(self, audio_path):
        return [{"start": 0.0, "end": 10.0, "text": "Dummy transcript."}]
        
    def mock_generate_image_description(self, image_path):
        return "Dummy frame."
        
    monkeypatch.setattr(llm_provider.GeminiProvider, "generate_video_transcript", mock_generate_video_transcript)
    monkeypatch.setattr(llm_provider.GeminiProvider, "generate_image_description", mock_generate_image_description)
    
    def mock_upsert(chunks):
        return True
    monkeypatch.setattr(qdrant_service.qdrant_service, "upsert_chunks", mock_upsert)

    mock_provider = MockEmbeddingProvider()
    original_process = resource_processing_service.process_resource_text
    def mocked_process(db, res_id, owner_id):
        return original_process(db, res_id, owner_id, provider=mock_provider)
    monkeypatch.setattr(resource_processing_service, "process_resource_text", mocked_process)
    
    # Upload video
    dummy_video_path = "tests/fixtures/dummy.mp4"
    os.makedirs("tests/fixtures", exist_ok=True)
    with open(dummy_video_path, "wb") as f:
        f.write(b"ftypmp4dummyvideodata")
        
    with open(dummy_video_path, "rb") as f:
        response = client.post(
            f"/api/v1/courses/{course_id}/resources",
            headers=headers,
            files={"file": ("dummy.mp4", f, "video/mp4")}
        )
        
    assert response.status_code == 201
    resource_data = response.json()
    resource_id = resource_data["id"]
    
    from uuid import UUID
    resource_uuid = UUID(resource_id)
    
    # Assert DB state for resource
    resource = db_session.query(Resource).filter(Resource.id == resource_uuid).first()
    assert resource is not None
    assert resource.processing_status == ProcessingStatus.completed
    
    # Force processing to create chunks
    res_proc = client.post(f"/api/v1/resources/{resource_id}/process", headers=headers)
    assert res_proc.status_code == 200
    
    # Assert Video Segments created
    segments = db_session.query(ResourceVideoSegment).filter(ResourceVideoSegment.resource_id == resource_uuid).all()
    assert len(segments) > 0 # At least transcript and frame segments
    
    # Test cleanup
    del_res = client.delete(
        f"/api/v1/resources/{resource_id}",
        headers=headers
    )
    assert del_res.status_code == 204
    
    segments_after = db_session.query(ResourceVideoSegment).filter(ResourceVideoSegment.resource_id == resource_uuid).all()
    assert len(segments_after) == 0
    
    chunks_after = db_session.query(ResourceChunk).filter(ResourceChunk.resource_id == resource_uuid).all()
    assert len(chunks_after) == 0
    
    os.remove(dummy_video_path)

def test_video_chat_citation(client: TestClient, db_session: Session, monkeypatch):
    from uuid import uuid4
    email = f"chat_{uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "strongpassword", "full_name": "P3.2 Chat User"})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    course_id = client.post("/api/v1/courses", json={"title": "Chat Course"}, headers=headers).json()["id"]

    from app.services.rag_service import rag_service
    
    # Mock get_answer to return a video citation
    def mock_get_answer(*args, **kwargs):
        from uuid import uuid4
        c_uuid = str(uuid4())
        r_uuid = str(uuid4())
        return {
            "answer": f"According to the video [Citation: {c_uuid}]",
            "citations": [
                {
                    "chunk_id": c_uuid,
                    "resource_id": r_uuid,
                    "start_time": 10.0,
                    "end_time": 20.0,
                    "score": 0.85
                }
            ],
            "insufficient_evidence": False
        }
        
    monkeypatch.setattr(rag_service, "get_answer", mock_get_answer)
    
    res = client.post(
        f"/api/v1/courses/{course_id}/chat",
        headers=headers,
        json={"question": "What happens at 10 seconds?", "source_only": True}
    )
    
    assert res.status_code == 200
    data = res.json()
    assert len(data["citations"]) == 1
    assert data["citations"][0]["start_time"] == 10.0
