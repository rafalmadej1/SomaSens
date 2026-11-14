---
name: somasense-test-authoring
description: >-
  Write isolated pytest integration and security tests for SomaSense endpoints
  and services. Use when adding test coverage under tests/ for new routes,
  ownership rules, validation bounds, or AI behaviors.
---

# SomaSense Test Authoring

Follow these conventions when writing or updating tests in `tests/`.

## 1. Fixtures & Deterministic Isolation (`tests/conftest.py`)

- Use `client`, `auth_headers`, `test_user_token`, and `db_session` from `tests/conftest.py`.
- Force deterministic test environment settings (do not let local `.env` overrides break assertions on default `OLLAMA_MODEL` or timeouts) and clear `app.dependency_overrides` and `get_settings.cache_clear()` on teardown.

## 2. Strict Assertion Standards

- **No Assertion-Free Tests**: Every test MUST assert exact HTTP status codes and response payload structures—never write tests that only call `print()`.
- **Rate Limit Tests**: Because `tests/conftest.py` sets `limiter.enabled = False` globally, any rate-limit test MUST temporarily enable `limiter.enabled = True` (and restore `False` in `finally`).
- **Ownership / IDOR Isolation**: Register a second user and assert `404` when user B accesses, modifies, consumes, or deletes user A's resources.
- **Prompt & AI Tests**: Write direct unit tests on `build_diet_prompt`, `build_workout_prompt`, and `build_shopping_prompt` (asserting `"None"` is never present) in addition to mocked `backend.ai_service` endpoint tests.

## 3. Verification

```bash
./.venv/bin/python -m pytest <test_file_or_node>
./.venv/bin/python -m pytest
```
