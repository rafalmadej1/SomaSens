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

1. **Database & Schemas (`backend/models.py`, `backend/main.py`)**:
   - Ensure user-owned models keep `owner_id` foreign-key scoping.
   - Add explicit `Field(max_length=..., ge=..., le=...)` validation bounds and declare a dedicated `*Read` / response schema with `response_model` on the route.
   - Use `snake_case` for all new fields; preserve legacy names (`expirationDate`, `activityLevel`, `g`/`szt`, `lodowka`/`spizarnia`/`zamrazarka`) unless migrating both backend and frontend in the same change.
2. **Routes & Business Logic (`backend/main.py`)**:
   - Enforce `owner_id` filtering on all queries and mutations.
   - Preserve `limit`/`offset` pagination (`default=100`, `max=250`, newest first) on collection endpoints.
3. **Frontend Types & Client (`frontend/src/types.ts`, `frontend/src/api.ts`)**:
   - Mirror the exact request/response contract in `frontend/src/types.ts` (avoid unused or drifted types).
   - Update `frontend/src/api.ts` (including `422` validation error formatting) and consuming components under `frontend/src/components/`.
4. **Tests & Verification (`tests/`)**:
   - Add pytest coverage for happy path, `422` validation bounds, and cross-user `404` IDOR isolation.
   - Run `./.venv/bin/python -m pytest`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build`.
