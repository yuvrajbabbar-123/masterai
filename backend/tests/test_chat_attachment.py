"""Backend tests for new multipart /api/chat endpoint with attachments."""
import os
import io
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "demo@masterai.com", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestChatMultipart:
    def test_text_only_chat_returns_markdown(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/chat",
            headers=auth_headers,
            data={"message": "In one short paragraph, what is photosynthesis? Use **bold** for key terms."},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data and data["reply"].strip()
        assert "thread_id" in data

    def test_chat_document_attachment(self, auth_headers):
        content = (b"The Pied Piper is a legendary figure from the town of Hamelin. "
                   b"He played a magic flute that led all the rats out of the town. "
                   b"When the townspeople refused to pay him, he led away their children instead.")
        files = {"file": ("piper.txt", io.BytesIO(content), "text/plain")}
        data = {"message": "Summarize the attached file in 1 sentence."}
        r = requests.post(f"{BASE_URL}/api/chat", headers=auth_headers,
                          data=data, files=files, timeout=60)
        assert r.status_code == 200, r.text
        reply = r.json()["reply"].lower()
        # Must reference something from the file
        assert any(w in reply for w in ["piper", "hamelin", "rat", "children", "flute"]), reply

    def test_chat_empty_rejected(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/chat", headers=auth_headers,
                          data={"message": ""}, timeout=30)
        assert r.status_code == 400

    def test_list_threads(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/chat/threads", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
