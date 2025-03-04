import pytest
from fastapi.testclient import TestClient
from main import app
import io

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200

def test_transcribe_no_file():
    response = client.post("/transcribe/")
    assert response.status_code == 422
    assert "detail" in response.json()

def test_transcribe_empty_file():
    files = {"audio_file": ("empty.wav", b"", "audio/wav")}
    response = client.post("/transcribe/", files=files)
    assert response.status_code == 400
    assert "Empty audio content" in response.json()["detail"]

def test_transcribe_invalid_format():
    files = {"audio_file": ("test.txt", b"test content", "text/plain")}
    response = client.post("/transcribe/", files=files)
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]

def test_transcribe_large_file():
    large_content = b"0" * (10 * 1024 * 1024 + 1)
    files = {"audio_file": ("large.wav", large_content, "audio/wav")}
    response = client.post("/transcribe/", files=files)
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]