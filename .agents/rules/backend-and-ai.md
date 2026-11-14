---
trigger: glob
globs: "backend/**/*.py, tests/**/*.py"
description: FastAPI, SQLAlchemy, Ollama AI prompt bounds, and pytest conventions for SomaSense backend and tests.
---

# Backend & AI Rules

- **FastAPI Surface & DB**:
  - `backend/main.py` owns request models, auth, CRUD routes, AI endpoints, CORS, rate limiting, and security headers, and initializes SQLAlchemy tables at import time via `create_schema()`.
  - `backend/database.py` always targets `backend/fitness_app.db` (`DATABASE_PATH`); do not assume a configurable `DATABASE_URL` without updating database setup and tests.
- **Ollama AI Integration (`backend/ai_service.py`, `backend/prompts.py`)**:
  - `/ai/diet`, `/ai/workout`, and `/ai/shopping` call Ollama via `backend/ai_service.py`, persist results in `PlanDB`, and retrieve the latest saved plan via `/ai/last_plan/{plan_type}`.
  - Generated plans are Markdown strings. Diet prompts (`build_diet_prompt`) MUST require a final `CONSUMPTION_STRUCTURE` JSON code block listing used ingredients and quantities; preserve this format when editing diet prompts or consumption logic.
  - Keep AI context bounded: diet and shopping pass at most 100 pantry items (prioritizing items closest to expiry), and diet additionally sends at most the 30 newest activities.
- **Testing (`tests/`)**:
  - `tests/conftest.py` sets test environment variables, disables the SlowAPI `limiter`, overrides `get_db`, and creates a fresh in-memory SQLite database per test.
  - New endpoint tests MUST use the `client` and `auth_headers` fixtures from `tests/conftest.py` and mock `backend.ai_service` generation functions rather than calling a live Ollama server.
