"""
Activities endpoint tests
"""
import pytest


def test_create_activity(client, auth_headers):
    """Test creating an activity"""
    response = client.post(
        "/activities",
        json={
            "activity_type": "Running",
            "calories_burned": 400,
            "duration_minutes": 30,
            "date": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["activity_type"] == "Running"
    assert data["calories_burned"] == 400


def test_create_activity_unauthorized(client):
    """Test creating activity without auth fails"""
    response = client.post(
        "/activities",
        json={
            "activity_type": "Running",
            "calories_burned": 400,
            "duration_minutes": 30,
            "date": "2025-01-15"
        }
    )
    assert response.status_code == 401


def test_list_activities_empty(client, auth_headers):
    """Test listing activities when none exist"""
    response = client.get("/activities", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_activities(client, auth_headers):
    """Test listing activities"""
    # Create activities
    client.post(
        "/activities",
        json={
            "activity_type": "Running",
            "calories_burned": 400,
            "duration_minutes": 30,
            "date": "2025-01-15"
        },
        headers=auth_headers
    )
    client.post(
        "/activities",
        json={
            "activity_type": "Cycling",
            "calories_burned": 300,
            "duration_minutes": 45,
            "date": "2025-01-16"
        },
        headers=auth_headers
    )
    
    response = client.get("/activities", headers=auth_headers)
    assert response.status_code == 200
    activities = response.json()
    assert len(activities) == 2


def test_list_activities_paginates_by_newest_first(client, auth_headers):
    for activity_type in ("Running", "Cycling", "Swimming"):
        client.post(
            "/activities",
            json={
                "activity_type": activity_type,
                "calories_burned": 100,
                "duration_minutes": 30,
                "date": "2025-01-15",
            },
            headers=auth_headers,
        )

    first_page = client.get("/activities?limit=2", headers=auth_headers)
    second_page = client.get("/activities?limit=2&offset=2", headers=auth_headers)

    assert [activity["activity_type"] for activity in first_page.json()] == [
        "Swimming",
        "Cycling",
    ]
    assert [activity["activity_type"] for activity in second_page.json()] == ["Running"]


def test_delete_activity(client, auth_headers):
    """Test deleting an activity"""
    # Create activity
    create_response = client.post(
        "/activities",
        json={
            "activity_type": "Gym",
            "calories_burned": 250,
            "duration_minutes": 60,
            "date": "2025-01-15"
        },
        headers=auth_headers
    )
    activity_id = create_response.json()["id"]
    
    # Delete
    delete_response = client.delete(f"/activities/{activity_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    
    # Verify deleted
    list_response = client.get("/activities", headers=auth_headers)
    assert len(list_response.json()) == 0


def test_delete_nonexistent_activity(client, auth_headers):
    """Test deleting non-existent activity fails"""
    response = client.delete("/activities/999", headers=auth_headers)
    assert response.status_code == 404


def test_activity_validation_invalid_calories(client, auth_headers):
    """Test activity creation with invalid calories"""
    response = client.post(
        "/activities",
        json={
            "activity_type": "Running",
            "calories_burned": -100,  # Invalid
            "duration_minutes": 30,
            "date": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 422


def test_activity_validation_max_type_length(client, auth_headers):
    """Test activity with type exceeding max length"""
    response = client.post(
        "/activities",
        json={
            "activity_type": "A" * 200,  # Exceeds 100 char limit
            "calories_burned": 100,
            "duration_minutes": 30,
            "date": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 422
