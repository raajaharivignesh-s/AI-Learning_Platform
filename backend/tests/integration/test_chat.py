import pytest
from uuid import uuid4

def test_chat_course_resources(client, monkeypatch):
    # Setup test users
    client.post("/api/v1/auth/register", json={"email": "chat1@example.com", "password": "strongpassword", "full_name": "C1"})
    token = client.post("/api/v1/auth/login", json={"email": "chat1@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create course
    course_res = client.post("/api/v1/courses", json={"title": "Chat Course"}, headers=headers)
    course_id = course_res.json()["id"]
    
    # Mock RAG Service
    from app.services import rag_service
    
    dummy_uuid = str(uuid4())
    def mock_get_answer(db, course_id, owner_id, question, limit, source_only):
            return {
                "answer": f"Mock answer to {question} [Citation: {dummy_uuid}]",
                "citations": [
                    {
                        "chunk_id": dummy_uuid,
                        "resource_id": str(uuid4()),
                        "start_page": 1,
                        "end_page": 1,
                        "score": 0.99
                    }
                ],
                "insufficient_evidence": False
            }
        
    monkeypatch.setattr(rag_service.rag_service, "get_answer", mock_get_answer)
    
    response = client.post(
        f"/api/v1/courses/{course_id}/chat",
        json={"question": "test question", "source_only": True},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["insufficient_evidence"] is False
    assert "Mock answer" in data["answer"]
    assert len(data["citations"]) == 1

def test_chat_course_not_found(client):
    client.post("/api/v1/auth/register", json={"email": "c2@example.com", "password": "strongpassword", "full_name": "C2"})
    token = client.post("/api/v1/auth/login", json={"email": "c2@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    fake_id = str(uuid4())
    response = client.post(
        f"/api/v1/courses/{fake_id}/chat",
        json={"question": "test question", "source_only": True},
        headers=headers
    )
    
    assert response.status_code == 404
    
def test_chat_empty_question(client, monkeypatch):
    client.post("/api/v1/auth/register", json={"email": "c3@example.com", "password": "strongpassword", "full_name": "C3"})
    token = client.post("/api/v1/auth/login", json={"email": "c3@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    course_res = client.post("/api/v1/courses", json={"title": "Chat Course"}, headers=headers)
    course_id = course_res.json()["id"]

    response = client.post(
        f"/api/v1/courses/{course_id}/chat",
        json={"question": "", "source_only": True},
        headers=headers
    )
    
    # Pydantic field validation handles empty string if we add min_length, but we didn't. 
    # RAG service raises ValueError
    assert response.status_code == 400
