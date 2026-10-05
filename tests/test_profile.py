"""
User profile endpoint tests
"""
import pytest


def test_get_profile_creates_default(client, auth_headers):
    """Test getting profile creates default if doesn't exist"""
    response = client.get("/profile", headers=auth_headers)
    assert response.status_code == 200
    profile = response.json()
    assert "id" in profile
    assert profile["age"] is None
    assert profile["weight"] is None


def test_update_profile(client, auth_headers):
    """Test updating user profile"""
    update_data = {
        "age": 30,
        "weight": 75.5,
        "height": 180,
        "gender": "Male",
        "goal": "Build muscle",
        "activity_level": "Moderate",
        "dietary_preferences": "Vegetarian"
    }
    
    response = client.put("/profile", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["age"] == 30
    assert profile["weight"] == 75.5
    assert profile["goal"] == "Build muscle"


def test_update_profile_partial(client, auth_headers):
    """Test partial profile update"""
    # Update with only some fields
    response = client.put(
        "/profile",
        json={"age": 25, "weight": 70},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Get and verify
    get_response = client.get("/profile", headers=auth_headers)
    profile = get_response.json()
    assert profile["age"] == 25
    assert profile["weight"] == 70


def test_update_profile_unauthorized(client):
    """Test updating profile without auth fails"""
    response = client.put(
        "/profile",
        json={"age": 30}
    )
    assert response.status_code == 401


def test_get_profile_unauthorized(client):
    """Test getting profile without auth fails"""
    response = client.get("/profile")
    assert response.status_code == 401
