"""
AI service endpoint tests (diet, workout, shopping plans)
"""
import pytest
from unittest.mock import patch, MagicMock
from backend import models
from backend.ai_service import LocalModelError


@patch('backend.ai_service.generate_diet_plan')
def test_diet_plan_requires_items(mock_diet, client, auth_headers):
    """Test diet plan fails when pantry is empty"""
    response = client.post("/ai/diet", headers=auth_headers)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@patch('backend.ai_service.generate_diet_plan')
def test_diet_plan_with_items(mock_diet, client, auth_headers):
    """Test generating diet plan with items"""
    mock_diet.return_value = "Generated diet plan"
    
    # Add some items first
    client.post(
        "/items",
        json={
            "name": "Chicken",
            "quantity": 500,
            "unit": "g",
            "location": "lodowka",
            "expirationDate": "2025-01-20"
        },
        headers=auth_headers
    )
    
    response = client.post("/ai/diet", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["plan"] == "Generated diet plan"
    assert mock_diet.called


@patch('backend.ai_service.generate_diet_plan')
def test_diet_plan_caps_inventory_and_activity_context(
    mock_diet, client, auth_headers, db_session
):
    user = db_session.query(models.UserDB).filter_by(email="testuser@example.com").one()
    db_session.add_all(
        [
            models.PantryItemDB(
                name=f"Item {index}",
                quantity=1,
                unit=models.UnitEnum.GRAMS,
                location=models.LocationEnum.SPIZARNIA,
                expirationDate=f"2025-01-{(index % 28) + 1:02d}",
                owner_id=user.id,
            )
            for index in range(101)
        ]
        + [
            models.ActivityDB(
                activity_type=f"Activity {index}",
                calories_burned=100,
                duration_minutes=30,
                date="2025-01-15",
                owner_id=user.id,
            )
            for index in range(31)
        ]
    )
    db_session.commit()
    mock_diet.return_value = "Generated diet plan"

    response = client.post("/ai/diet", headers=auth_headers)

    assert response.status_code == 200
    pantry_items, activities = mock_diet.call_args.args[:2]
    assert len(pantry_items) == 100
    assert len(activities) == 30


@patch('backend.ai_service.generate_workout_plan')
def test_workout_plan_requires_goal(mock_workout, client, auth_headers):
    """Test workout plan requires goal"""
    response = client.post(
        "/ai/workout",
        json={},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "goal" in response.json()["detail"].lower()


@patch('backend.ai_service.generate_workout_plan')
def test_workout_plan_with_goal(mock_workout, client, auth_headers):
    """Test generating workout plan"""
    mock_workout.return_value = "Generated workout plan"
    
    response = client.post(
        "/ai/workout",
        json={"goal": "Build muscle"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["plan"] == "Generated workout plan"


@patch('backend.ai_service.generate_workout_plan')
def test_workout_plan_from_profile(mock_workout, client, auth_headers):
    """Test workout plan uses profile data"""
    mock_workout.return_value = "Plan with profile data"
    
    # Update profile first
    client.put(
        "/profile",
        json={"age": 30, "weight": 75, "goal": "Lose weight"},
        headers=auth_headers
    )
    
    # Request without goal should use profile goal
    response = client.post(
        "/ai/workout",
        json={},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert mock_workout.called


@patch('backend.ai_service.generate_shopping_list')
def test_shopping_list(mock_shopping, client, auth_headers):
    """Test generating shopping list"""
    mock_shopping.return_value = "Shopping list"
    
    # Add inventory
    client.post(
        "/items",
        json={
            "name": "Rice",
            "quantity": 200,
            "unit": "g",
            "location": "spizarnia",
            "expirationDate": "2025-03-15"
        },
        headers=auth_headers
    )
    
    response = client.post(
        "/ai/shopping",
        json={"days": 7, "budget": 50},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["plan"] == "Shopping list"


def test_shopping_list_rejects_out_of_range_duration(client, auth_headers):
    response = client.post(
        "/ai/shopping",
        json={"days": 31},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_get_last_plan_diet(client, auth_headers):
    """Test retrieving last diet plan"""
    response = client.get("/ai/last_plan/diet", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "plan" in data
    assert data["plan"] is None  # No plans yet


def test_get_last_plan_invalid_type(client, auth_headers):
    """Test retrieving plan with invalid type"""
    response = client.get("/ai/last_plan/invalid_type", headers=auth_headers)
    # Should still return 200 with None plan
    assert response.status_code == 200
    assert response.json()["plan"] is None


def test_ai_endpoints_unauthorized(client):
    """Test AI endpoints require authentication"""
    assert client.post("/ai/diet").status_code == 401
    assert client.post("/ai/workout", json={}).status_code == 401
    assert client.post("/ai/shopping", json={}).status_code == 401
    assert client.get("/ai/last_plan/diet").status_code == 401


@patch(
    "backend.ai_service.generate_workout_plan",
    side_effect=LocalModelError("Local model is unavailable."),
)
def test_workout_plan_returns_service_unavailable_when_local_model_fails(
    _mock_workout, client, auth_headers
):
    response = client.post(
        "/ai/workout",
        json={"goal": "Build muscle"},
        headers=auth_headers,
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Local model is unavailable."
