---
name: somasense-test-authoring
description: >-
  Write isolated pytest integration and security tests for SomaSense endpoints
  and services. Use when adding test coverage under tests/ for new routes,
  ownership rules, validation bounds, or AI behaviors.
---

# SomaSense Test Authoring

Follow these conventions when writing or updating tests in `tests/`.

## 1. Fixtures & Test Harness (`tests/conftest.py`)

- Use `client`, `auth_headers`, `test_user_token`, and `db_session` from `tests/conftest.py` (do not build standalone database engines unless testing DB initialization directly).
- Rely on `tests/conftest.py` defaults for `JWT_SECRET_KEY`, `ALLOWED_ORIGINS`, in-memory SQLite (`StaticPool`), and disabled `limiter`.

## 2. Required Test Categories

- **Happy Path & Validation**: Test valid payloads, boundary checks (e.g., `limit`/`offset` max `250`, password 8 chars–72 bytes, `UnitEnum`/`LocationEnum`), and HTTP status codes.
- **Ownership / IDOR Isolation**: Register a second user and verify user B cannot read, modify, consume, or delete user A's pantry items, activities, profiles, or saved plans.
- **Security Markers**: Mark penetration/security-focused tests with `@pytest.mark.security` as defined in `pytest.ini`.
- **AI Mocking**: Patch `backend.ai_service.generate_diet_plan`, `generate_workout_plan`, `generate_shopping_list`, or `requests.post` (`_generate`) rather than requiring a running Ollama instance.

## 3. Verification

Run targeted tests and the full suite:

```bash
./.venv/bin/python -m pytest <test_file_or_node>
./.venv/bin/python -m pytest
```
