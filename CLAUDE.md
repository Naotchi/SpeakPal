# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Start the full stack (canonical dev environment):**
```bash
docker compose up --build
```
Backend hot-reloads on file changes (`--reload`). Frontend uses Next.js HMR.

**Backend tests:**
```bash
docker compose exec backend pytest                        # all tests
docker compose exec backend pytest tests/test_chat_router.py  # single file
```
`asyncio_mode = auto` is set in `pytest.ini` — no explicit `@pytest.mark.asyncio` needed.

**Frontend lint:**
```bash
docker compose exec frontend npm run lint
```

**Restart a single service:**
```bash
docker compose restart backend
docker compose restart frontend
```

**Exec into containers:**
```bash
docker compose exec backend bash
docker compose exec frontend npm install <pkg>
```

## Architecture

Monorepo with two Docker services: `backend/` (FastAPI) and `frontend/` (Next.js). No database. No auth.

### Request flow

```
Browser (MediaRecorder webm/opus)
  → POST /api/chat/stream  (multipart: audio + history JSON + persona)
  → Backend: ffmpeg webm→16k WAV → Azure STT REST → Azure OpenAI stream → Azure TTS SDK
  → SSE stream back to browser
  → Frontend: audio chunks queued and played sequentially
```

There is also a non-streaming `POST /api/chat` (same pipeline, returns JSON) and `POST /api/translate` (Japanese STT → OpenAI translation → TTS).

### Backend (`backend/app/`)

- `main.py` — FastAPI app, CORS (`localhost:3000` only), mounts `chat` router
- `routers/chat.py` — 3 endpoints; `chat_stream` runs LLM and TTS concurrently via two `asyncio.Queue`s
- `services/conversation.py` — Azure OpenAI client (lazy singleton); `stream_response` yields `("chunk", text)` and `("feedback", correction|None)`; the LLM separates conversational reply from grammar correction using `---END---` as delimiter in the streamed output
- `services/speech_to_text.py` — Azure STT via REST (httpx async); accepts `language` param (default `en-US`)
- `services/text_to_speech.py` — Azure TTS SDK (sync, called via `asyncio.to_thread`)
- `services/translate.py` — Azure OpenAI sync client for Japanese→English translation

Azure clients are lazy singletons initialized from env vars on first call.

### Frontend (`frontend/src/`)

- `app/page.tsx` — single-page UI; all state in `useState`/`useRef`, no state management library
- `lib/api.ts` — API layer; `streamAudio()` parses SSE events: `user_text`, `ai_chunk`, `ai_feedback`, `ai_audio_chunk`, `done`, `error`
- `lib/scenarios.ts` — static scenario definitions (airport check-in, restaurant, etc.) with per-scenario system prompt snippets; selected scenario ID persisted in `localStorage`
- `lib/settings.ts` — free-talk partner settings (name, instructions) persisted in `localStorage`
- `lib/srs.ts` — client-side Leitner-box SRS (5 boxes, intervals 10min→14days); all data in `localStorage["speakpal.srsItems"]`
- `hooks/useAudioRecorder.ts` — wraps `MediaRecorder` API
- `app/review/page.tsx` — SRS flashcard review session

### Key coupling points

When changing the API contract, update **both** `lib/api.ts` and `routers/chat.py` in the same PR. The `ai_feedback` field is `null` when the user's English is already natural.

Scenarios (in `lib/scenarios.ts`) inject their `promptSnippet` as the `persona` form field; the backend passes it as the system prompt prefix. Free-talk mode uses per-user `PartnerSettings.instructions` instead.

## Environment Variables

Backend (`backend/.env`, see `.env.example`):
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION` (default: `2024-10-21`)

Frontend (`frontend/.env.local`, see `.env.local.example`):
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)

## Documentation workflow

Docs are organized in 3 places — see [docs/README.md](docs/README.md) for the routing rule:

- `docs/*.md` (flat) — **Overview**: live description of the current system. Update in the same PR as code changes
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — **Spec / Plan**: outputs of `/brainstorming` and `/writing-plans`. Filename is `YYYY-MM-DD-<slug>.md`; spec and plan share the same slug and link to each other
- `docs/adr/` — **ADR**: records of architectural decisions (Michael Nygard format). Never rewritten; supersede by creating a new ADR

New feature work follows the superpowers workflow: `/brainstorming` → spec, `/writing-plans` → plan, `/executing-plans` (with `superpowers:test-driven-development`) → implementation. When a spec contains a decision with long-term reach (library choice, API contract, infra), spawn an ADR and link them.

## Testing approach

- TDD: Red → Green → Refactor
- Mock Azure SDK and subprocess calls with `unittest.mock.patch` or `pytest-mock`
- Frontend and CI tests are not yet set up
- When verifying manually: record audio → confirm transcription + AI reply + audio playback complete; test empty audio and mic-denied error paths
