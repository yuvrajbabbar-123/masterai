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

## Test Status
Backend 19/19 pytest passing (all API). Frontend e2e: build 1 all flows, build 2 Learn-from-Documents 5/5, build 3 (mobile + PWA) 7/7. All passing.

## Build 3 (2026-06) — Mobile + PWA
- Full mobile responsiveness: hamburger drawer nav (Sheet) on <md, responsive typography/spacing, stacked input rows, no horizontal overflow at 390px.
- Type-Over engine rewritten to a hidden focusable <input> so mobile soft-keyboards appear (desktop typing unchanged) + tap-to-type overlay.
- PWA: public/manifest.json (standalone, start_url /app/typing, 192/512 + apple-touch icons), public/sw.js service worker (network-first navigations, stale-while-revalidate assets, /api bypassed) registered in index.js.
- "Add to Home Screen" InstallPrompt component (beforeinstallprompt + iOS Safari hint, dismissible).
Demo account: demo@masterai.com / demo1234
