---
name: somasense-security-audit
description: >-
  Audit SomaSense authentication, authorization, ownership scoping, JWT
  lifecycle, rate limiting, and input validation. Use when reviewing or
  modifying backend/auth.py, backend/main.py, backend/models.py, or security configs.
---

# SomaSense Security Audit

Run this checklist before finalizing any backend auth, route, or schema change.

## 1. Ownership & IDOR Scoping

- Inspect every query, update, and delete on `PantryItemDB`, `ActivityDB`, `UserProfileDB`, and `PlanDB` in `backend/main.py`.
- Confirm each protected endpoint depends on `auth.get_current_user` and filters strictly by `owner_id == current_user.id`.
- Confirm both root routes and `/api/v1` router mounts preserve identical auth dependencies.

## 2. Authentication & Token Lifecycle (`backend/auth.py`)

- Verify `UserCreate` and `/auth/token` enforce `has_valid_password_length` (`MIN_PASSWORD_LENGTH = 8`, `MAX_PASSWORD_BYTES = 72` UTF-8 bytes).
- Verify `create_access_token` sets `aud`, `exp` (7 days), `iat`, `iss`, and unique `jti`.
- Verify `decode_access_token` validates `audience`, `issuer`, `sub`, and `jti`, and `get_current_user` rejects tokens present in `RevokedTokenDB`.
- Verify `/auth/logout` invokes `auth.revoke_access_token` and prunes expired revocations.

## 3. Surface & Config Hardening (`backend/main.py`, `backend/config.py`)

- Confirm `JWT_SECRET_KEY` requires at least 32 characters and blocks placeholder defaults.
- Confirm `CORSMiddleware` uses `get_settings().cors_origins` (no wildcard `*` with `allow_credentials=True`).
- Confirm SlowAPI `@limiter.limit` decorators remain on `/auth/register` and `/auth/token` and security headers middleware sets `X-Content-Type-Options`, `Strict-Transport-Security`, and `X-Frame-Options`.

## 4. Verification

Run the security and auth pytest suites:

```bash
./.venv/bin/python -m pytest tests/test_security.py tests/test_auth.py
```
