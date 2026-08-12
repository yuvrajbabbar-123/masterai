from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def now_utc():
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    age_confirmed: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"
    age_confirmed: bool = True
    learning_level: str = "Beginner"
    plan: str = "Free"
    xp: int = 0
    streak: int = 0
    last_active: Optional[str] = None
    vocab_points: int = 0
    badges: List[str] = []
    created_at: str = Field(default_factory=lambda: now_utc().isoformat())


# ---------- AI requests ----------
class CourseRequest(BaseModel):
    topic: str
    level: Optional[str] = None


class AskRequest(BaseModel):
    question: str
    level: Optional[str] = None


class QuizRequest(BaseModel):
    topic: str
    level: Optional[str] = None


class GradeShortRequest(BaseModel):
    question: str
    answer: str
    rubric: str


class GradeSentenceRequest(BaseModel):
    word: str
    sentence: str


# ---------- Attempts / gamification ----------
class AttemptRequest(BaseModel):
    mode: str                       # typing_practice | learn | ask | word_of_day | quiz | revision
    wpm: float = 0
    accuracy: float = 0
    chars: int = 0
    concept: Optional[str] = None
    subject: Optional[str] = None
    passed: bool = True


class LevelUpdate(BaseModel):
    learning_level: str
