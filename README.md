# SomaSense

SomaSense is a fitness application that combines pantry inventory, activity tracking, biometric profiles, and Gemini-generated diet, workout, and shopping plans.

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, Google Gen AI
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Authentication:** bcrypt password hashing and JWT bearer tokens

## Setup

Requirements:

- Python 3.13+
- Node.js and npm

Create the Python environment and install backend dependencies:

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Create a root `.env` file from `.env.template` and provide:

```dotenv
GOOGLE_API_KEY=your-google-api-key
JWT_SECRET_KEY=a-unique-random-secret-with-at-least-32-characters
```

`GOOGLE_API_KEY` enables Gemini-backed features. `JWT_SECRET_KEY` is required for the backend to start. `ALLOWED_ORIGINS`, `JWT_ISSUER`, and `JWT_AUDIENCE` may be customized when needed.

## Running locally

Start the full application:

```bash
./run_app.sh
```

This starts FastAPI at `http://127.0.0.1:8000` and Vite on its default port. API documentation is available at `http://127.0.0.1:8000/docs`.

Run each service separately:

```bash
./.venv/bin/uvicorn backend.main:app --reload --port 8000
npm --prefix frontend run dev
```

## Checks

```bash
# All backend tests
./.venv/bin/python -m pytest

# One backend test
./.venv/bin/python -m pytest tests/test_auth.py::test_logout_revokes_access_token

# Frontend lint and production build
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Architecture

`backend/main.py` owns the FastAPI routes for authentication, inventory, activities, profiles, and AI plan generation. SQLAlchemy models in `backend/models.py` persist user-scoped data in `backend/fitness_app.db`.

The React single-page frontend lives in `frontend/src`. `frontend/src/api.ts` is the shared API boundary and persists the bearer token in `localStorage`. Inventory and activity routes paginate with `limit` and `offset`; the UI loads additional records on demand.

Gemini integration in `backend/ai_service.py` generates diet, workout, and shopping plans. Generated plans are saved per user and type, with the most recent plan returned to the frontend. AI context is capped to 100 pantry items and, for diet generation, the 30 newest activities.

## Authentication

Registration accepts passwords from 8 characters up to 72 UTF-8 bytes. Access tokens expire after seven days and validate issuer, audience, and token ID claims. Logging out revokes the current token server-side before the browser clears its local copy.
