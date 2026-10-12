import os
import pytest
from app.core.config import settings
from app.models.resource import ProcessingStatus

def test_resource_upload_invalid_file(client):
    # Register & Login
    client.post("/api/v1/auth/register", json={"email": "res1@example.com", "password": "strongpassword", "full_name": "R1"})
    token = client.post("/api/v1/auth/login", json={"email": "res1@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create course
    course_id = client.post("/api/v1/courses", json={"title": "Math", "description": "", "subject": ""}, headers=headers).json()["id"]

    # Upload non-pdf/pptx
    files = {'file': ('test.txt', b'hello world', 'text/plain')}
    response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers=headers)
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

    # Upload empty file
    files = {'file': ('empty.pdf', b'', 'application/pdf')}
    response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers=headers)
    assert response.status_code == 400

    # Upload invalid signature
    files = {'file': ('invalid.pdf', b'notapdf-content', 'application/pdf')}
    response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers=headers)
    assert response.status_code == 400
    assert "Invalid PDF file signature" in response.json()["detail"]

def test_resource_upload_valid_file(client, tmp_path):
    # Register & Login
    client.post("/api/v1/auth/register", json={"email": "res2@example.com", "password": "strongpassword", "full_name": "R2"})
    token = client.post("/api/v1/auth/login", json={"email": "res2@example.com", "password": "strongpassword"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    course_id = client.post("/api/v1/courses", json={"title": "Sci", "description": "", "subject": ""}, headers=headers).json()["id"]

    # Create a minimal valid PDF using pymupdf
    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Hello PDF World")
    pdf_path = tmp_path / "test.pdf"
    doc.save(pdf_path)
    doc.close()

    with open(pdf_path, "rb") as f:
        files = {'file': ('test.pdf', f, 'application/pdf')}
        response = client.post(f"/api/v1/courses/{course_id}/resources", files=files, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "test.pdf"
    assert data["processing_status"] == ProcessingStatus.completed
    assert data["error_details"] is None
    
    resource_id = data["id"]
    
    # Get resource
    res2 = client.get(f"/api/v1/resources/{resource_id}", headers=headers)
    assert res2.status_code == 200

    # Get pages
    res3 = client.get(f"/api/v1/resources/{resource_id}/pages", headers=headers)
    assert res3.status_code == 200
    pages_data = res3.json()["items"]
    assert len(pages_data) == 1
    assert "Hello PDF World" in pages_data[0]["extracted_text"]

def test_resource_cross_user_isolation(client, tmp_path):
    client.post("/api/v1/auth/register", json={"email": "res_a@example.com", "password": "strongpassword", "full_name": "RA"})
    token_a = client.post("/api/v1/auth/login", json={"email": "res_a@example.com", "password": "strongpassword"}).json()["access_token"]
    
    client.post("/api/v1/auth/register", json={"email": "res_b@example.com", "password": "strongpassword", "full_name": "RB"})
    token_b = client.post("/api/v1/auth/login", json={"email": "res_b@example.com", "password": "strongpassword"}).json()["access_token"]
    
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

    # User B tries to read User A's resource
    res_get = client.get(f"/api/v1/resources/{resource_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_get.status_code == 404

    # User B tries to get pages
    res_pages = client.get(f"/api/v1/resources/{resource_id}/pages", headers={"Authorization": f"Bearer {token_b}"})
    assert res_pages.status_code == 404

    # User B tries to delete
    res_del = client.delete(f"/api/v1/resources/{resource_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_del.status_code == 404
