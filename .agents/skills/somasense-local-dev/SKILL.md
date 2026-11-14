---
name: somasense-local-dev
description: >-
  Set up and run the SomaSense local development stack (FastAPI backend, Vite
  frontend, and Ollama Gemma 4). Use when the user asks to start, configure,
  or troubleshoot the local environment.
---

# SomaSense Local Development

## Prerequisites

1. Verify Python 3.13+ virtual environment `.venv` exists; if missing, create and install dependencies:
   ```bash
   python3 -m venv .venv
   ./.venv/bin/pip install -r requirements.txt
   ```
2. Verify frontend dependencies exist in `frontend/node_modules`; if missing:
   ```bash
   npm --prefix frontend install
   ```
3. Ensure root `.env` exists (copied from `.env.template`) with a valid `JWT_SECRET_KEY` (at least 32 characters) and Ollama settings (`OLLAMA_BASE_URL`, `OLLAMA_MODEL=gemma4`).
4. For AI endpoints, ensure Ollama is running and the model is pulled:
   ```bash
   ollama pull gemma4
   ```

## Start the Stack

- **Full ecosystem** (FastAPI on port `8000` + Vite on port `5173`):
  ```bash
  ./run_app.sh
  ```
- **Backend standalone**:
  ```bash
  ./.venv/bin/uvicorn backend.main:app --reload --port 8000
  ```
  API docs: `http://127.0.0.1:8000/docs`
- **Frontend standalone**:
  ```bash
  npm --prefix frontend run dev
  ```

## Troubleshooting

- If port `8000` is occupied, `./run_app.sh` exits early; inspect with `lsof -i :8000`.
- Backend imports require the repository root as the working directory.
