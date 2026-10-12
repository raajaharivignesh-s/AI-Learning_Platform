def test_register(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "strongpassword",
        "full_name": "Test User"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_login(client):
    # Already created in test_register? Wait, db_session fixture rolls back transactions per test!
    # Let's create the user here first.
    client.post("/api/v1/auth/register", json={
        "email": "test2@example.com",
        "password": "strongpassword",
        "full_name": "Test User 2"
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "test2@example.com",
        "password": "strongpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_me(client):
    client.post("/api/v1/auth/register", json={
        "email": "test3@example.com",
        "password": "strongpassword",
        "full_name": "Test User 3"
    })
    res_login = client.post("/api/v1/auth/login", json={
        "email": "test3@example.com",
        "password": "strongpassword"
    })
    token = res_login.json()["access_token"]
    
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test3@example.com"
