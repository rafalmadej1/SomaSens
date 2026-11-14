---
name: somasense-release-ci-check
description: >-
  Verify SomaSense CI/CD workflows, environment templates, startup scripts, and
  secret/database hygiene before release or infra changes. Use when modifying
  .github/workflows/ci.yml, run_app.sh, .env.template, .gitignore, or dependencies.
---

# SomaSense Release & CI Readiness Check

Run this workflow when updating CI pipelines, runtime scripts, dependencies, or environment settings.

## 1. Environment & Secrets Hygiene

- Compare `.env.template` against `Settings` in `backend/config.py` (`ollama_base_url`, `ollama_model`, `ollama_timeout_seconds`, `jwt_secret_key`, `jwt_issuer`, `jwt_audience`, `allowed_origins`).
- Confirm `.gitignore` excludes `.env`, `.env.*` (except `!.env.template`), `*.db`, `.venv/`, `frontend/node_modules/`, and `frontend/dist/`.
- Verify `git status` shows no committed `.env` secrets or SQLite database changes unintentionally staged.

## 2. Runtime & Dependency Alignment

- Verify `run_app.sh` checks `.venv/bin/python`, port `8000`, `.env` presence, and `frontend/node_modules`, and cleans up background PIDs on exit.
- Verify `requirements.txt` and `frontend/package-lock.json` match CI runtime versions in `.github/workflows/ci.yml` (Python `3.13`, Node `22`).

## 3. CI-Equivalent Verification

Run backend and frontend checks mirroring `.github/workflows/ci.yml`:

```bash
./.venv/bin/python -m pytest
npm --prefix frontend run lint
npm --prefix frontend run build
```
