"""Iteration 9 - Test ChatGPT-style chat endpoints, course delete, complete, next stage."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://neural-keystroke.preview.emergentagent.com"
API = f"{BASE_URL}/api"

EMAIL = "demo@masterai.com"
PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- Chat endpoints ----
class TestChat:
    thread_id = None

    def test_chat_empty_message_400(self, headers):
        r = requests.post(f"{API}/chat", json={"message": ""}, headers=headers)
        assert r.status_code == 400

    def test_chat_first_message_creates_thread(self, headers):
        r = requests.post(f"{API}/chat", json={"message": "Say hi in one word."}, headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("thread_id", "").startswith("thread_")
        assert isinstance(d.get("reply"), str) and len(d["reply"]) > 0
        TestChat.thread_id = d["thread_id"]

    def test_chat_multi_turn_context(self, headers):
        assert TestChat.thread_id
        r = requests.post(f"{API}/chat", json={
            "thread_id": TestChat.thread_id,
            "message": "What was my previous question about? Answer in <=10 words."
        }, headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["thread_id"] == TestChat.thread_id
        # Loose content check - reply should acknowledge greeting/hi context
        assert isinstance(d.get("reply"), str) and len(d["reply"]) > 0

    def test_list_threads(self, headers):
        r = requests.get(f"{API}/chat/threads", headers=headers)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert any(t["thread_id"] == TestChat.thread_id for t in arr)
        # list endpoint excludes messages
        assert "messages" not in arr[0]

    def test_get_thread_has_messages(self, headers):
        r = requests.get(f"{API}/chat/threads/{TestChat.thread_id}", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["thread_id"] == TestChat.thread_id
        assert len(d["messages"]) >= 4  # 2 user + 2 assistant

    def test_delete_thread(self, headers):
        r = requests.delete(f"{API}/chat/threads/{TestChat.thread_id}", headers=headers)
        assert r.status_code == 200
        # Verify deleted
        r2 = requests.get(f"{API}/chat/threads/{TestChat.thread_id}", headers=headers)
        assert r2.status_code == 404

    def test_chat_requires_auth(self):
        r = requests.post(f"{API}/chat", json={"message": "hi"})
        assert r.status_code in (401, 403)


# ---- Course delete + complete (used by Next stage flow) ----
class TestCourseOps:
    def test_delete_nonexistent_course_404(self, headers):
        r = requests.delete(f"{API}/courses/course_doesnotexist", headers=headers)
        assert r.status_code == 404

    def test_complete_course_idempotent(self, headers):
        # Complete a non-existing id is a no-op (update matches 0)
        r = requests.post(f"{API}/courses/course_ghost/complete", headers=headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True
