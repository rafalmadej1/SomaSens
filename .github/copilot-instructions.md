# SomaSense Copilot Instructions

## Commands

- Start the full local stack (FastAPI on port 8000 and Vite):
  ```bash
  ./run_app.sh
  ```
- Start only the backend:
  ```bash
  ./env/bin/uvicorn backend.main:app --reload --port 8000
  ```
- Run all backend tests:
  ```bash
  ./env/bin/pytest
  ```
- Run one backend test:
  ```bash
  ./env/bin/pytest tests/test_items.py::test_create_item
  ```
- Run the frontend checks from `frontend/`:
  ```bash
  npm run lint
  npm run build
  ```

The backend imports require the repository root as the working directory. Runtime authentication requires `JWT_SECRET_KEY`; Gemini-backed features additionally use `GOOGLE_API_KEY`. Configure local values in the root `.env` without committing secrets.

## Architecture

- `backend/main.py` is the complete FastAPI surface: request models, auth, CRUD endpoints, AI endpoints, CORS/rate limiting, and security headers all live there. It initializes SQLAlchemy tables at import time.
- `backend/models.py` defines user-owned inventory, activity, profile, and generated-plan records. `backend/database.py` always stores the production SQLite database at `backend/fitness_app.db`, not a configurable `DATABASE_URL`.
- Every application record is scoped by `owner_id`. Protected routes resolve the current user through `backend/auth.py`; queries and mutations must preserve that ownership filter.
- Access tokens use a seven-day lifetime and require `iss`, `aud`, and `jti` claims. `/auth/logout` stores the token ID in the revocation table; browser logout must call this endpoint before clearing `somasense_token`.
- The Gemini integration in `backend/ai_service.py` is called by `/ai/diet`, `/ai/workout`, and `/ai/shopping`. Each generated result is stored as a `PlanDB` row and retrieved by `/ai/last_plan/{plan_type}`.
- The React single-page app switches views in `frontend/src/App.tsx`. `frontend/src/api.ts` is the shared browser-to-API boundary: it targets `http://127.0.0.1:8000`, persists the JWT in `localStorage` under `somasense_token`, and handles unauthorized responses. Keep endpoint changes synchronized with this client and the consuming component.
- Inventory and activity endpoints use `limit`/`offset` pagination (default 100, maximum 250) and return newest records first. The collection views append pages through their “Load More” controls; preserve this pagination contract instead of adding unbounded reads.
- The AI assistant loads persisted diet/workout/shopping plans on mount. Diet generation draws on pantry, activities, and profile; workout input is supplemented by profile fields; shopping can receive the current workout plan.

## Repository Conventions

- API schemas and persistence names are intentionally mixed: pantry uses `expirationDate`; activities use snake case (`activity_type`, `calories_burned`, `duration_minutes`); profile persistence uses `activity_level`, while workout requests use `activityLevel`. Extend each existing API contract consistently across Pydantic models, `api.ts`, TypeScript types, and components.
- Pantry values are constrained by the backend enums: units are `g` or `szt`; locations are `lodowka`, `spizarnia`, and `zamrazarka`. Preserve these wire values even when UI labels are English.
- Generated plans are Markdown strings. Diet prompts require a final `CONSUMPTION_STRUCTURE` JSON code block; preserve this format when changing diet prompting or consumption behavior.
- Diet and shopping generation pass at most 100 pantry items to Gemini; diet additionally sends the 30 newest activities. Keep future AI context bounded and prioritize records closest to expiry or most recent activity.
- Frontend styling uses Tailwind v4 tokens and shared `glass-panel`/`glass-card` utilities in `frontend/src/index.css`, with the Soma dark, sand, gold, and terracotta visual system. Reuse them for new UI rather than introducing a separate theme.
- Backend tests use `tests/conftest.py` to set test environment variables, override `get_db`, and create a fresh in-memory SQLite database per test. Endpoint tests should use its `client` and `auth_headers` fixtures; mock `backend.ai_service` generation functions rather than making Gemini calls.
- Registration passwords require at least 8 characters and no more than 72 UTF-8 bytes. Preserve those limits in frontend controls and API validation.
