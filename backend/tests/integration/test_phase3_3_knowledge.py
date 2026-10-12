import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4, UUID
from app.models.course import Course
from app.models.resource import Resource
from app.models.resource_chunk import ResourceChunk
from app.services.knowledge_service import knowledge_service
from app.models.knowledge import KnowledgeMapStatus, Topic, Concept, PrerequisiteRelationship

def test_knowledge_map_lifecycle(client: TestClient, db_session: Session, monkeypatch):
    # 1. User Setup
    email = f"know_{uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "password", "full_name": "Know User"})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "password"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Course
    course_res = client.post("/api/v1/courses", json={"title": "Knowledge Course", "description": "Desc"}, headers=headers)
    course_id = UUID(course_res.json()["id"])
    owner_id = UUID(course_res.json()["owner_id"])

    # 3. Create dummy resource and chunk
    res_id = uuid4()
    db_session.add(Resource(id=res_id, course_id=course_id, owner_id=owner_id, original_filename="res.pdf", stored_filename=f"{uuid4()}.pdf", mime_type="application/pdf", file_size=1024, processing_status="completed"))
    
    chunk_id = uuid4()
    db_session.add(ResourceChunk(id=chunk_id, resource_id=res_id, course_id=course_id, owner_id=owner_id, chunk_index=1, text="Machine learning is cool.", model_identifier="model", embedding_dimension=3, embedding=[0.1, 0.2, 0.3]))
    db_session.commit()

    # 4. Mock LLM
    def mock_extract_topics(context):
        return {
            "topics": [
                {
                    "title": "Machine Learning",
                    "description": "Intro to ML",
                    "concepts": [
                        {
                            "title": "Supervised Learning",
                            "definition": "Learning with labels",
                            "sources": [{"chunk_id": str(chunk_id)}]
                        },
                        {
                            "title": "Unsupervised Learning",
                            "definition": "Learning without labels",
                            "sources": [{"chunk_id": str(chunk_id)}]
                        }
                    ]
                }
            ]
        }
    
    def mock_extract_relationships(context):
        return {
            "prerequisites": [
                {
                    "source_concept_title": "Supervised Learning",
                    "target_concept_title": "Unsupervised Learning",
                    "is_inferred": True,
                    "confidence": 0.9,
                    "evidence": "Because you need labels first."
                }
            ]
        }

    monkeypatch.setattr(knowledge_service.llm, "extract_topics_and_concepts", mock_extract_topics)
    monkeypatch.setattr(knowledge_service.llm, "extract_relationships", mock_extract_relationships)

    # 5. Build Knowledge Map
    build_res = client.post(f"/api/v1/courses/{course_id}/knowledge-map/build", headers=headers)
    assert build_res.status_code == 202
    assert build_res.json()["status"] == KnowledgeMapStatus.completed

    # 6. Fetch Knowledge Map
    map_res = client.get(f"/api/v1/courses/{course_id}/knowledge-map", headers=headers)
    assert map_res.status_code == 200
    data = map_res.json()
    assert len(data) == 1
    assert data[0]["title"] == "Machine Learning"
    assert len(data[0]["concepts"]) == 2

    # 7. Verify Database Records
    topics = db_session.query(Topic).filter(Topic.course_id == course_id).all()
    assert len(topics) == 1

    concepts = db_session.query(Concept).filter(Concept.course_id == course_id).all()
    assert len(concepts) == 2

    prereqs = db_session.query(PrerequisiteRelationship).filter(PrerequisiteRelationship.course_id == course_id).all()
    assert len(prereqs) == 1
    assert prereqs[0].confidence == 0.9

    # 8. Test Idempotency (rebuilding doesn't duplicate)
    client.post(f"/api/v1/courses/{course_id}/knowledge-map/build", headers=headers)
    
    topics_after = db_session.query(Topic).filter(Topic.course_id == course_id).all()
    assert len(topics_after) == 1

    concepts_after = db_session.query(Concept).filter(Concept.course_id == course_id).all()
    assert len(concepts_after) == 2
