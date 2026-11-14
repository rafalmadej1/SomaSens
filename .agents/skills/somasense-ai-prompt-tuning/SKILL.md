---
name: somasense-ai-prompt-tuning
description: >-
  Modify and validate SomaSense Ollama Gemma 4 prompts, context bounds, and
  structured plan parsing. Use when editing backend/prompts.py,
  backend/ai_service.py, or AI endpoints in backend/main.py.
---

# SomaSense AI Prompt & LLM Integration Workflow

Follow this procedure when updating diet, workout, or shopping generation logic.

## 1. Context Bounds & Data Shaping (`backend/main.py`)

- Keep `/ai/diet` and `/ai/shopping` bounded by `AI_CONTEXT_ITEM_LIMIT` (100 items, ordered by `expirationDate.asc()`, `id.asc()`).
- Keep `/ai/diet` activity context bounded by `AI_CONTEXT_ACTIVITY_LIMIT` (30 newest activities ordered by `id.desc()`).
- Ensure `/ai/workout` merges `UserProfileDB` fields cleanly with `WorkoutRequest` and requires a defined `goal`.

## 2. Prompt & Output Contracts (`backend/prompts.py`)

- Keep `build_diet_prompt` returning Markdown meal plans PLUS the trailing `CONSUMPTION_STRUCTURE` JSON array (`[{"name": "...", "quantity_used": ...}]`) required by pantry consumption logic.
- Keep `build_workout_prompt` explicitly enforcing injury avoidance (`injuries`), equipment matching (`equipment`), and weekly structure.
- Keep `build_shopping_prompt` honoring `days`, `budget`, `avoids`, `preferences`, and optional `workout_plan` Markdown checklist formatting.

## 3. Local Inference Reliability (`backend/ai_service.py`)

- Keep `_generate` targeting `{ollama_base_url}/api/generate` with `stream: False` and `ollama_timeout_seconds`.
- Raise `LocalModelError` for request failures, invalid JSON payloads, or empty responses so `backend/main.py` returns HTTP `503`.
- Persist generated Markdown in `PlanDB` scoped by `owner_id` and `plan_type`.

## 4. Verification

Run the AI service and endpoint test suites (mocked Ollama):

```bash
./.venv/bin/python -m pytest tests/test_ai_service.py tests/test_ai_endpoints.py
```
