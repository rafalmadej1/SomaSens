---
name: somasense-verify
description: >-
  Run backend pytest suites and frontend lint/build checks for SomaSense.
  Use after code changes or before completing a task to verify tests, ESLint,
  and TypeScript/Vite compilation pass.
---

# Verify SomaSense Changes

Follow these steps from the repository root to verify backend and frontend health.

## 1. Backend Tests

Run the full pytest suite using the project virtual environment (or `python3 -m pytest` with test env vars if `.venv` is not used):

```bash
./.venv/bin/python -m pytest
```

To run a single test file or test case:

```bash
./.venv/bin/python -m pytest tests/test_items.py::test_create_item
```

Notes:
- `tests/conftest.py` automatically supplies fallback `JWT_SECRET_KEY` and `ALLOWED_ORIGINS` and uses an in-memory SQLite DB.
- If running outside `.venv` (e.g., CI-like check), ensure `JWT_SECRET_KEY` (>= 32 chars) and `ALLOWED_ORIGINS` are set.

## 2. Frontend Checks

Run ESLint and the TypeScript + Vite production build:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## 3. Validation Checklist

- Confirm all executed pytest cases pass with zero failures.
- Confirm `eslint .` exits 0 with no errors.
- Confirm `tsc -b && vite build` succeeds cleanly.
