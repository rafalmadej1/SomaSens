from typing import List, Optional

import requests

from backend.config import get_settings
from backend.prompts import (
    build_diet_prompt,
    build_shopping_prompt,
    build_workout_prompt,
)

class LocalModelError(RuntimeError):
    """Raised when the local Ollama model cannot generate a response."""


def _generate(prompt: str) -> str:
    settings = get_settings()
    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/generate"

    try:
        response = requests.post(
            endpoint,
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
            },
            timeout=settings.ollama_timeout_seconds,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise LocalModelError(
            f"Local model is unavailable at {endpoint}. Ensure Ollama is running and "
            f"the '{settings.ollama_model}' model is installed."
        ) from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise LocalModelError("Local model returned an invalid response.") from exc

    if not isinstance(payload, dict):
        raise LocalModelError("Local model returned an invalid response.")

    content = payload.get("response")
    if not isinstance(content, str) or not content.strip():
        raise LocalModelError("Local model returned an empty response.")

    return content


def generate_diet_plan(pantry_items: List[dict], activities: Optional[List[dict]] = None, profile_context: str = "") -> str:
    """Generates a nutrition plan based on available products."""
    prompt = build_diet_prompt(pantry_items, activities, profile_context)
    return _generate(prompt)


def generate_workout_plan(user_data: dict) -> str:
    """Generates a training plan based on user data."""
    prompt = build_workout_prompt(user_data)
    return _generate(prompt)


def generate_shopping_list(
    pantry_items: List[dict], 
    workout_plan: Optional[str] = None,
    days: int = 7,
    budget: Optional[float] = None,
    avoids: Optional[str] = None,
    preferences: Optional[str] = None
) -> str:
    """Generates a shopping list based on inventory and workout plan."""
    prompt = build_shopping_prompt(
        pantry_items, workout_plan, days, budget, avoids, preferences
    )
    return _generate(prompt)
