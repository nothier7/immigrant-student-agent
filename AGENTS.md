# Repository Guidelines

## Project Structure & Module Organization
- Web app: Next.js under `src/app` (routes like `src/app/ccny/page.tsx`, API route `src/app/api/ccny/route.ts`).
- UI components: `src/app/components/*` (PascalCase files, co-located assets/styles).
- Backend agent: `src/app/backend` (FastAPI `server.py`, LangGraph `workflow.py`, prompts and models). Local cache lives in `src/app/backend/.firecrawl_cache/`.
- Public assets: `public/*` (SVGs, images). Config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`.

## Build, Test, and Development Commands
- `npm run dev`: runs web (Next.js on 3000) and API (FastAPI on 8001) concurrently.
- `npm run dev:web`: Next.js dev server.
- `npm run dev:api`: FastAPI via `uvicorn` using `uv` environment (Python >= 3.11, `uv` required).
- `npm run lint`: ESLint checks for the web code.
- `npm run build` / `npm start`: Next.js production build and serve.
- Backend health: `curl http://127.0.0.1:8001/health` (expects `{ ok: true }`).

## Coding Style & Naming Conventions
- TypeScript: `strict` mode enabled; prefer explicit types and `@/*` path alias.
- Indentation: 2 spaces; files end with newline.
- Components: PascalCase in `src/app/components` (e.g., `AuthCard.tsx`). Routes/pages use lowercase folders (e.g., `login/page.tsx`).
- Styling: Tailwind CSS (see `globals.css`); keep component styles local when possible.
- Python (backend): PEP 8, type hints where practical; keep domain logic in `workflow.py` nodes.

## Testing Guidelines
- No formal test suite yet. If adding tests:
  - Web: prefer Vitest + React Testing Library; name `*.test.ts(x)` near code.
  - Backend: `pytest` with files `test_*.py`; include simple `/health` and `/chat` smoke tests.
  - Document how to run tests in your PR and add scripts to `package.json` or `pyproject.toml` as needed.

## Commit & Pull Request Guidelines
- Commits are short and imperative; some use Conventional Commits (e.g., `fix(vercel): ...`). Prefer Conventional Commits for clarity.
- PRs must include: concise description, scope, linked issues, screenshots for UI changes, local run steps, and notes on env vars/migrations.
- Keep changes focused; update docs/comments when behavior or APIs change.

## Security & Configuration Tips
- Do not commit secrets. Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PY_BACKEND_URL`, optional `CCNY_API_TIMEOUT_MS`, backend tunables (`FAST_MODE`, `WORKFLOW_TIMEOUT_S`, etc.).
- Backend loads `.env` from `src/app/backend/`; keep it local.
- The web API route proxies to the Python backend (`src/app/api/ccny/route.ts`); ensure `PY_BACKEND_URL` points to your FastAPI `/chat` endpoint.

