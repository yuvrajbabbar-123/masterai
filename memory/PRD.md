# MasterAI — PRD & Build Log

**Mission:** Learn with AI. Master without it.
**Core insight:** People retain what they physically type, not what they paste. Every AI answer becomes a monkeytype-style typing rep.

## Original Problem Statement
"I need this website based on monkeytyping.com but with extra AI features, design it simple and attractive." Source: uploaded PRD "MasterAI". PRD stack was Next.js/Gemini/Razorpay; adapted to the platform stack below on user's "use best judgment".

## Architecture
- Frontend: React 19 (CRA/craco) + Tailwind + shadcn/ui + Phosphor icons + framer + sonner
- Backend: FastAPI (all routes under /api), MongoDB (motor)
- AI: Google Gemini 3 Flash via emergentintegrations (EMERGENT_LLM_KEY)
- Auth: JWT email/password + Emergent Google OAuth (unified get_current_user: Bearer JWT or session cookie)
- Design: Dark "Swiss Brutalist / Terminal" — JetBrains Mono typing core, Cabinet Grotesk headings, yellow #EAB308 accent

## User Personas
College students, competitive-exam aspirants, language learners, upskilling professionals (13+).

## Core Requirement (static)
Shared Type-Over engine: display exact source text greyed out → capture keystrokes → live char-level diff (correct/incorrect/pending) → score WPM + accuracy → emit attempt → XP/streak/badges/struggled-concepts. Two AI-graded free-composition exceptions: quiz short-answers and Word-of-the-Day own-sentence.

## Implemented (2026-06 / build 1)
- Auth: register (13+ age gate), login, Google OAuth callback, /auth/me, logout — WORKING
- TypeOverEngine.jsx: window-keydown capture, per-char span diff, gliding caret, live WPM/acc, word-wrap, Zen fade
- Typing Practice (free, words/quote, restart) — WORKING
- Learn from Scratch: AI course (modules→lessons→type-over blocks) + CourseView stepper — WORKING
- Ask AI: answer as type-over block (not chat) — WORKING
- Test Yourself: 4 MCQ + 2 AI-graded short answers — WORKING
- Word of the Day: word/meaning → 3 example type-overs → own sentence AI-graded (3 attempts) — WORKING
- Profile: XP/streak/WPM/acc stats, badges, struggled concepts, per-subject progress, Learning Level selector (locked levels toast for Free) — WORKING
- Leaderboard: XP + Speed boards — WORKING
- Subscription: AI-usage %, Free vs Pro comparison, upgrade CTA (payments deferred/UI-only) — WORKING
- Credit ledger + Free/Pro monthly fair-usage limits enforced — WORKING
- Gamification: XP, streak, milestone badges, attempt_completed event

## Backlog (not yet built)
- P1: Learn from Documents (PDF/DOCX/TXT upload → parse → AI chunk → type-over) — DONE 2026-06 (build 2)
- P1: Image/scanned-doc OCR upload (Gemini vision) — not yet
- P1: Write & Remember (spaced revision of covered concepts)
- P1: Streaming token-by-token generation into the type-over box
- P2: Razorpay/Stripe real payments; Study Groups + shared streak challenges
- P2: Certification/shareable badges; notifications (FCM); PostHog analytics
- P2: Timed Activity screen with countdown + AI Coach post-submit feedback

## Build 4 (2026-08) — 5 UX features + AI hardening
- Learn from Scratch: "Learn More" button on completion generates a DEEPER next course (known_concepts continuation) = infinity loop; Restart + Test Yourself retained. Fixed stale-step bug via key={courseId} on LessonRunner.
- Ask AI: after typing the answer, two CTAs — "🔥 One More Round" (re-type same answer) and "😌 I'm Good for Today" (reset).
- Word of the Day: auto daily word (now cached per-day in db.word_of_day, no credit burn) + own-word lookup (/ai/word-lookup).
- Spacebar acts as next/try-again/continue on all result & completion screens.
- Learn from Documents: now accepts image uploads (JPG/PNG) OCR'd via Gemini vision (ai_service.ocr_image).
- AI robustness: AIError type + retry/backoff in ai_service._post_gemini; sanitised error messages (no provider URL/model leaked); credits consumed only AFTER successful generation (check_limit before, consume after) so failures never burn quota.

## Integrations (current)
- LLM: user's OWN Google Gemini key (gemini-3-flash-preview) via direct REST, key sent as x-goog-api-key header (not logged). NOTE: free-tier Gemini keys cap ~20 requests/day.
- DB: user's MongoDB Atlas cluster masterai.un9wvnh.mongodb.net (migrated from local; DB_NAME=test_database).

## Build 5 (2026-08) — Chat tool + course stages + default landing
- Ask AI rebuilt as a ChatGPT-style tool: multi-turn context, Markdown-rendered replies, per-message copy, New chat + History (threads persisted in db.chat_threads). Endpoints: POST /chat, GET /chat/threads, GET/DELETE /chat/threads/{id}; ai_service.chat_reply. Free "ask" limit raised to 200/mo.
- Ask AI is now the FIRST nav item and the default landing route ("/", "*", login, AuthCallback, manifest start_url all -> /app/ask).
- Learn from Scratch "Your Courses": stage badge (Stage N; Master crown at stage>=10), delete (AlertDialog confirm; DELETE /courses/{id}), Continue/Redo + Next stage (generates next deeper course in same journey via stage+journey_id). Courses marked completed on finish (POST /courses/{id}/complete); LessonRunner onFinished.

## Test Status
Backend: iteration_9 9/9 pytest pass. Frontend: iterations 1-10 all requested flows pass. Model: gemini-3.6-flash (stable). Note: free-tier Gemini daily quota still applies; app degrades gracefully with sanitised errors + no credit burn.

## Build 6 (2026-06) — Ask AI type-over practice + concise replies + completion emoji
- Ask AI replies now render GREYED-OUT plain text (text-[#737373], data-testid='answer-text'); each answer has a small "Practice" button (data-testid='practice-answer-button') that swaps the answer into the monkeytype TypeOverEngine so the user can type over it; "Close" (stop-practice-button) returns to read mode. AssistantMessage component in AskAI.jsx.
- On finishing a type-over practice, a small 🎉 emoji shows (data-testid='practice-complete-emoji'), emoji only.
- Shared ResultCard (TypingPractice.jsx) now shows a small 🎉 at top (data-testid='completion-emoji') on every task completion (typing, lessons, quizzes).
- Backend chat_reply/CHAT_SYSTEM (ai_service.py) rewritten to answer in simple, plain, concise everyday English (2-4 sentences), NO markdown; server strips * # ` for clean typeable text. Removed react-markdown from Ask AI rendering.
- Verified: testing_agent iteration_10 100% (8/8 frontend checks pass, no bugs).


## Build 3 (2026-06) — Mobile + PWA
- Full mobile responsiveness: hamburger drawer nav (Sheet) on <md, responsive typography/spacing, stacked input rows, no horizontal overflow at 390px.
- Type-Over engine rewritten to a hidden focusable <input> so mobile soft-keyboards appear (desktop typing unchanged) + tap-to-type overlay.
- PWA: public/manifest.json (standalone, start_url /app/typing, 192/512 + apple-touch icons), public/sw.js service worker (network-first navigations, stale-while-revalidate assets, /api bypassed) registered in index.js.
- "Add to Home Screen" InstallPrompt component (beforeinstallprompt + iOS Safari hint, dismissible).
Demo account: demo@masterai.com / demo1234
