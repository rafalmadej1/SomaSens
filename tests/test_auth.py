"""
Authentication endpoint tests
"""
from datetime import datetime, timezone
from unittest.mock import patch

from jose import jwt

import backend.auth as auth


def test_register_new_user(client):
    """Test user registration"""
    response = client.post(
        "/auth/register",
        json={"email": "newuser@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    claims = jwt.get_unverified_claims(data["access_token"])
    assert claims["iss"] == auth.JWT_ISSUER
    assert claims["aud"] == auth.JWT_AUDIENCE
    assert isinstance(claims["jti"], str)
    assert auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60 - 5 <= (
        claims["exp"] - datetime.now(timezone.utc).timestamp()
    ) <= auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60 + 5


def test_register_duplicate_email(client, test_user_token):
    """Test registering with duplicate email fails"""
    response = client.post(
        "/auth/register",
        json={"email": "testuser@example.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_success(client):
    """Test successful login"""
    # Register first
    client.post(
        "/auth/register",
        json={"email": "logintest@example.com", "password": "password123"}
    )
    
    # Login
    response = client.post(
        "/auth/token",
        data={"username": "logintest@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    """Test login with wrong password fails"""
    # Register first
    client.post(
        "/auth/register",
        json={"email": "testlogin@example.com", "password": "correctpass"}
    )
    
    # Try wrong password
    response = client.post(
        "/auth/token",
        data={"username": "testlogin@example.com", "password": "wrongpass"}
    )
    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Test login with non-existent email fails"""
    response = client.post(
        "/auth/token",
        data={"username": "nonexistent@example.com", "password": "password"}
    )
    assert response.status_code == 401


def test_register_rejects_short_or_oversized_passwords(client):
    short_password = client.post(
        "/auth/register",
        json={"email": "short@example.com", "password": "short"},
    )
    oversized_password = client.post(
        "/auth/register",
        json={"email": "long@example.com", "password": "a" * 73},
    )

    assert short_password.status_code == 422
    assert oversized_password.status_code == 422


@patch("backend.auth.verify_password")
def test_login_verifies_dummy_hash_for_unknown_user(mock_verify_password, client):
    mock_verify_password.return_value = False

    response = client.post(
        "/auth/token",
        data={"username": "nonexistent@example.com", "password": "password"},
    )

    assert response.status_code == 401
    mock_verify_password.assert_called_once_with("password", auth.DUMMY_PASSWORD_HASH)


def test_logout_revokes_access_token(client):
    registration = client.post(
        "/auth/register",
        json={"email": "logout@example.com", "password": "password123"},
    )
    token = registration.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    logout_response = client.post("/auth/logout", headers=headers)

    assert logout_response.status_code == 204
    assert client.get("/items", headers=headers).status_code == 401
