import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from app.routers.assessment import _verify_internal_key
from app.config import settings


def test_verify_internal_key_fails_closed_when_key_unconfigured(monkeypatch):
    """When backend_api_key is None or empty, must raise 503."""
    monkeypatch.setattr(settings, "backend_api_key", None)
    mock_request = MagicMock()
    mock_request.headers.get.return_value = "some-key"

    with pytest.raises(HTTPException) as exc_info:
        _verify_internal_key(mock_request)
    assert exc_info.value.status_code == 503
    assert "not configured" in exc_info.value.detail


def test_verify_internal_key_rejects_missing_header(monkeypatch):
    """When X-Internal-Key header is missing, must raise 403."""
    monkeypatch.setattr(settings, "backend_api_key", "secret-key-12345")
    mock_request = MagicMock()
    mock_request.headers.get.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        _verify_internal_key(mock_request)
    assert exc_info.value.status_code == 403
    assert "Invalid or missing" in exc_info.value.detail


def test_verify_internal_key_rejects_wrong_header(monkeypatch):
    """When X-Internal-Key header is wrong, must raise 403."""
    monkeypatch.setattr(settings, "backend_api_key", "secret-key-12345")
    mock_request = MagicMock()
    mock_request.headers.get.return_value = "wrong-key"

    with pytest.raises(HTTPException) as exc_info:
        _verify_internal_key(mock_request)
    assert exc_info.value.status_code == 403
    assert "Invalid or missing" in exc_info.value.detail


def test_verify_internal_key_accepts_valid_header(monkeypatch):
    """When X-Internal-Key matches backend_api_key, should succeed without exception."""
    monkeypatch.setattr(settings, "backend_api_key", "secret-key-12345")
    mock_request = MagicMock()
    mock_request.headers.get.return_value = "secret-key-12345"

    # Should not raise
    _verify_internal_key(mock_request)
