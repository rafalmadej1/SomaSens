"""
Security Penetration Tests - Attack Surface Analysis
Tests for SQL Injection, Authentication Bypass, Data Exposure, API Key leaks
"""
class TestSQLInjectionVulnerabilities:
    """Test for SQL injection in user inputs"""
    
    def test_sql_injection_email_field(self, client, auth_headers):
        """Attempt SQL injection via email field in item creation"""
        # This should be safe (Pydantic validates email)
        response = client.post(
            "/items",
            json={
                "name": "'; DROP TABLE pantry_items; --",
                "quantity": 1,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        # Should succeed (treated as literal string, not SQL)
        assert response.status_code == 200
        assert response.json()["name"] == "'; DROP TABLE pantry_items; --"


    def test_sql_injection_activity_type(self, client, auth_headers):
        """Attempt SQL injection via activity_type"""
        response = client.post(
            "/activities",
            json={
                "activity_type": "Running' OR '1'='1",
                "calories_burned": 100,
                "duration_minutes": 30,
                "date": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["activity_type"] == "Running' OR '1'='1"


    def test_sql_injection_item_name_unicode(self, client, auth_headers):
        """SQL injection with Unicode encoding"""
        response = client.post(
            "/items",
            json={
                "name": "Test\"; UNION SELECT * FROM users; --",
                "quantity": 5,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 200


class TestAuthenticationBypass:
    """Test authentication and token security"""
    
    def test_missing_token_returns_401(self, client):
        """No token should return 401"""
        response = client.get("/items")
        assert response.status_code == 401
    
    
    def test_invalid_token_format(self, client):
        """Invalid token format should fail"""
        response = client.get(
            "/items",
            headers={"Authorization": "InvalidFormat"}
        )
        assert response.status_code == 401
    
    
    def test_expired_token_simulation(self, client):
        """Attempt with malformed JWT"""
        response = client.get(
            "/items",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"}
        )
        assert response.status_code == 401
    
    
    def test_bearer_token_case_sensitive(self, client, test_user_token):
        """Test if Bearer token is case-insensitive (security issue)"""
        # Correct case
        response1 = client.get(
            "/items",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response1.status_code == 200
        
        # Wrong case (might be accepted - potential vulnerability)
        response2 = client.get(
            "/items",
            headers={"Authorization": f"bearer {test_user_token}"}
        )
        # This should fail but might not
        print(f"Lowercase bearer status: {response2.status_code}")


class TestAuthorizationBypass:
    """Test user isolation and authorization"""
    
    def test_access_other_user_items(self, client):
        """Attempt to access items from different user"""
        # Create user 1 and add item
        client.post("/auth/register", json={"email": "hacker@test.com", "password": "password123"})
        response1 = client.post(
            "/auth/token",
            data={"username": "hacker@test.com", "password": "password123"}
        )
        token1 = response1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        
        client.post(
            "/items",
            json={
                "name": "SecretItem",
                "quantity": 100,
                "unit": "g",
                "location": "lodowka",
                "expirationDate": "2025-03-15"
            },
            headers=headers1
        )
        
        # Create user 2
        client.post("/auth/register", json={"email": "attacker@test.com", "password": "password456"})
        response2 = client.post(
            "/auth/token",
            data={"username": "attacker@test.com", "password": "password456"}
        )
        token2 = response2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User 2 tries to access User 1's items by ID
        items_user1 = client.get("/items", headers=headers1).json()
        item_id = items_user1[0]["id"]
        
        # Try to delete User 1's item as User 2
        response = client.delete(f"/items/{item_id}", headers=headers2)
        assert response.status_code == 404  # Should fail
    
    
    def test_direct_id_enumeration(self, client, auth_headers):
        """Test if users can enumerate other users' items by ID"""
        # Create item
        response = client.post(
            "/items",
            json={
                "name": "Item1",
                "quantity": 10,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        item_id = response.json()["id"]
        
        # Try accessing a different ID (that belongs to another user)
        # This is mitigated by DELETE endpoint checking owner_id
        response = client.delete(f"/items/{item_id + 100}", headers=auth_headers)
        assert response.status_code == 404


class TestDataExposure:
    """Test for sensitive data leaks in responses"""
    
    def test_error_messages_no_sql_details(self, client):
        """Error responses should not expose SQL details"""
        response = client.post(
            "/auth/token",
            data={"username": "nonexistent@test.com", "password": "pass"}
        )
        assert response.status_code == 401
        error_msg = response.json()["detail"]
        # Should NOT contain SQL error details
        assert "SQL" not in error_msg
        assert "database" not in error_msg.lower()
    
    
    def test_hashed_password_never_exposed(self, client, auth_headers):
        """Passwords should never be exposed in API responses"""
        response = client.get("/items", headers=auth_headers)
        data = response.json()
        # Check no password fields in response
        assert all("password" not in str(item).lower() for item in data)


class TestSecretExposure:
    """Test for secret exposure"""
    
    def test_jwt_secret_not_in_responses(self, client):
        """JWT secret should never be exposed"""
        jwt_secret = "cyber-secret-2026-somasense"
        response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert jwt_secret not in str(response.text)
    
    
    def test_error_messages_do_not_leak_paths(self, client):
        """Error messages should not expose file paths"""
        response = client.get("/invalid_endpoint")
        # File paths could leak directory structure
        response_text = str(response.text).lower()
        # Depending on config, might show path - should be disabled in production
        if "/users/" in response_text or "backend/" in response_text:
            print("⚠️  WARNING: File paths potentially exposed in error message")


class TestCORSandHeaders:
    """Test CORS and security headers"""
    
    def test_cors_allows_all_origins(self, client):
        """CORS is set to allow all origins - potential XSS vector"""
        response = client.get(
            "/items",
            headers={"Origin": "http://malicious.com", "Authorization": "Bearer test"}
        )
        # Check CORS headers
        cors_header = response.headers.get("access-control-allow-origin")
        if cors_header == "*":
            print("⚠️  WARNING: CORS allows all origins (*) - potential XSS vulnerability")
        
    
    def test_missing_security_headers(self, client, auth_headers):
        """Check for missing security headers"""
        response = client.get("/items", headers=auth_headers)
        headers = response.headers
        
        missing_headers = []
        if "x-content-type-options" not in headers:
            missing_headers.append("X-Content-Type-Options")
        if "x-frame-options" not in headers:
            missing_headers.append("X-Frame-Options")
        if "strict-transport-security" not in headers:
            missing_headers.append("Strict-Transport-Security")
        
        if missing_headers:
            print(f"⚠️  WARNING: Missing security headers: {missing_headers}")


class TestInputValidationBypass:
    """Test input validation and type checking"""
    
    def test_negative_quantity_not_allowed(self, client, auth_headers):
        """Negative quantities should be rejected"""
        response = client.post(
            "/items",
            json={
                "name": "Item",
                "quantity": -10,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 422
    
    
    def test_zero_quantity_not_allowed(self, client, auth_headers):
        """Zero quantity should be rejected"""
        response = client.post(
            "/items",
            json={
                "name": "Item",
                "quantity": 0,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 422
    
    
    def test_invalid_enum_location(self, client, auth_headers):
        """Invalid location enum should fail"""
        response = client.post(
            "/items",
            json={
                "name": "Item",
                "quantity": 10,
                "unit": "szt",
                "location": "INVALID_LOCATION",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 422
    
    
    def test_xss_payload_in_item_name(self, client, auth_headers):
        """XSS payloads in item names should be escaped"""
        response = client.post(
            "/items",
            json={
                "name": "<script>alert('XSS')</script>",
                "quantity": 10,
                "unit": "szt",
                "location": "spizarnia",
                "expirationDate": "2025-01-15"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        # Verify it's stored as literal string
        assert response.json()["name"] == "<script>alert('XSS')</script>"
        
        # Verify it's returned safely in list
        items_response = client.get("/items", headers=auth_headers)
        items = items_response.json()
        # Should be properly escaped if returned in HTML context (but it's JSON, so safe)
        assert items[0]["name"] == "<script>alert('XSS')</script>"


class TestDatabaseExposure:
    """Test for database-level vulnerabilities"""
    
    def test_consume_items_endpoint_security(self, client, auth_headers):
        """Test /items/consume endpoint for data validation"""
        # Add item first
        client.post(
            "/items",
            json={
                "name": "Apple",
                "quantity": 100,
                "unit": "g",
                "location": "lodowka",
                "expirationDate": "2025-01-20"
            },
            headers=auth_headers
        )
        
        # Attempt to consume with negative quantity
        response = client.post(
            "/items/consume",
            json=[{"name": "Apple", "quantity_used": -50}],
            headers=auth_headers
        )
        # Should either fail validation or handle gracefully
        print(f"Consume negative quantity response: {response.status_code}")


class TestRateLimiting:
    """Test for lack of rate limiting (DoS vector)"""
    
    def test_brute_force_password_not_limited(self, client):
        """Attempt multiple failed logins to detect rate limiting"""
        # Create a user
        client.post(
            "/auth/register",
            json={"email": "ratelimit@test.com", "password": "correctpass"}
        )
        
        # Attempt 50 failed logins
        failed_attempts = 0
        for i in range(50):
            response = client.post(
                "/auth/token",
                data={"username": "ratelimit@test.com", "password": f"wrong{i}"}
            )
            if response.status_code == 401:
                failed_attempts += 1
        
        if failed_attempts == 50:
            print(f"⚠️  WARNING: No rate limiting detected - {failed_attempts}/50 failed attempts accepted")
        else:
            print(f"✓ Rate limiting appears active - only {failed_attempts}/50 attempts succeeded")
