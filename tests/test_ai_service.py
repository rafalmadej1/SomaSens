from unittest.mock import Mock, patch

import pytest
import requests

from backend import ai_service


@patch("backend.ai_service.requests.post")
def test_generate_uses_local_ollama_api(mock_post):
    response = Mock()
    response.json.return_value = {"response": "Generated plan"}
    mock_post.return_value = response

    result = ai_service.generate_diet_plan(
        [{"name": "Rice", "quantity": 100, "unit": "g"}]
    )

    assert result == "Generated plan"
    mock_post.assert_called_once_with(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "gemma4",
            "prompt": mock_post.call_args.kwargs["json"]["prompt"],
            "stream": False,
        },
        timeout=120,
    )


@patch(
    "backend.ai_service.requests.post",
    side_effect=requests.ConnectionError("connection refused"),
)
def test_generate_reports_unavailable_local_model(mock_post):
    with pytest.raises(ai_service.LocalModelError, match="Ensure Ollama is running"):
        ai_service.generate_workout_plan({"goal": "General fitness"})

    mock_post.assert_called_once()
