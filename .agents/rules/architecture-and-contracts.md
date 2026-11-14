---
trigger: always_on
description: Core SomaSense architecture, authentication, data scoping, and cross-layer API contract invariants.
---

# SomaSense Architecture & Contracts

- **Working Directory & Env**: Run backend commands and tests from the repository root (`PYTHONPATH` expects root). Runtime auth requires `JWT_SECRET_KEY` (minimum 32 chars); local AI features require a running Ollama instance with `OLLAMA_BASE_URL` and `OLLAMA_MODEL` (configured in root `.env` without committing secrets).
- **Ownership Scoping (`owner_id`)**: Every application record (inventory, activity, profile, generated plan) is scoped by `owner_id`. Protected routes resolve the current user through `backend/auth.py`; every query and mutation MUST preserve the `owner_id` filter.
- **Authentication & Token Lifecycle**:
  - Registration passwords require at least 8 characters and at most 72 UTF-8 bytes; enforce these limits in both API validation and frontend controls.
  - Access tokens expire after 7 days and require `iss`, `aud`, and `jti` claims.
  - `/auth/logout` records the token `jti` in the revocation table; client logout MUST call `/auth/logout` before clearing `somasense_token` from `localStorage`.
- **Pagination Contract**: Inventory and activity endpoints use `limit`/`offset` pagination (default `100`, maximum `250`) and return newest records first. Preserve this contract and avoid unbounded reads.
- **API & Persistence Naming**: Existing schemas intentionally mix casing across resources—keep each contract aligned across Pydantic models (`backend/models.py`, `backend/main.py`), TypeScript (`frontend/src/types.ts`, `frontend/src/api.ts`), and UI components:
  - Pantry: `expirationDate`
  - Activities: `activity_type`, `calories_burned`, `duration_minutes`
  - Profile persistence: `activity_level` (while workout requests use `activityLevel`)
- **Pantry Enum Wire Values**: Backend enums restrict `unit` to `g` or `szt` (`UnitEnum`), and `location` to `lodowka`, `spizarnia`, or `zamrazarka` (`LocationEnum`). Preserve these exact wire values even when UI labels are in English.
