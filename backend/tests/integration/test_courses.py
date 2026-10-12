def test_course_crud(client):
    # Setup user
    client.post("/api/v1/auth/register", json={
        "email": "course_user@example.com",
        "password": "strongpassword",
        "full_name": "Course User"
    })
    token = client.post("/api/v1/auth/login", json={
        "email": "course_user@example.com",
        "password": "strongpassword"
    }).json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}

    # Create Course
    response = client.post("/api/v1/courses", json={
        "title": "Math 101",
        "description": "Basic Math",
        "subject": "Math"
    }, headers=headers)
    assert response.status_code == 201
    course_id = response.json()["id"]

    # Get Course
    response = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Math 101"

    # Update Course
    response = client.patch(f"/api/v1/courses/{course_id}", json={
        "title": "Advanced Math 101"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Advanced Math 101"

    # Delete Course
    response = client.delete(f"/api/v1/courses/{course_id}", headers=headers)
    assert response.status_code == 204

    # Verify Delete
    response = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    assert response.status_code == 404

def test_cross_user_isolation(client):
    # Setup User A
    client.post("/api/v1/auth/register", json={
        "email": "usera@example.com",
        "password": "strongpassword",
        "full_name": "User A"
    })
    token_a = client.post("/api/v1/auth/login", json={
        "email": "usera@example.com",
        "password": "strongpassword"
    }).json()["access_token"]
    
    # Setup User B
    client.post("/api/v1/auth/register", json={
        "email": "userb@example.com",
        "password": "strongpassword",
        "full_name": "User B"
    })
    token_b = client.post("/api/v1/auth/login", json={
        "email": "userb@example.com",
        "password": "strongpassword"
    }).json()["access_token"]
    
    # User A creates Course
    response = client.post("/api/v1/courses", json={
        "title": "User A Course",
        "description": "Private to A"
    }, headers={"Authorization": f"Bearer {token_a}"})
    course_a_id = response.json()["id"]

    # User B tries to read User A's Course
    response = client.get(f"/api/v1/courses/{course_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 404

    # User B tries to update User A's Course
    response = client.patch(f"/api/v1/courses/{course_a_id}", json={
        "title": "Hacked Course"
    }, headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 404

    # User B tries to delete User A's Course
    response = client.delete(f"/api/v1/courses/{course_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 404
