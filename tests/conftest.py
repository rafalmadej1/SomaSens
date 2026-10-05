import os
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Set test environment variables if not present
if not os.getenv("JWT_SECRET_KEY"):
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only-32-chars-min"
if not os.getenv("ALLOWED_ORIGINS"):
    os.environ["ALLOWED_ORIGINS"] = "http://localhost:5173"

from backend.database import Base, get_db
from backend.main import app, limiter
from backend import models

# Disable the limiter instance captured by endpoint decorators.
limiter.enabled = False


@pytest.fixture(scope="function")
def test_db():
    """Create an in-memory SQLite database for each test"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db_session(test_db):
    """Create a fresh database session for each test"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_db)
    session = SessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass  # Don't close during request

    app.dependency_overrides[get_db] = override_get_db
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    """Create a test client with overridden database"""
    return TestClient(app)


@pytest.fixture
def test_user_token(client):
    """Login and get access token for test user"""
    # Register user
    response = client.post(
        "/auth/register",
        json={"email": "testuser@example.com", "password": "testpass123"}
    )
    if response.status_code != 200:
        raise Exception(f"Failed to register: {response.json()}")
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(test_user_token):
    """Get authorization headers with token"""
    return {"Authorization": f"Bearer {test_user_token}"}
