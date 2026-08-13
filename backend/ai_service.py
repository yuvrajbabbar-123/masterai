import os
import json
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-3-flash-preview"

LEVEL_GUIDE = {
    "Beginner": "very simple language, short sentences (~12-18 words each), everyday vocabulary.",
    "Intermediate": "clear language, moderate sentences (~18-28 words), some domain terms explained.",
    "Advanced": "precise language, longer sentences (~28-40 words), domain terminology expected.",
    "Master": "dense, expert-level prose, complex sentences, technical vocabulary, no hand-holding.",
}


def _chat(system_message: str, session_id: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _extract_json(text: str):
    text = text.strip()
    # strip markdown fences
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    # grab first {...} or [...] block
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        text = match.group(1)
    return json.loads(text)


async def _ask_json(system: str, prompt: str, session_id: str):
    chat = _chat(system, session_id)
    resp = await chat.send_message(UserMessage(text=prompt))
    if not isinstance(resp, str):
        resp = str(resp)
    return _extract_json(resp)


async def generate_course(topic: str, level: str):
    guide = LEVEL_GUIDE.get(level, LEVEL_GUIDE["Beginner"])
    system = (
        "You are MasterAI, an expert curriculum designer. You output ONLY valid JSON, no prose, no markdown. "
        f"Write all learning content at this level: {guide}"
    )
    prompt = f"""Create a focused micro-course to learn: "{topic}".

Return JSON with EXACTLY this shape:
{{
  "title": "course title",
  "description": "one-sentence description",
  "subject": "short subject/category label",
  "modules": [
    {{
      "title": "module title",
      "lessons": [
        {{
          "title": "lesson title",
          "concept": "the single key concept name (2-4 words)",
          "blocks": ["a paragraph of learning text to be typed", "another paragraph"]
        }}
      ]
    }}
  ]
}}

Rules:
- 3 modules, each with 2 lessons.
- Each lesson has 1-2 blocks. Each block is 1-3 sentences of plain text (this exact text will be typed by the learner, monkeytype-style), so no lists, no markdown, no special characters beyond normal punctuation.
- Content must be accurate and genuinely educational."""
    return await _ask_json(system, prompt, f"course_{topic[:20]}")


async def ask_ai(question: str, level: str) -> str:
    guide = LEVEL_GUIDE.get(level, LEVEL_GUIDE["Beginner"])
    system = (
        "You are MasterAI. Answer the user's question directly and accurately. "
        f"Write at this level: {guide} "
        "Return ONLY the answer as plain prose (2-5 sentences). No markdown, no lists, no headings, "
        "no special characters beyond normal punctuation, because the learner will type your exact words."
    )
    chat = _chat(system, f"ask_{question[:20]}")
    resp = await chat.send_message(UserMessage(text=question))
    if not isinstance(resp, str):
        resp = str(resp)
    # sanitize to typing-friendly text
    resp = resp.replace("\n", " ").replace("*", "").replace("#", "").strip()
    resp = re.sub(r"\s+", " ", resp)
    return resp


async def generate_quiz(topic: str, level: str):
    guide = LEVEL_GUIDE.get(level, LEVEL_GUIDE["Beginner"])
    system = (
        "You are MasterAI, a quiz generator. You output ONLY valid JSON, no prose, no markdown. "
        f"Difficulty level: {guide}"
    )
    prompt = f"""Create a quiz to test understanding of: "{topic}".

Return JSON with EXACTLY this shape:
{{
  "mcq": [
    {{"question": "text", "options": ["a","b","c","d"], "correct_index": 0, "concept": "key concept"}}
  ],
  "short": [
    {{"question": "text", "rubric": "what a correct answer must contain", "concept": "key concept"}}
  ]
}}

Rules: 4 MCQ questions (exactly 4 options each), 2 short-answer questions. Accurate content."""
    return await _ask_json(system, prompt, f"quiz_{topic[:20]}")


async def grade_short(question: str, answer: str, rubric: str):
    system = (
        "You are MasterAI, a fair grader. Output ONLY valid JSON. "
        "Grade the student's short answer against the rubric."
    )
    prompt = f"""Question: {question}
Rubric (what a correct answer needs): {rubric}
Student answer: {answer}

Return JSON: {{"score": 0-100, "passed": true/false, "feedback": "one or two sentences of constructive feedback"}}
passed = true if score >= 60."""
    return await _ask_json(system, prompt, "grade_short")


async def word_of_the_day():
    system = (
        "You are MasterAI vocabulary coach. Output ONLY valid JSON, no markdown. "
        "Pick one interesting, useful English word (intermediate-to-advanced)."
    )
    prompt = """Return JSON with EXACTLY this shape:
{
  "word": "the word",
  "part_of_speech": "noun/verb/adjective/...",
  "meaning": "clear one-sentence definition",
  "examples": ["example sentence 1", "example sentence 2", "example sentence 3"]
}
Each example is a natural sentence using the word. Plain text only, no markdown."""
    return await _ask_json(system, prompt, "word_of_day")


async def chunk_document(text: str, level: str, filename: str):
    guide = LEVEL_GUIDE.get(level, LEVEL_GUIDE["Beginner"])
    system = (
        "You are MasterAI, a study-set builder. You output ONLY valid JSON, no prose, no markdown. "
        f"Target reading level: {guide}"
    )
    prompt = f"""You are given raw text extracted from a document named "{filename}".
Turn it into a type-over study set. Select the most important passages and CLEAN them for typing
(fix broken line breaks, remove page numbers, headers/footers and OCR artefacts), but PRESERVE the
original wording and meaning as closely as possible. Do NOT invent facts not in the document.

Return JSON with EXACTLY this shape:
{{
  "title": "a concise title for this study set",
  "subject": "short subject/category label",
  "lessons": [
    {{
      "title": "lesson title",
      "concept": "the single key concept (2-4 words)",
      "blocks": ["a passage of plain text to be typed", "another passage"]
    }}
  ]
}}

Rules:
- 4 to 6 lessons, each with 1-2 blocks.
- Each block is 1-3 sentences of PLAIN text (it will be typed monkeytype-style), so no lists, no markdown,
  no headings, no special characters beyond normal punctuation.
- If the document is short, produce fewer lessons but at least 2.

Document text:
\"\"\"
{text[:12000]}
\"\"\""""
    return await _ask_json(system, prompt, f"doc_{filename[:20]}")


async def grade_sentence(word: str, sentence: str):
    system = (
        "You are MasterAI vocabulary coach. Output ONLY valid JSON. "
        "Judge whether the student used the target word correctly in their own sentence."
    )
    prompt = f"""Target word: {word}
Student's sentence: {sentence}

Return JSON: {{"score": 0-100, "passed": true/false, "feedback": "one sentence of feedback"}}
passed = true if the word is used correctly and grammatically (score >= 60)."""
    return await _ask_json(system, prompt, "grade_sentence")
