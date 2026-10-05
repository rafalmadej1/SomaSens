def test_versioned_api_routes_enforce_existing_authentication(client):
    response = client.get("/api/v1/items")

    assert response.status_code == 401
