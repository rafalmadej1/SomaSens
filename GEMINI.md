# SomaSense

AI-powered fitness application combining pantry inventory, activity tracking, biometric profiles, and locally generated Gemma 4 (`Ollama`) diet, workout, and shopping plans.

## Stack & Structure

- **Backend (`backend/`)**: Python 3.13+, FastAPI, SQLAlchemy 2.x, SQLite (`backend/fitness_app.db`), Ollama (`gemma4`).
- **Frontend (`frontend/`)**: React 19, TypeScript (`strict`), Vite, Tailwind CSS v4 (Ancient Earth + Glassmorphism theme in `frontend/src/index.css`).
- **Tests (`tests/`)**: `pytest` with isolated in-memory SQLite (`tests/conftest.py`).
- **Agent Customizations (`.agents/`)**:
  - `.agents/rules/` — architectural, backend/AI, and frontend rules (`always_on` and `glob`).
  - `.agents/skills/` — step-by-step workflows for verification, local dev, API contracts, security, AI prompts, UI, and domain review.
  - `.agents/agents/` — 6 role-based agents (`pro` for coding/testing roles, `flash` for domain/DevOps).
  - `.agents/hooks.json` — lifecycle hooks.

## Quick Commands (run from repo root)

- Full stack: `./run_app.sh`
- Backend tests: `./.venv/bin/python -m pytest`
- Frontend checks: `npm --prefix frontend run lint && npm --prefix frontend run build`
