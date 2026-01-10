# Immigrant Student Agent (CCNY)

An AI assistant that helps City College of New York (CCNY) immigrant/undocumented students navigate in‑state (resident) tuition, NYS Dream Act/TAP, scholarships, and on‑campus resources. Built with Next.js frontend and a FastAPI + OpenAI backend using pre-curated authoritative sources.

Quick link to try locally: http://localhost:3000/ccny

Note: This tool provides informational guidance only and is not legal advice. Always verify with official CCNY/CUNY/HESC sources.

## What's Inside

- **Next.js 16 frontend** (TypeScript, Tailwind) with a chat UI under `/ccny`.
- **FastAPI backend** (`src/app/backend`) with a simple agent that uses OpenAI (GPT-5.2) and pre-curated static context from trusted sources (CCNY, CUNY, HESC, TheDream.US, Immigrants Rising).
- **Session management** for multi-turn conversations (e.g., residency status follow-ups).
- Optional Supabase authentication scaffolding (login/signup screens) — not required to test the CCNY demo page.

## Architecture (Simplified)

The backend uses a single-call LLM architecture:

1. **Conversational Detection** — Recognizes when users are wrapping up ("thanks", "bye") and responds naturally without dumping resources.
2. **Residency Triage** — If a user appears undocumented but hasn't mentioned tuition status, asks a quick clarifying question.
3. **Single LLM Call** — Sends the user query + pre-curated CCNY context to OpenAI and returns a structured JSON response with answer text and resource cards.
4. **Static Context** — Uses authoritative, pre-curated information from CCNY Immigrant Student Center, HESC, TheDream.US, and Immigrants Rising (no live web scraping).

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- uv (Python package manager) — recommended for the backend
  - Install: see https://docs.astral.sh/uv/getting-started/ (e.g., `pipx install uv` or platform installer)

## Environment Variables

Frontend (root `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` (optional, only if using auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional, only if using auth)
- `PY_BACKEND_URL` (optional; defaults to `http://127.0.0.1:8001/chat` in development)
- `CCNY_API_TIMEOUT_MS` (optional; default `30000`)

Backend (`src/app/backend/.env`):

- `OPENAI_API_KEY` — **required** for LLM responses

That's it! No other API keys needed.

## Install & Run (Local)

1) Install web dependencies

```bash
npm install
```

2) Install backend dependencies

```bash
cd src/app/backend
uv sync
cd -
```

3) Create env files

```bash
# Backend - create src/app/backend/.env with:
# OPENAI_API_KEY=sk-...
```

4) Run both servers together

```bash
npm run dev
# → starts Next.js on http://localhost:3000 and FastAPI on http://127.0.0.1:8001
```

Then open http://localhost:3000/ccny and ask, for example:

- "Undocumented freshman at CCNY — how do I get in‑state (resident) tuition?"
- "DACA junior CS at CCNY, low income, 12 credits — scholarships?"

## Useful Scripts

- `npm run dev` — runs web and API concurrently
- `npm run dev:web` — Next.js only on port 3000
- `npm run dev:api` — FastAPI only on port 8001 (`uv run uvicorn server:app --reload`)
- `npm run build && npm start` — production build/start for the web app

Backend can be run directly as well:

```bash
cd src/app/backend
uv run python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

## How It Works (High Level)

1. **Conversational closures** — If the user says something like "thanks" or "that's it", the agent responds with a friendly message and no resource cards.
2. **Residency check** — If the user appears undocumented/DACA/TPS but hasn't mentioned in-state tuition, the agent asks a clarifying question to tailor guidance.
3. **LLM processing** — The query is sent to OpenAI (GPT-5.2) along with pre-curated context about CCNY resources, tuition pathways, scholarships, and financial aid.
4. **Structured response** — The agent returns a concise answer with cited links and "resource cards" (3-6 relevant resources with deadlines and explanations).

### Key Resources in Context

- CCNY Immigrant Student Center
- CCNY In-State Tuition Guide
- NYS Dream Act (HESC)
- CCNY Scholarships for Immigrant Students
- TheDream.US National Scholarship
- Immigrants Rising Scholarship Database
- CCNY Dream Team

## API (Backend)

Base: `http://127.0.0.1:8001`

- `GET /` — Root endpoint
- `GET /health` — Health check
- `POST /chat` — body: `{ "message": string, "session_id"?: string }`
  - Response includes `ask` (if the agent needs a clarifying question), `answer_text`, `sources[]`, and `cards[]`.

The Next.js route `/api/ccny` proxies to `/chat` and exposes `PY_BACKEND_URL`/`CCNY_API_TIMEOUT_MS` overrides.

## Backend Dependencies

- `fastapi` — Web framework
- `uvicorn` — ASGI server
- `langchain-openai` — OpenAI integration
- `pydantic` — Data validation
- `python-dotenv` — Environment variables
- `openai` — OpenAI API client

## Troubleshooting

- **Only seeing fallback links?** Make sure `OPENAI_API_KEY` is set in `src/app/backend/.env`.
- **Supabase errors on auth pages?** Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or avoid visiting `/login` and `/signup` while testing.
- **Import errors?** Check `src/app/backend/pyproject.toml` is synced (`uv sync`) and Python is 3.11+.

## Deployment (Outline)

- **Backend**: Deploy FastAPI (e.g., Render/Fly/Docker). Start command: `uv run uvicorn server:app --host 0.0.0.0 --port 8001`. Set `OPENAI_API_KEY`.
- **Frontend**: Deploy Next.js (e.g., Vercel). Set `PY_BACKEND_URL` to your deployed backend `/chat` URL and any Supabase env if using auth.

---

Questions or improvements you'd like to see? Open an issue or PR.
