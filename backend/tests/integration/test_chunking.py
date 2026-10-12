import pytest
from app.models.resource import ProcessingStatus
from app.services.chunking_service import chunk_text
from app.models.resource_page import ResourcePage
from app.services.embedding_service import EmbeddingProvider

class MockEmbeddingProvider(EmbeddingProvider):
    def get_embeddings(self, texts):
        return [[0.1] * 384 for _ in texts]

def test_chunk_text_basic():
    p1 = ResourcePage(page_number=1, extracted_text="Hello world. " * 100)
    p2 = ResourcePage(page_number=2, extracted_text="Page two text. " * 50)
    
    chunks = chunk_text([p1, p2], chunk_size=200, chunk_overlap=20)
    
    assert len(chunks) > 0
    assert chunks[0]["start_page"] == 1
    # Overlap and sizes should be correct, text shouldn't be empty
    for c in chunks:
        assert len(c["text"]) > 0

def test_resource_processing_endpoint(client, tmp_path, monkeypatch):
    # Register & Login
    client.post("/api/v1/auth/register", json={"email": "chunk1@example.com", "password": "strongpassword", "full_name": "C1"})
    token = client.post("/api/v1/auth/login", json={"email": "chunk1@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    course_id = client.post("/api/v1/courses", json={"title": "Math", "description": "", "subject": ""}, headers=headers).json()["id"]

    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Test PDF content for chunking. " * 100)
    pdf_path = tmp_path / "test_chunk.pdf"
    doc.save(pdf_path)
    doc.close()

    with open(pdf_path, "rb") as f:
        files = {'file': ('test_chunk.pdf', f, 'application/pdf')}
        response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers=headers)
    
    resource_id = response.json()["id"]
    
    from app.services import resource_processing_service
    
    # Process with mock embedding
    mock_provider = MockEmbeddingProvider()
    original_process = resource_processing_service.process_resource_text
    
    from app.services import qdrant_service
    def mock_upsert(chunks):
        return True
    monkeypatch.setattr(qdrant_service.qdrant_service, "upsert_chunks", mock_upsert)
    
    def mocked_process(db, res_id, owner_id):
        return original_process(db, res_id, owner_id, provider=mock_provider)
    
    monkeypatch.setattr(resource_processing_service, "process_resource_text", mocked_process)
    
    # Process
    process_res = client.post(f"/api/v1/resources/{resource_id}/process", headers=headers)
    assert process_res.status_code == 200
    assert process_res.json()["processing_status"] == ProcessingStatus.completed
    
    # Get chunks
    chunks_res = client.get(f"/api/v1/resources/{resource_id}/chunks", headers=headers)
    assert chunks_res.status_code == 200
    items = chunks_res.json()["items"]
    assert len(items) > 0
    assert "text" in items[0]
    assert "start_page" in items[0]
    
    # Get status
    status_res = client.get(f"/api/v1/resources/{resource_id}/processing-status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["chunk_count"] == len(items)

def test_processing_cross_user_isolation(client, tmp_path):
    # Setup users
    client.post("/api/v1/auth/register", json={"email": "ca@example.com", "password": "strongpassword", "full_name": "A"})
    token_a = client.post("/api/v1/auth/login", json={"email": "ca@example.com", "password": "strongpassword"}).json()["access_token"]
    
    client.post("/api/v1/auth/register", json={"email": "cb@example.com", "password": "strongpassword", "full_name": "B"})
    token_b = client.post("/api/v1/auth/login", json={"email": "cb@example.com", "password": "strongpassword"}).json()["access_token"]
    
    # Create resource for A
    course_id = client.post("/api/v1/courses", json={"title": "A Course"}, headers={"Authorization": f"Bearer {token_a}"}).json()["id"]

    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Test")
    pdf_path = tmp_path / "test_iso.pdf"
    doc.save(pdf_path)
    doc.close()

    with open(pdf_path, "rb") as f:
        files = {'file': ('test_iso.pdf', f, 'application/pdf')}
        response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers={"Authorization": f"Bearer {token_a}"})
    resource_id = response.json()["id"]

    # B tries to process A's resource
    process_res = client.post(f"/api/v1/resources/{resource_id}/process", headers={"Authorization": f"Bearer {token_b}"})
    assert process_res.status_code == 404
    
    # B tries to get chunks
    chunks_res = client.get(f"/api/v1/resources/{resource_id}/chunks", headers={"Authorization": f"Bearer {token_b}"})
    assert chunks_res.status_code == 404
    
    # B tries to get status
    status_res = client.get(f"/api/v1/resources/{resource_id}/processing-status", headers={"Authorization": f"Bearer {token_b}"})
    assert status_res.status_code == 404
