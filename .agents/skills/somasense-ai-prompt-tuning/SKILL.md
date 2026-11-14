---
name: somasense-ai-prompt-tuning
description: >-
  Modify and validate SomaSense Ollama Gemma 4 prompts, context bounds, and
  structured plan parsing. Use when editing backend/prompts.py,
  backend/ai_service.py, or AI endpoints in backend/main.py.
---

# SomaSense AI Prompt & LLM Integration Workflow

Follow this procedure when updating diet, workout, or shopping generation logic.

## 1. Context Bounds & Clean Input Merging (`backend/main.py`)

- Keep `/ai/diet` and `/ai/shopping` bounded by `AI_CONTEXT_ITEM_LIMIT` (`100` items, ordered by `expirationDate.asc()`, `id.asc()`).
- Keep `/ai/diet` activity context bounded by `AI_CONTEXT_ACTIVITY_LIMIT` (`30` newest activities ordered by `id.desc()`).
- In `/ai/workout`, call `request.model_dump(exclude_none=True)` and use `setdefault` when filling defaults from `UserProfileDB` so explicit request parameters win and `None` literals never appear in prompts.
- Enforce `Field(max_length=..., ge=..., le=...)` and `@limiter.limit` on `/ai/*` routes.

## 2. Prompt & Output Contracts (`backend/prompts.py`)

- Ensure `build_diet_prompt`, `build_workout_prompt`, and `build_shopping_prompt` never interpolate `"None"` into prompt strings.
- If `CONSUMPTION_STRUCTURE` JSON is emitted by `build_diet_prompt`, ensure it is parsed/stripped before rendering Markdown in UI and wired to `/items/consume` (ordered by earliest expiration date across duplicate item batches).

## 3. Local Inference Reliability (`backend/ai_service.py`)

- Keep `_generate` targeting `{ollama_base_url}/api/generate` with `stream: False` and `ollama_timeout_seconds`.
- Raise `LocalModelError` for request failures, invalid JSON payloads, or empty responses, log the warning, and map to HTTP `503`.

## 4. Verification

Add or run unit tests for both prompt builders (`backend/prompts.py`) and AI endpoints:

```bash
./.venv/bin/python -m pytest tests/test_ai_service.py tests/test_ai_endpoints.py
```
