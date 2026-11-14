---
name: somasense-api-contract-change
description: >-
  Update a SomaSense API endpoint or data model across SQLAlchemy, FastAPI,
  TypeScript types, API client, UI components, and pytest tests. Use when
  adding or modifying backend routes, request/response fields, or DB schemas.
---

# SomaSense Full-Stack API Contract Change

Use this checklist whenever a backend route, Pydantic schema, or SQLAlchemy model changes so frontend and backend stay synchronized.

## Steps

1. **Database & Schemas (`backend/models.py`)**:
   - Update SQLAlchemy models and Pydantic schemas.
   - Ensure user-owned models keep `owner_id` foreign-key scoping.
   - Preserve existing casing conventions (`expirationDate` for pantry; snake_case for activities/profile; `activityLevel` for workout requests) and `UnitEnum`/`LocationEnum` values.
2. **Routes & Business Logic (`backend/main.py`)**:
   - Enforce `owner_id` filtering on all queries and mutations.
   - Preserve `limit`/`offset` pagination (`default=100`, `max=250`, newest first) on collection endpoints.
   - Keep AI context bounds (max 100 pantry items, 30 newest activities) and `CONSUMPTION_STRUCTURE` JSON output when touching AI endpoints (`backend/ai_service.py`, `backend/prompts.py`).
3. **Frontend Types & Client (`frontend/src/types.ts`, `frontend/src/api.ts`)**:
   - Mirror the updated request/response contract in `frontend/src/types.ts`.
   - Update `frontend/src/api.ts` and consuming React components under `frontend/src/components/`.
4. **Tests (`tests/`)**:
   - Add or update pytest coverage using `client` and `auth_headers` from `tests/conftest.py`.
   - Mock `backend.ai_service` functions instead of calling Ollama.
5. **Verify**:
   - Run backend pytest and frontend `lint` + `build` (see `somasense-verify`).
