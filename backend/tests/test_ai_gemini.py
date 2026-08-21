"""Tests for the direct-Gemini AI integration (ai_service.py provider swap)."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
TIMEOUT = 120


@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    content = p.read_text(encoding="utf-8")
    email = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', content)
    pwd = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', content)
    if not email or not pwd:
        pytest.skip("credentials not parseable")
    return {"email": email.group(1), "password": pwd.group(1)}


@pytest.fixture(scope="session")
def client(test_credentials):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token") or r.json().get("access_token")
    if not token:
        pytest.fail(f"no token in login response: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _ok(r):
    assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"


# ---------- /api/ai/ask ----------
def test_ai_ask(client):
    r = client.post(f"{BASE_URL}/api/ai/ask", json={"question": "Why is the sky blue?"}, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert d["question"] == "Why is the sky blue?"
    ans = d["answer"]
    assert isinstance(ans, str) and len(ans) > 30
    assert "\n" not in ans and "*" not in ans and "#" not in ans
    sentences = [s for s in re.split(r'(?<=[.!?])\s+', ans.strip()) if s]
    assert 1 <= len(sentences) <= 7, f"sentence count {len(sentences)}: {ans}"


# ---------- /api/ai/word-of-day ----------
def test_word_of_day(client):
    r = client.get(f"{BASE_URL}/api/ai/word-of-day", timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    for k in ("word", "part_of_speech", "meaning", "examples"):
        assert k in d, f"missing {k}: {d}"
        assert d[k]
    assert isinstance(d["examples"], list) and len(d["examples"]) == 3, d["examples"]
    assert all(isinstance(e, str) and e.strip() for e in d["examples"])


# ---------- /api/ai/course ----------
def test_ai_course(client):
    r = client.post(f"{BASE_URL}/api/ai/course", json={"topic": "TEST_Photosynthesis basics"}, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert d["title"] and d["description"] and d["subject"]
    assert "_id" not in d
    mods = d["modules"]
    assert isinstance(mods, list) and len(mods) == 3, f"modules={len(mods)}"
    for m in mods:
        assert m["title"]
        assert len(m["lessons"]) == 2, f"lessons={len(m['lessons'])}"
        for les in m["lessons"]:
            assert les["title"] and les["concept"]
            assert isinstance(les["blocks"], list) and 1 <= len(les["blocks"]) <= 2
            assert all(isinstance(b, str) and b.strip() for b in les["blocks"])
    # persistence check
    g = client.get(f"{BASE_URL}/api/courses/{d['course_id']}", timeout=30)
    _ok(g)
    assert g.json()["title"] == d["title"]


# ---------- /api/ai/quiz ----------
def test_ai_quiz(client):
    r = client.post(f"{BASE_URL}/api/ai/quiz", json={"topic": "TEST_Newton's laws"}, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert len(d["mcq"]) == 4, f"mcq={len(d['mcq'])}"
    for q in d["mcq"]:
        assert q["question"]
        assert len(q["options"]) == 4, q["options"]
        assert isinstance(q["correct_index"], int) and 0 <= q["correct_index"] <= 3
    assert len(d["short"]) == 2, f"short={len(d['short'])}"
    for q in d["short"]:
        assert q["question"] and q["rubric"]


# ---------- /api/ai/grade-short ----------
def test_grade_short_pass(client):
    r = client.post(f"{BASE_URL}/api/ai/grade-short", json={
        "question": "What is the capital of France?",
        "answer": "Paris is the capital of France.",
        "rubric": "Answer must state Paris.",
    }, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert isinstance(d["score"], (int, float)) and 0 <= d["score"] <= 100
    assert isinstance(d["passed"], bool)
    assert d["passed"] is True and d["score"] >= 60, d
    assert isinstance(d["feedback"], str) and d["feedback"].strip()


def test_grade_short_fail(client):
    r = client.post(f"{BASE_URL}/api/ai/grade-short", json={
        "question": "What is the capital of France?",
        "answer": "Bananas are yellow.",
        "rubric": "Answer must state Paris.",
    }, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert d["passed"] is False and d["score"] < 60, d


# ---------- /api/ai/grade-sentence ----------
def test_grade_sentence(client):
    r = client.post(f"{BASE_URL}/api/ai/grade-sentence", json={
        "word": "ubiquitous",
        "sentence": "Smartphones have become ubiquitous in modern cities.",
    }, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert 0 <= d["score"] <= 100
    assert d["passed"] is True, d
    assert d["feedback"].strip()


def test_grade_sentence_wrong_usage(client):
    r = client.post(f"{BASE_URL}/api/ai/grade-sentence", json={
        "word": "ubiquitous",
        "sentence": "I ubiquitous the table yesterday blue.",
    }, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert d["passed"] is False, d


# ---------- /api/documents/upload ----------
def test_document_upload_txt(client, tmp_path):
    text = (
        "The water cycle describes how water moves through the environment. "
        "Water evaporates from oceans and lakes, forming water vapour in the atmosphere. "
        "The vapour cools and condenses into clouds. Precipitation returns the water to the surface as rain or snow. "
        "Runoff and groundwater flow carry the water back to rivers and oceans. "
        "Plants also release water vapour through transpiration, adding moisture to the air. "
        "Solar energy drives the entire cycle, and gravity moves the water downhill."
    )
    f = tmp_path / "TEST_watercycle.txt"
    f.write_text(text)
    with f.open("rb") as fh:
        r = client.post(f"{BASE_URL}/api/documents/upload",
                        files={"file": ("TEST_watercycle.txt", fh, "text/plain")}, timeout=TIMEOUT)
    _ok(r)
    d = r.json()
    assert "_id" not in d
    assert d["title"] and d["subject"] and d["document_id"]
    lessons = d["lessons"]
    assert isinstance(lessons, list) and 2 <= len(lessons) <= 6, f"lessons={len(lessons)}"
    for les in lessons:
        assert les["title"] and les["concept"]
        assert isinstance(les["blocks"], list) and 1 <= len(les["blocks"]) <= 2
        assert all(isinstance(b, str) and b.strip() for b in les["blocks"])
    g = client.get(f"{BASE_URL}/api/documents/{d['document_id']}", timeout=30)
    _ok(g)
    assert g.json()["title"] == d["title"]


# ---------- auth guard ----------
def test_ai_requires_auth():
    r = requests.post(f"{BASE_URL}/api/ai/ask", json={"question": "hi"}, timeout=30)
    assert r.status_code in (401, 403), r.status_code
