from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from datetime import datetime, timezone, timedelta, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    RegisterRequest, LoginRequest, GoogleSessionRequest, User,
    CourseRequest, AskRequest, QuizRequest, GradeShortRequest,
    GradeSentenceRequest, AttemptRequest, LevelUpdate, now_utc, new_id,
)
from auth import hash_password, verify_password, create_jwt, make_authenticator
import ai_service
import typing_texts
import document_service

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

get_current_user = make_authenticator(db)

# ---------- Fair usage / plan config ----------
FREE_MONTHLY_LIMITS = {"course": 3, "ask": 10, "quiz": 50, "document": 2, "word": 31}
PRO_MONTHLY_LIMITS = {"course": 100, "ask": 2000, "quiz": 9999, "document": 100, "word": 31}

BADGE_RULES = [
    ("first_steps", "First Steps", 50),
    ("rising_learner", "Rising Learner", 250),
    ("knowledge_seeker", "Knowledge Seeker", 750),
    ("master_typist", "Master Typist", 2000),
]


def public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password", None)
    u.pop("_id", None)
    return u


def month_key() -> str:
    return now_utc().strftime("%Y-%m")


async def get_usage(user_id: str) -> dict:
    doc = await db.usage.find_one({"user_id": user_id, "month": month_key()}, {"_id": 0})
    if not doc:
        doc = {"user_id": user_id, "month": month_key(),
               "course": 0, "ask": 0, "quiz": 0, "document": 0, "word": 0}
        await db.usage.insert_one(dict(doc))
    return doc


async def check_and_consume(user: dict, action: str):
    limits = PRO_MONTHLY_LIMITS if user.get("plan") == "Pro" else FREE_MONTHLY_LIMITS
    usage = await get_usage(user["user_id"])
    used = usage.get(action, 0)
    limit = limits.get(action, 9999)
    if used >= limit:
        raise HTTPException(status_code=402,
                            detail=f"You've reached your {user.get('plan','Free')} plan limit for this feature. Upgrade to Pro for more.")
    await db.usage.update_one(
        {"user_id": user["user_id"], "month": month_key()},
        {"$inc": {action: 1}},
    )
    await db.credit_ledger.insert_one({
        "user_id": user["user_id"], "action": action, "reason": f"AI {action} generation",
        "at": now_utc().isoformat(), "balance_after": limit - used - 1,
    })


# ================= AUTH =================
@api_router.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    if not body.age_confirmed:
        raise HTTPException(status_code=400, detail="You must confirm you are 13 or older.")
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = User(user_id=new_id("user"), email=body.email.lower(), name=body.name,
                auth_provider="email", age_confirmed=True)
    doc = user.model_dump()
    doc["password"] = hash_password(body.password)
    await db.users.insert_one(doc)
    token = create_jwt(user.user_id)
    return {"token": token, "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password") or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_jwt(user["user_id"])
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/google/session")
async def google_session(body: GoogleSessionRequest, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        u = User(user_id=new_id("user"), email=email, name=data.get("name", email),
                 picture=data.get("picture"), auth_provider="google", age_confirmed=True)
        user = u.model_dump()
        await db.users.insert_one(dict(user))
    session_token = data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": session_token,
        "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7 * 24 * 3600)
    return {"token": session_token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return public_user(current)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ================= AI FEATURES =================
@api_router.post("/ai/course")
async def ai_course(body: CourseRequest, current=Depends(get_current_user)):
    await check_and_consume(current, "course")
    level = body.level or current.get("learning_level", "Beginner")
    try:
        data = await ai_service.generate_course(body.topic, level)
    except Exception as e:
        logger.exception("course gen failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    course = {
        "course_id": new_id("course"), "user_id": current["user_id"],
        "topic": body.topic, "level": level, "created_at": now_utc().isoformat(),
        **data,
    }
    await db.courses.insert_one(dict(course))
    course.pop("_id", None)
    return course


@api_router.get("/courses")
async def list_courses(current=Depends(get_current_user)):
    docs = await db.courses.find({"user_id": current["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, current=Depends(get_current_user)):
    doc = await db.courses.find_one({"course_id": course_id, "user_id": current["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    return doc


# ================= LEARN FROM DOCUMENTS =================
@api_router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), current=Depends(get_current_user)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10 MB.")
    try:
        text = document_service.extract_text(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file. Try a different PDF/DOCX/TXT.")
    if len(text) < 40:
        raise HTTPException(status_code=400, detail="Not enough readable text found in this document.")

    # only consume a credit once we know we can process the file
    await check_and_consume(current, "document")
    level = current.get("learning_level", "Beginner")
    try:
        data = await ai_service.chunk_document(text, level, file.filename)
    except Exception as e:
        logger.exception("doc chunk failed")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {e}")

    doc = {
        "document_id": new_id("doc"), "user_id": current["user_id"],
        "filename": file.filename, "level": level, "created_at": now_utc().isoformat(),
        **data,
    }
    await db.documents.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.get("/documents")
async def list_documents(current=Depends(get_current_user)):
    docs = await db.documents.find({"user_id": current["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, current=Depends(get_current_user)):
    doc = await db.documents.find_one({"document_id": document_id, "user_id": current["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@api_router.post("/ai/ask")
async def ai_ask(body: AskRequest, current=Depends(get_current_user)):
    await check_and_consume(current, "ask")
    level = body.level or current.get("learning_level", "Beginner")
    try:
        answer = await ai_service.ask_ai(body.question, level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    return {"question": body.question, "answer": answer}


@api_router.post("/ai/quiz")
async def ai_quiz(body: QuizRequest, current=Depends(get_current_user)):
    await check_and_consume(current, "quiz")
    level = body.level or current.get("learning_level", "Beginner")
    try:
        data = await ai_service.generate_quiz(body.topic, level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    return data


@api_router.post("/ai/grade-short")
async def ai_grade_short(body: GradeShortRequest, current=Depends(get_current_user)):
    try:
        return await ai_service.grade_short(body.question, body.answer, body.rubric)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI grading failed: {e}")


@api_router.get("/ai/word-of-day")
async def ai_word(current=Depends(get_current_user)):
    await check_and_consume(current, "word")
    try:
        return await ai_service.word_of_the_day()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")


@api_router.post("/ai/grade-sentence")
async def ai_grade_sentence(body: GradeSentenceRequest, current=Depends(get_current_user)):
    try:
        return await ai_service.grade_sentence(body.word, body.sentence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI grading failed: {e}")


# ================= TYPING PRACTICE (free) =================
@api_router.get("/typing/random")
async def typing_random(mode: str = "words", count: int = 40):
    if mode == "quote":
        return {"text": typing_texts.random_quote()}
    return {"text": typing_texts.random_words(count)}


# ================= ATTEMPTS / GAMIFICATION =================
def _xp_for(mode: str, accuracy: float, wpm: float, passed: bool) -> int:
    base = {"typing_practice": 10, "learn": 20, "ask": 15, "word_of_day": 25,
            "quiz": 20, "revision": 15}.get(mode, 10)
    acc_bonus = int(accuracy / 10)
    speed_bonus = int(wpm / 10)
    xp = base + acc_bonus + speed_bonus
    return xp if passed else max(5, xp // 3)


@api_router.post("/attempts")
async def create_attempt(body: AttemptRequest, current=Depends(get_current_user)):
    uid = current["user_id"]
    xp_gain = _xp_for(body.mode, body.accuracy, body.wpm, body.passed)

    # streak
    today = date.today().isoformat()
    last = current.get("last_active")
    new_streak = current.get("streak", 0)
    if last != today:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        new_streak = new_streak + 1 if last == yesterday else 1

    attempt = {
        "attempt_id": new_id("att"), "user_id": uid, "mode": body.mode,
        "wpm": body.wpm, "accuracy": body.accuracy, "chars": body.chars,
        "concept": body.concept, "subject": body.subject, "passed": body.passed,
        "xp": xp_gain, "at": now_utc().isoformat(),
    }
    await db.attempts.insert_one(dict(attempt))

    inc = {"xp": xp_gain}
    if body.mode == "word_of_day" and body.passed:
        inc["vocab_points"] = 10

    new_total_xp = current.get("xp", 0) + xp_gain
    earned = [bid for bid, _, thr in BADGE_RULES if new_total_xp >= thr]
    existing_badges = set(current.get("badges", []))
    new_badges = list(existing_badges.union(earned))

    await db.users.update_one(
        {"user_id": uid},
        {"$inc": inc, "$set": {"last_active": today, "streak": new_streak, "badges": new_badges}},
    )

    # struggled concepts tracker
    if body.concept and (not body.passed or body.accuracy < 85):
        await db.struggled.update_one(
            {"user_id": uid, "concept": body.concept},
            {"$inc": {"count": 1}, "$set": {"subject": body.subject, "last_at": now_utc().isoformat()}},
            upsert=True,
        )

    newly = [name for bid, name, thr in BADGE_RULES if bid in earned and bid not in existing_badges]
    return {"xp_gained": xp_gain, "total_xp": new_total_xp, "streak": new_streak,
            "new_badges": newly, "attempt_id": attempt["attempt_id"]}


# ================= PROFILE / STATS =================
@api_router.get("/profile")
async def profile(current=Depends(get_current_user)):
    uid = current["user_id"]
    attempts = await db.attempts.find({"user_id": uid}, {"_id": 0}).sort("at", -1).to_list(1000)
    total = len(attempts)
    avg_wpm = round(sum(a["wpm"] for a in attempts) / total, 1) if total else 0
    avg_acc = round(sum(a["accuracy"] for a in attempts) / total, 1) if total else 0

    subj = {}
    for a in attempts:
        s = a.get("subject") or "General"
        subj.setdefault(s, {"attempts": 0, "acc": 0})
        subj[s]["attempts"] += 1
        subj[s]["acc"] += a["accuracy"]
    per_subject = [{"subject": k, "attempts": v["attempts"],
                    "accuracy": round(v["acc"] / v["attempts"], 1)} for k, v in subj.items()]

    struggled = await db.struggled.find({"user_id": uid}, {"_id": 0}).sort("count", -1).to_list(20)

    badge_map = {bid: name for bid, name, _ in BADGE_RULES}
    badges = [{"id": b, "name": badge_map.get(b, b)} for b in current.get("badges", [])]

    return {
        "user": public_user(current),
        "stats": {"total_attempts": total, "avg_wpm": avg_wpm, "avg_accuracy": avg_acc},
        "per_subject": per_subject,
        "struggled_concepts": struggled,
        "badges": badges,
        "recent": attempts[:10],
    }


@api_router.put("/profile/level")
async def set_level(body: LevelUpdate, current=Depends(get_current_user)):
    if body.learning_level not in ["Beginner", "Intermediate", "Advanced", "Master"]:
        raise HTTPException(status_code=400, detail="Invalid level")
    if current.get("plan") != "Pro" and body.learning_level != "Beginner":
        raise HTTPException(status_code=402, detail="Upgrade to Pro to unlock higher learning levels.")
    await db.users.update_one({"user_id": current["user_id"]},
                              {"$set": {"learning_level": body.learning_level}})
    return {"learning_level": body.learning_level}


@api_router.get("/credits")
async def credits(current=Depends(get_current_user)):
    limits = PRO_MONTHLY_LIMITS if current.get("plan") == "Pro" else FREE_MONTHLY_LIMITS
    usage = await get_usage(current["user_id"])
    total_limit = sum(limits[k] for k in ["course", "ask", "quiz", "document"])
    total_used = sum(usage.get(k, 0) for k in ["course", "ask", "quiz", "document"])
    remaining_pct = max(0, round((1 - total_used / total_limit) * 100)) if total_limit else 100
    breakdown = [{"action": k, "used": usage.get(k, 0), "limit": limits[k]}
                 for k in ["course", "ask", "quiz", "document", "word"]]
    return {"plan": current.get("plan", "Free"), "ai_usage_remaining_pct": remaining_pct,
            "breakdown": breakdown}


@api_router.get("/leaderboard")
async def leaderboard(current=Depends(get_current_user)):
    top_xp = await db.users.find({}, {"_id": 0, "name": 1, "xp": 1, "user_id": 1, "picture": 1}) \
        .sort("xp", -1).to_list(20)
    # speed board from attempts (best avg wpm)
    pipeline = [
        {"$match": {"mode": "typing_practice"}},
        {"$group": {"_id": "$user_id", "avg_wpm": {"$avg": "$wpm"}, "best_wpm": {"$max": "$wpm"}}},
        {"$sort": {"best_wpm": -1}}, {"$limit": 20},
    ]
    speed_raw = await db.attempts.aggregate(pipeline).to_list(20)
    speed = []
    for row in speed_raw:
        u = await db.users.find_one({"user_id": row["_id"]}, {"_id": 0, "name": 1})
        if u:
            speed.append({"name": u["name"], "best_wpm": round(row["best_wpm"], 1),
                          "avg_wpm": round(row["avg_wpm"], 1)})
    return {"xp": top_xp, "speed": speed, "me": current["user_id"]}


@api_router.get("/")
async def root():
    return {"message": "MasterAI API"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
