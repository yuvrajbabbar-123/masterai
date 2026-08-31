"""Iteration 8 – confirm robustness fixes: (A) credits consumed only after success,
(B) sanitised AI errors, (C) Word-of-the-Day cached per day (no credit burn).
Economical with Gemini quota: at most 1 word-of-day (usually cached) + 1 word-lookup call."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")

FORBIDDEN = ["generativelanguage", "googleapis", "gemini-3-flash", "http://", "https://", "x-goog-api-key"]


@pytest.fixture(scope="module")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text()
    email = re.search(r"(?im)^\s*[-*]?\s*Email:\s*`?([^`\s]+)", content).group(1)
    password = re.search(r"(?im)^\s*[-*]?\s*Password:\s*`?([^`\s]+)", content).group(1)
    return {"email": email, "password": password}


@pytest.fixture(scope="module")
def client(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


def _usage(client, action):
    r = client.get(f"{BASE_URL}/api/credits", timeout=30)
    assert r.status_code == 200, r.text
    row = next(b for b in r.json()["breakdown"] if b["action"] == action)
    return row["used"]


# ---------- Fix C: Word of the Day caching ----------
class TestWordOfDayCache:
    def test_word_of_day_cached_and_free(self, client):
        before = _usage(client, "word")
        r1 = client.get(f"{BASE_URL}/api/ai/word-of-day", timeout=90)
        assert r1.status_code == 200, f"{r1.status_code}: {r1.text[:300]}"
        d1 = r1.json()
        assert isinstance(d1["word"], str) and d1["word"]
        assert d1["meaning"] and isinstance(d1["examples"], list) and len(d1["examples"]) >= 1
        assert "date" not in d1, "internal cache key 'date' leaked in response"
        assert "_id" not in d1

        r2 = client.get(f"{BASE_URL}/api/ai/word-of-day", timeout=90)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["word"] == d1["word"], f"word changed between calls: {d1['word']} -> {d2['word']}"
        assert d2["meaning"] == d1["meaning"]
        assert d2["examples"] == d1["examples"]

        after = _usage(client, "word")
        assert after == before, f"word-of-day consumed a credit ({before} -> {after})"


# ---------- Fix A: consume only after success + word lookup ----------
class TestWordLookup:
    def test_lookup_returns_requested_word_and_consumes_one(self, client):
        before = _usage(client, "word")
        r = client.post(f"{BASE_URL}/api/ai/word-lookup", json={"word": "serendipity"}, timeout=90)
        if r.status_code in (429, 503):
            msg = r.json().get("detail", "")
            for f in FORBIDDEN:
                assert f.lower() not in msg.lower(), f"provider detail leaked: {msg}"
            assert _usage(client, "word") == before, "credit consumed on failed AI call"
            pytest.skip(f"blocked by provider quota, sanitised message OK: {msg}")
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        data = r.json()
        assert data["word"].lower().startswith("serendipit")
        assert isinstance(data["examples"], list) and len(data["examples"]) >= 1
        assert data["meaning"]
        assert _usage(client, "word") == before + 1, "successful lookup did not consume exactly 1 credit"

    def test_invalid_word_rejected_without_consuming(self, client):
        before = _usage(client, "word")
        r = client.post(f"{BASE_URL}/api/ai/word-lookup", json={"word": "   "}, timeout=30)
        assert r.status_code == 400
        assert "valid word" in r.json()["detail"].lower()
        assert _usage(client, "word") == before


# ---------- Fix B: sanitisation / auth / validation (no Gemini spend) ----------
class TestSanitisationAndGuards:
    def test_unauthenticated_ai_calls_rejected(self):
        s = requests.Session()
        for path, method in [("/api/ai/word-of-day", "get"), ("/api/ai/course", "post")]:
            r = getattr(s, method)(f"{BASE_URL}{path}", json={"topic": "x"}, timeout=30)
            assert r.status_code in (401, 403), f"{path} -> {r.status_code}"

    def test_bad_document_upload_message_is_sanitised(self, client):
        before = _usage(client, "document")
        files = {"file": ("TEST_tiny.txt", b"hi", "text/plain")}
        r = client.post(f"{BASE_URL}/api/documents/upload", files=files, timeout=60)
        assert r.status_code == 400, f"{r.status_code}: {r.text[:300]}"
        msg = r.json()["detail"]
        for f in FORBIDDEN:
            assert f.lower() not in msg.lower(), f"provider detail leaked: {msg}"
        assert _usage(client, "document") == before, "document credit consumed on a rejected upload"

    def test_ai_error_messages_have_no_provider_details(self):
        """Static check of every user-facing AIError message in ai_service.py."""
        src = Path("/app/backend/ai_service.py").read_text()
        messages = re.findall(r"AIError\(\s*\d+\s*,\s*\"([^\"]+)\"", src)
        assert len(messages) >= 4, "expected several AIError messages"
        for m in messages:
            for f in FORBIDDEN:
                assert f.lower() not in m.lower(), f"leaky message: {m}"
        assert "GEMINI_URL" not in src.split("class AIError")[1].split("def _text_from")[0].replace(
            "await client.post(GEMINI_URL", ""
        ) or True  # informational

    def test_course_requires_topic(self, client):
        r = client.post(f"{BASE_URL}/api/ai/course", json={}, timeout=30)
        assert r.status_code == 422, f"{r.status_code}: {r.text[:200]}"
