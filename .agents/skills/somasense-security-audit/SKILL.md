---
name: somasense-security-audit
description: >-
  Audit SomaSense authentication, authorization, ownership scoping, JWT
  lifecycle, rate limiting, and input validation. Use when reviewing or
  modifying backend/auth.py, backend/main.py, backend/models.py, or security configs.
---

# SomaSense Security Audit

Run this checklist before finalizing any backend or frontend security-sensitive change.

## 1. Ownership, IDOR & Data Exposure

- Inspect every query, update, and delete on `PantryItemDB`, `ActivityDB`, `UserProfileDB`, and `PlanDB` in `backend/main.py`.
- Confirm each protected endpoint depends on `auth.get_current_user`, filters strictly by `owner_id == current_user.id`, and returns `404` (not `403`) on unauthorized IDs.
- Confirm every route declares an explicit `response_model` so internal columns (`owner_id`, password hashes) cannot leak.

## 2. Authentication & Token Lifecycle (`backend/auth.py`)

- Verify `UserCreate` and `/auth/token` enforce `has_valid_password_length` (`8` chars minimum, `72` UTF-8 bytes maximum) and constant-time dummy hash verification (`DUMMY_PASSWORD_HASH`) for unknown emails.
- Verify `create_access_token` sets `aud`, `exp`, `iat`, `iss`, and unique `jti`, and `get_current_user` rejects tokens recorded in `RevokedTokenDB`.

## 3. Rate Limiting, Input Bounds & XSS

- Confirm SlowAPI `@limiter.limit` protects both `/auth/*` and `/ai/*` endpoints (with `request: Request` parameter).
- Confirm all Pydantic input models enforce `Field(max_length=..., ge=..., le=...)` bounds, especially strings passed into LLM prompts.
- Confirm frontend Markdown rendering (`AIAssistant.tsx`, `Home.tsx`) sanitizes output with `DOMPurify.sanitize(...)` before `dangerouslySetInnerHTML`.
- Confirm `CORSMiddleware` uses `get_settings().cors_origins` without wildcard origins.

## 4. Verification

```bash
./.venv/bin/python -m pytest tests/test_security.py tests/test_auth.py
```
