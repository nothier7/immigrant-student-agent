# Immigrant Student Agent (CCNY)

An AI assistant that helps City College of New York (CCNY) immigrant/undocumented students navigate in‑state (resident) tuition, NYS Dream Act/TAP, scholarships, and on‑campus resources. The web app is built with Next.js and talks to a FastAPI backend that uses LangGraph, OpenAI, and Firecrawl to curate credible, CCNY‑specific information.

Quick link to try locally: http://localhost:3000/ccny

Note: This tool provides informational guidance only and is not legal advice. Always verify with official CCNY/CUNY/HESC sources.

## What’s Inside

- Next.js 15 frontend (TypeScript, Tailwind) with a chat UI under `/ccny`.
- FastAPI backend (`src/app/backend`) that runs a LangGraph workflow over curated CCNY pages and trusted sources (CUNY, HESC, TheDream.US, Immigrants Rising).
- Firecrawl integration for search/scrape with caching and rate‑limit handling; graceful fallbacks when cold‑starting or rate‑limited.
- Optional Supabase authentication scaffolding (login/signup screens) — not required to test the CCNY demo page.

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

- `OPENAI_API_KEY` — required for LLM responses
- `FIRECRAWL_API_KEY` — recommended for live search/scrape; without it the agent uses curated/static context and fallbacks
- `FIRECRAWL_CACHE_DIR` — recommended; e.g., `./.firecrawl_cache` (relative to backend folder)
- `FAST_MODE` — set `1` during development to avoid slow scrapes on cold boot (optional)
- `WORKFLOW_TIMEOUT_S` — default `18` (optional)

Advanced Firecrawl tunables (optional): `FIRECRAWL_SCRAPE_TTL`, `FIRECRAWL_SEARCH_TTL`, `FIRECRAWL_COOLDOWN`, `FIRECRAWL_PDF_POLICY`, `FIRECRAWL_TIMEOUT_S`, `FIRECRAWL_CONNECT_TIMEOUT_S`, `FIRECRAWL_MAX_MD_CHARS`.

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
# Frontend (optional if not using Supabase auth)
cp .env.local.example .env.local   # if you keep an example; otherwise create manually

# Backend
cp src/app/backend/.env.example src/app/backend/.env  # if you keep an example; otherwise create manually

# Or create src/app/backend/.env with at least:
# OPENAI_API_KEY=sk-...
# FIRECRAWL_API_KEY=fc-...            # recommended
# FIRECRAWL_CACHE_DIR=./.firecrawl_cache
# FAST_MODE=1                         # optional for dev
```

4) Run both servers together

```bash
npm run dev
# → starts Next.js on http://localhost:3000 and FastAPI on http://127.0.0.1:8001
```

Then open http://localhost:3000/ccny and ask, for example:

- “Undocumented freshman at CCNY — how do I get in‑state (resident) tuition?”
- “DACA junior CS at CCNY, low income, 12 credits — scholarships?”

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

- Classifies intent (e.g., residency, financial_aid, scholarships) via OpenAI (`gpt-4o-mini`).
- If the user likely needs residency guidance, the agent asks a quick follow‑up about in‑state tuition status to tailor the answer.
- Curates CCNY core pages and, when relevant, trusted system‑wide sources (HESC, TheDream.US, Immigrants Rising).
- Uses Firecrawl search/scrape with caching and soft timeouts; falls back to curated/static context and key links during cold start or rate limits.
- Returns a concise answer with cited links and “resource cards” you can filter, copy, or export.

## API (Backend)

Base: `http://127.0.0.1:8001`

- `GET /health` — basic health and workflow import status
- `POST /warm` — warms caches in the background
- `POST /chat` — body: `{ "message": string, "session_id"?: string }`
  - Response includes `ask` (if the agent needs a quick confirmation), `answer_text`, `sources[]`, and `cards[]`.

The Next.js route `/api/ccny` proxies to `/chat` and exposes `PY_BACKEND_URL`/`CCNY_API_TIMEOUT_MS` overrides.

## Troubleshooting

- Only seeing fallback links? Make sure `OPENAI_API_KEY` and (ideally) `FIRECRAWL_API_KEY` are set in `src/app/backend/.env`. Set `FAST_MODE=1` for snappier dev.
- Supabase errors on auth pages? Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or avoid visiting `/login` and `/signup` while testing.
- 429/timeout from Firecrawl? The backend will cool down and serve curated/static context; try again shortly.
- Can’t import workflow? Check `src/app/backend/pyproject.toml` is synced (`uv sync`) and Python is 3.11+.

## Deployment (Outline)

- Backend: Deploy FastAPI (e.g., Render/Fly/Docker). Start command example: `uv run uvicorn server:app --host 0.0.0.0 --port 8001`. Set `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`, and persistent `FIRECRAWL_CACHE_DIR`.
- Frontend: Deploy Next.js (e.g., Vercel). Set `PY_BACKEND_URL` to your deployed backend `/chat` URL and any Supabase env if using auth.

---

Questions or improvements you’d like to see? Open an issue or PR.
