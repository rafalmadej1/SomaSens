---
trigger: always_on
description: Core SomaSense architecture, authentication, data scoping, and cross-layer API contract invariants.
---

# SomaSense Architecture & Contracts

- **Working Directory & Env**: Run backend commands and tests from the repository root (`PYTHONPATH` expects root). Runtime auth requires `JWT_SECRET_KEY` (minimum 32 chars); local AI features require a running Ollama instance with `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in root `.env` (never commit `.env` or `*.db`).
- **Ownership Scoping (`owner_id`)**: Every user record (inventory, activity, profile, generated plan) is scoped by `owner_id`. Protected routes resolve the current user through `backend/auth.py`; every query and mutation MUST filter by `owner_id` and return `404` when a resource does not belong to the user.
- **Authentication & Token Lifecycle**:
  - Registration passwords require 8 characters minimum and 72 UTF-8 bytes maximum (`has_valid_password_length`).
  - Access tokens validate `iss`, `aud`, `exp`, and `jti` claims; `/auth/logout` revokes `jti` in `RevokedTokenDB`.
- **API Contracts & Validation**:
  - Every endpoint MUST declare an explicit `response_model` (never return raw SQLAlchemy ORM instances that leak `owner_id`).
  - Enforce explicit `Field(max_length=..., ge=..., le=...)` bounds on all user and AI request fields.
  - Inventory and activity list endpoints use `limit`/`offset` pagination (`default=100`, `max=250`, newest first).
- **Legacy Naming & Enum Compatibility**:
  - Existing routes mix casing (`expirationDate` in pantry, `activity_level` in profile vs `activityLevel` in workout request) and use Polish enum wire values (`UnitEnum`: `g`/`szt`; `LocationEnum`: `lodowka`/`spizarnia`/`zamrazarka`).
  - Treat mixed casing as legacy compatibility: keep existing fields synchronized across backend and frontend unless refactoring both sides together, and use `snake_case` for all new API fields.
