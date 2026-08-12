"""MasterAI backend API tests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://neural-keystroke.preview.emergentagent.com").rstrip("/")
DEMO_EMAIL = "demo@masterai.com"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["email"] == DEMO_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ---------- AUTH ----------
class TestAuth:
    def test_register_new_user(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@masterai.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pass1234", "name": "Test User", "age_confirmed": True
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email.lower()
        assert "token" in d

    def test_register_requires_age(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@masterai.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pass1234", "name": "T", "age_confirmed": False
        }, timeout=30)
        assert r.status_code == 400

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_login_demo(self, demo_token):
        assert demo_token

    def test_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code in (401, 403)


# ---------- TYPING ----------
class TestTyping:
    def test_random_words(self):
        r = requests.get(f"{BASE_URL}/api/typing/random?mode=words&count=20", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json().get("text"), str) and len(r.json()["text"]) > 0

    def test_random_quote(self):
        r = requests.get(f"{BASE_URL}/api/typing/random?mode=quote", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["text"]) > 0


# ---------- AI ----------
class TestAI:
    def test_ai_ask(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/ai/ask",
                          json={"question": "What is photosynthesis?"},
                          headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("answer"), str) and len(d["answer"]) > 20

    def test_ai_word_of_day(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/ai/word-of-day", headers=auth_headers, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "word" in d and "meaning" in d
        # examples
        assert "examples" in d and isinstance(d["examples"], list)

    def test_ai_quiz(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/ai/quiz",
                          json={"topic": "Basic algebra"}, headers=auth_headers, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "mcq" in d and "short" in d
        assert len(d["mcq"]) >= 1

    def test_ai_grade_short(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/ai/grade-short", json={
            "question": "What is 2+2?", "answer": "4", "rubric": "Expects 4"
        }, headers=auth_headers, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "score" in d

    def test_ai_grade_sentence(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/ai/grade-sentence", json={
            "word": "ephemeral", "sentence": "The rainbow was ephemeral, fading in minutes."
        }, headers=auth_headers, timeout=60)
        assert r.status_code == 200

    def test_ai_course(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/ai/course",
                          json={"topic": "Introduction to Python variables"},
                          headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "course_id" in d
        assert "modules" in d and len(d["modules"]) >= 1
        # Verify persisted
        r2 = requests.get(f"{BASE_URL}/api/courses/{d['course_id']}", headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["course_id"] == d["course_id"]


# ---------- ATTEMPTS / PROFILE ----------
class TestAttemptsProfile:
    def test_create_attempt_and_profile(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/attempts", json={
            "mode": "typing_practice", "wpm": 55.0, "accuracy": 96.0,
            "chars": 200, "passed": True, "concept": None, "subject": "Typing"
        }, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["xp_gained"] > 0
        assert "total_xp" in d and "streak" in d

        p = requests.get(f"{BASE_URL}/api/profile", headers=auth_headers, timeout=30)
        assert p.status_code == 200
        pd = p.json()
        assert "stats" in pd and "badges" in pd and "per_subject" in pd

    def test_set_level_free_locked(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/profile/level",
                         json={"learning_level": "Advanced"}, headers=auth_headers, timeout=30)
        assert r.status_code == 402

    def test_set_level_beginner_ok(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/profile/level",
                         json={"learning_level": "Beginner"}, headers=auth_headers, timeout=30)
        assert r.status_code == 200


# ---------- CREDITS / LEADERBOARD ----------
class TestMisc:
    def test_credits(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/credits", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "plan" in d and "ai_usage_remaining_pct" in d and "breakdown" in d

    def test_leaderboard(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/leaderboard", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "xp" in d and "speed" in d
