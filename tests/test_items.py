"""
Pantry items endpoint tests
"""
import pytest
from backend import models


def test_create_item(client, auth_headers):
    """Test creating a pantry item"""
    response = client.post(
        "/items",
        json={
            "name": "Apple",
            "quantity": 10,
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Apple"
    assert data["quantity"] == 10


def test_create_item_unauthorized(client):
    """Test creating item without auth fails"""
    response = client.post(
        "/items",
        json={
            "name": "Apple",
            "quantity": 10,
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-15"
        }
    )
    assert response.status_code == 401


def test_list_items_empty(client, auth_headers):
    """Test listing items when none exist"""
    response = client.get("/items", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_items(client, auth_headers):
    """Test listing items"""
    # Create items
    client.post(
        "/items",
        json={
            "name": "Apples",
            "quantity": 5,
            "unit": "szt",
            "location": "lodowka",
            "expirationDate": "2025-01-20"
        },
        headers=auth_headers
    )
    client.post(
        "/items",
        json={
            "name": "Milk",
            "quantity": 1000,
            "unit": "g",
            "location": "lodowka",
            "expirationDate": "2025-01-10"
        },
        headers=auth_headers
    )
    
    response = client.get("/items", headers=auth_headers)
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    names = {item["name"] for item in items}
    assert "Apples" in names
    assert "Milk" in names


def test_list_items_paginates(client, auth_headers):
    for name in ("Apple", "Bread", "Carrot"):
        client.post(
            "/items",
            json={
                "name": name,
                "quantity": 1,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15",
            },
            headers=auth_headers,
        )

    first_page = client.get("/items?limit=2", headers=auth_headers)
    second_page = client.get("/items?limit=2&offset=2", headers=auth_headers)

    assert [item["name"] for item in first_page.json()] == ["Carrot", "Bread"]
    assert [item["name"] for item in second_page.json()] == ["Apple"]


def test_consume_items_updates_batch(client, auth_headers):
    for name, quantity in (("Apple", 100), ("Rice", 200)):
        client.post(
            "/items",
            json={
                "name": name,
                "quantity": quantity,
                "unit": "g",
                "location": "spizarnia",
                "expirationDate": "2025-01-15",
            },
            headers=auth_headers,
        )

    response = client.post(
        "/items/consume",
        json=[
            {"name": "apple", "quantity_used": 25},
            {"name": "Rice", "quantity_used": 50},
        ],
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["updated_items"] == [
        {"id": 1, "name": "Apple", "new_quantity": 75, "unit": "g"},
        {"id": 2, "name": "Rice", "new_quantity": 150, "unit": "g"},
    ]


def test_consume_items_rejects_non_positive_quantity(client, auth_headers):
    response = client.post(
        "/items/consume",
        json=[{"name": "Apple", "quantity_used": 0}],
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_delete_item(client, auth_headers):
    """Test deleting an item"""
    # Create item
    create_response = client.post(
        "/items",
        json={
            "name": "Tomato",
            "quantity": 3,
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-12"
        },
        headers=auth_headers
    )
    item_id = create_response.json()["id"]
    
    # Delete
    delete_response = client.delete(f"/items/{item_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    
    # Verify deleted
    list_response = client.get("/items", headers=auth_headers)
    assert len(list_response.json()) == 0


def test_delete_nonexistent_item(client, auth_headers):
    """Test deleting non-existent item fails"""
    response = client.delete("/items/999", headers=auth_headers)
    assert response.status_code == 404


def test_item_validation_invalid_quantity(client, auth_headers):
    """Test item creation with invalid quantity"""
    response = client.post(
        "/items",
        json={
            "name": "Bread",
            "quantity": -5,  # Invalid
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 422


def test_item_validation_max_name_length(client, auth_headers):
    """Test item with name exceeding max length"""
    response = client.post(
        "/items",
        json={
            "name": "A" * 100,  # Exceeds 50 char limit
            "quantity": 5,
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-15"
        },
        headers=auth_headers
    )
    assert response.status_code == 422


def test_user_isolation(client):
    """Test that items from different users are isolated"""
    # Register and login first user
    client.post("/auth/register", json={"email": "user1@test.com", "password": "password1"})
    response1 = client.post(
        "/auth/token",
        data={"username": "user1@test.com", "password": "password1"}
    )
    token1 = response1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    
    # Register and login second user
    client.post("/auth/register", json={"email": "user2@test.com", "password": "password2"})
    response2 = client.post(
        "/auth/token",
        data={"username": "user2@test.com", "password": "password2"}
    )
    token2 = response2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # User 1 adds item
    client.post(
        "/items",
        json={
            "name": "User1Item",
            "quantity": 5,
            "unit": "szt",
            "location": "spizarnia",
            "expirationDate": "2025-01-15"
        },
        headers=headers1
    )
    
    # User 2 adds item
    client.post(
        "/items",
        json={
            "name": "User2Item",
            "quantity": 10,
            "unit": "g",
            "location": "lodowka",
            "expirationDate": "2025-01-15"
        },
        headers=headers2
    )
    
    # User 1 can only see their items
    items1 = client.get("/items", headers=headers1).json()
    assert len(items1) == 1
    assert items1[0]["name"] == "User1Item"
    
    # User 2 can only see their items
    items2 = client.get("/items", headers=headers2).json()
    assert len(items2) == 1
    assert items2[0]["name"] == "User2Item"
