---
trigger: glob
globs: "backend/**/*.py, tests/**/*.py"
description: FastAPI, SQLAlchemy, Ollama AI prompt bounds, and pytest conventions for SomaSense backend and tests.
---

# Backend, AI & Testing Rules

- **FastAPI & Database (`backend/`)**:
  - Prefer FastAPI `lifespan` (or Alembic migrations) over import-time schema side effects so importing `backend.main` in tests does not touch `backend/fitness_app.db`.
  - Keep routes synchronous (`def`, not `async def`) when using synchronous SQLAlchemy `Session` and `requests`.
  - Apply SlowAPI `@limiter.limit` to both `/auth/*` and `/ai/*` routes (remember SlowAPI requires the parameter named `request: Request`).
- **Ollama AI & Prompts (`backend/ai_service.py`, `backend/prompts.py`)**:
  - Always use `request.model_dump(exclude_none=True)` before merging profile defaults or formatting prompts so literal `None` values never enter LLM prompts.
  - Keep AI context bounded (`AI_CONTEXT_ITEM_LIMIT = 100` ordered by expiration date, `AI_CONTEXT_ACTIVITY_LIMIT = 30` newest activities).
  - Map `LocalModelError` to HTTP `503` and log failures via `logging`.
  - Do not leave `CONSUMPTION_STRUCTURE` JSON unparsed in user-visible Markdown: either parse/strip it for `/items/consume` or remove it from both prompt and API together.
- **Testing (`tests/`)**:
  - Use `client`, `auth_headers`, and `db_session` from `tests/conftest.py`; mock `backend.ai_service` in endpoint tests and clean up `app.dependency_overrides` on teardown.
  - Every test MUST include real assertions on status codes and response payloads—never write `print()`-only tests. When testing rate limits, explicitly enable `limiter.enabled = True` within the test scope.
