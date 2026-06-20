# Immigrant Student Agent (CCNY) — Dreamers Agent

An AI assistant that helps City College of New York (CCNY) immigrant/undocumented students navigate in‑state (resident) tuition, NYS Dream Act/TAP, scholarships, and on‑campus resources.

Quick link to try locally: http://localhost:3000/ccny

> This tool provides informational guidance only and is not legal advice. Always verify with official CCNY/CUNY/HESC sources.

## Contents

1. [The four-layer architecture](#1-the-four-layer-architecture)
2. [Dependencies](#2-dependencies)
3. [Key concepts primer](#3-key-concepts-primer)
4. [Module layout](#4-module-layout)
5. [Layer 1 — Resource Bank](#5-layer-1--resource-bank)
6. [Layer 2 — Serving](#6-layer-2--serving)
7. [Layer 3 — Verifier](#7-layer-3--verifier)
8. [Layer 4 — Discovery](#8-layer-4--discovery)
9. [The closed loop](#9-the-closed-loop)
10. [Install & run](#10-install--run)
11. [Environment variables](#11-environment-variables)
12. [API reference](#12-api-reference)
13. [Tests](#13-tests)
14. [Deployment](#14-deployment)
15. [Guardrails](#15-guardrails)

---

## 1. The four-layer architecture

The backend is four cooperating layers around one Postgres table:

```
            ┌─────────────────────────────────────────────┐
            │                Resource Bank (L1)            │
            │   structured, stateful resources in Postgres │
            └─────────────────────────────────────────────┘
   reads ↑                  maintains ↑              feeds in ↑
┌────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  Serving (L2)  │   │   Verifier (L3)    │   │   Discovery (L4)   │
│ /chat answers  │   │ daily job: prunes  │   │ daily job: grows   │
│ grounded cards │   │ dead/expired links │   │ bank from trusted  │
│                │   │                    │   │ hubs/search + gate │
└────────────────┘   └────────────────────┘   └────────────────────┘
```

- **Resource Bank (L1)** holds structured, stateful resources.
- **Serving (L2)** reads from it and answers with grounded, hallucination-proof cards.
- **Verifier (L3)** prunes dead/expired entries — the bank self-cleans.
- **Discovery (L4)** grows it from trusted sources through a vetting + dedup + human-review gate.

Each layer reuses the one before it: discovery's fetcher is the verifier's, its extraction is L2's structured output, its concurrency is L3's batch pattern, its writes go through L1's repository, and its embeddings also upgrade L2 retrieval later. Build order was the section order — each layer is additive and the app keeps working at every step (if `DATABASE_URL` isn't set, `/chat` falls back to the legacy static-context agent in `agent.py`).

## 2. Dependencies

Backend (`src/app/backend/pyproject.toml`, managed with `uv`):

| Package | Why |
|---|---|
| `fastapi` / `uvicorn` | Web framework + ASGI server for `/chat` |
| `asyncpg` | Async PostgreSQL driver — runs SQL against the bank without blocking |
| `httpx` | Async HTTP client — liveness checks, page fetches |
| `beautifulsoup4` | HTML parser — turns raw page HTML into clean text |
| `pgvector` | Lets asyncpg send/receive Postgres `vector` values |
| `openai` | Embeddings API client |
| `langchain-openai` | Thin wrapper over OpenAI chat models; gives one-line structured output |
| `pydantic` | Data validation via typed models (already used by FastAPI) |
| `python-dotenv` | Loads `.env` |
| `pytest` (dev) | Verifier decision-logic tests |

Postgres needs the `vector` extension (Supabase has it available; the migration enables it).

## 3. Key concepts primer

Brief definitions of every idea used below — each layer references these.

- **Migration** — a versioned SQL file describing a schema change, checked into git so the database structure is tracked and repeatable. Lives in `supabase/migrations/`.
- **Pydantic** — declares the *shape* of data as a typed class (`BaseModel`). It validates incoming data (DB rows, LLM output, API bodies) against that shape and gives back a typed object, raising clear errors on bad data. `Model(**data)` validates in; `.model_dump()` serializes out.
- **Repository pattern** — one module (`bank/repository.py`) is the only place that talks to the database. Everything else calls its functions. Keeps SQL in one place, enables caching/testing, prevents three subsystems from scattering queries everywhere.
- **async / await** — a web server spends most of its time waiting on I/O (DB, LLM, HTTP). `async def` marks a coroutine; `await x` pauses until `x` finishes while letting the server do other work. FastAPI runs the loop; `asyncio.run(...)` starts one for standalone scripts.
- **Structured output** — modern LLM APIs accept a schema (a Pydantic model) and constrain the model to return JSON matching it, then parse it back into a typed object. No "parse the text and hope." Exposed as `llm.with_structured_output(Model)`.
- **temperature** — the randomness knob on an LLM. `0` = most deterministic (used for classification/extraction); higher = more varied (slightly higher for natural answer prose).
- **system / user messages** — a chat model is called with role-tagged messages. `system` = standing instructions the user never sees; `user` = the actual input.
- **HTTP basics** — a request returns a status code: 2xx OK, 3xx redirect, 4xx/5xx problem. `HEAD` fetches only headers (cheap liveness check); `GET` fetches the full body.
- **Embedding** — an embedding model converts text into a vector (here 1536 floats) positioned so that texts with similar *meaning* sit close together, even with different words.
- **Cosine similarity / distance** — similarity is the angle between two vectors: ~1 = same meaning, ~0 = unrelated. pgvector's `<=>` operator returns cosine *distance* (`1 − similarity`), so smaller = more similar.
- **Concurrency (asyncio)** — `asyncio.gather(...)` runs many async tasks at once; a `Semaphore(n)` caps how many run simultaneously so you don't overwhelm servers or hit rate limits.

## 4. Module layout

```
src/app/backend/
  server.py            # FastAPI app, /chat endpoint, startup pool init, admin endpoints
  agent.py             # legacy static-context agent (fallback when no DATABASE_URL)
  bank/
    models.py          # Resource (Pydantic)
    repository.py      # all DB access
  serving/
    schema.py          # QueryRoute, Synthesis, TAGS
    router.py          # route_query
    synthesize.py      # synthesize, to_card
  verifier/
    schema.py          # DatedFact, DateExtraction, VerificationResult
    liveness.py        # check_liveness
    fetch.py           # fetch_text, locate
    extract.py         # extract_dates
    decide.py          # decide_status (pure logic)
    verify.py          # verify_resource
    batch.py           # run_batch
    __main__.py        # entrypoint: python -m verifier
  discovery/
    schema.py          # Candidate, CandidateList, VettingResult
    extract.py         # extract_candidates
    vet.py             # vet
    embed.py           # embed
    search.py          # Brave Search API client
    batch.py           # discover_from_hub/search, run_discovery
    __main__.py        # entrypoint: python -m discovery
  tests/
    test_decide.py     # deterministic verifier-core tests
  lambda_handler.py    # AWS Lambda entrypoints for both jobs
  Dockerfile.lambda    # container image for Lambda (both jobs)
supabase/migrations/
  20260610000000_resource_bank.sql       # table + indexes
  20260610000001_seed_resource_bank.sql  # curated seed rows
infra/terraform/       # ECR + 2 Lambdas + EventBridge schedules
```

## 5. Layer 1 — Resource Bank

**Goal:** move the curated context from a hardcoded string (`agent.py`) into a structured, stateful Postgres table. All new code — existing serving was untouched while this was built, so nothing broke.

### Migration (`20260610000000_resource_bank.sql`)

Creates `public.resource_bank`. (The implementation plan called the table `resources`, but `public.resources` already exists for the community resources directory in the Next.js app — so the agent's table is `resource_bank`.)

Key columns:

| Column | Meaning |
|---|---|
| `name`, `description`, `url` | the resource itself (`url` is unique — natural dedup key) |
| `category`, `authority` | kept so the existing frontend card filtering/sorting works unchanged |
| `source_tier` | `0` official (CCNY/HESC), `1` trusted national, `2` web-discovered |
| `tags text[]` | retrieval key; a Postgres array matched with the `&&` overlap operator |
| `deadline`, `deadline_type` | stays null until the verifier finds one |
| `status` | `unverified` (default — conservative: nothing claimed good until checked) → `valid` / `stale` / `unverifiable` / `pending_review` |
| `last_verified_at`, `verification jsonb` | the verifier's audit trail (structured JSON of what it found) |
| `embedding vector(1536)` | pgvector embedding, filled by discovery; powers dedup + future semantic retrieval |
| `raw_snapshot` | page text at verification time (debugging) |
| `added_by` | `seed` / `discovery` / `admin` |

Three indexes speed up the query each layer runs: status filter (serving), tag overlap (`gin`, serving), vector similarity (`hnsw`, discovery).

### Seed (`20260610000001_seed_resource_bank.sql`)

Inserts the 8 curated resources that previously lived in `agent.py`'s static context (CCNY Immigrant Student Center, In-State Tuition Guide, NYS Dream Act, TheDream.US, Immigrants Rising, etc.). Only fields we know; `status` defaults to `unverified`; `deadline` stays null until the verifier finds one. `on conflict (url) do nothing` makes the seed re-runnable.

### Pydantic model (`bank/models.py`)

`Resource` mirrors the table. `X | None = None` means optional. The model deliberately omits `embedding` and `raw_snapshot` — the table stores everything the system needs, but the app object carries only what the app uses.

### Repository (`bank/repository.py`)

- `init_pool` opens a reusable pool of DB connections once at startup; `_pool` is shared module-wide. The init callback registers a jsonb codec (dicts round-trip) and pgvector's codec (vectors round-trip).
- `get_active_resources` is the serving query: rows whose `status` is in the allowed set and whose `tags` overlap the requested tags (`&&` = array overlap; the `is null or` makes the tag filter optional). `$1/$2/$3` are parameterized placeholders — user input is never pasted into SQL (injection defense). Each row becomes a validated `Resource`.
- `set_status` is the verifier's write path: updates status, the `verification` jsonb, the timestamp, and the selected deadline.
- `resources_due_for_verification`, `find_similar`, `url_exists`, `insert_candidate`, `list_pending`, `approve`, `reject` support Layers 3 and 4 (explained where they're used).

### Wire into the app

`server.py`'s lifespan hook runs once at boot, reads `DATABASE_URL`, opens the pool. At the end of Layer 1 the app behaved identically — only the data location changed.

## 6. Layer 2 — Serving

**Goal:** replace the static context with bank queries, and make answers hallucination-proof.

Flow: `closure check (reused) → residency triage (reused) → router → retrieve → grounded synthesis`. Response shape is unchanged, so the frontend needs no changes.

### Schemas (`serving/schema.py`)

- `TAGS` — the fixed tag vocabulary (`scholarship`, `in-state-tuition`, `daca`, `undocumented`, `financial-aid`, `work-authorization`, `general`).
- `QueryRoute { tags, needs_resources }` — what the router returns.
- `Synthesis { answer_text, cite_ids }` — what the synthesizer returns.

### Router (`serving/router.py`)

A single structured classification call (not an agent). `temperature=0` for consistency. `with_structured_output(QueryRoute)` forces a validated `QueryRoute` back. Constraining to the fixed `TAGS` keeps the output aligned with the tags resources actually carry.

### Grounded synthesis (`serving/synthesize.py`)

The model receives the retrieved resources (each tagged with its DB id) and returns prose plus the ids it used. **The cards are then built from the DB rows, not the model** — `to_card` pulls `url`, `deadline`, `category`, `authority`, `verified` from the row. The model can only choose *which real resources* to show; it can't fabricate a factual field. That is the hallucination guard.

### Endpoint (`server.py /chat`)

```
1 & 2. existing closure check + residency triage run first
       (residency triage may return {"ask": ...} and park the question in the session)
3.     route = await route_query(message); needs_resources=False → friendly closing
4.     resources = await repository.get_active_resources(tags=route.tags)
5.     synth = await synthesize(message, resources, context_note)
6.     by_id maps id → resource; cards built only for ids the model cited
       that actually exist (`if cid in by_id` drops any hallucinated id)
```

The `verified` flag on a card is always false until Layer 3 runs. The multi-turn residency session flow (`pending_residency`, yes/no parsing) is preserved exactly from the previous version.

**Scale note:** tag filtering is enough at a few dozen resources; switch `get_active_resources` to hybrid tag + semantic ranking (the embeddings are already stored) only when the bank grows past what fits in the prompt.

## 7. Layer 3 — Verifier

**Goal:** a scheduled job that checks each resource and writes `valid` / `stale` / `unverifiable` back. Built inside-out: pure logic first, then I/O, then composition.

### Schemas (`verifier/schema.py`)

- `DatedFact { date, role, evidence }` — `role` is a `Literal[...]` of exact values (`final_deadline`, `priority_deadline`, `rolling`, `opens`, `last_updated`, `event`, `prior_cycle`, `other`). For a structured-output schema, `Literal` constrains the *model's* allowed outputs.
- `DateExtraction` — what the LLM returns (kept separate from our decision).
- `VerificationResult` — what *we* compute & store: three-state `status`, `reason`, the facts, the selected deadline, confidence, timestamp.

### Liveness (`verifier/liveness.py`) — build first, pure code

Cheap `HEAD` first, falling back to `GET` (some servers reject HEAD); follows redirects; 10s timeout; network errors count as dead. Returns `(alive, final_url)`. A dead link short-circuits to `stale`.

### Fetch & locate (`verifier/fetch.py`)

`fetch_text` downloads the page, strips noisy tags (`script`, `style`, `nav`, `footer`, …), returns readable text. `locate` keeps only lines near deadline/eligibility keywords (the "narrow the input" step). Later upgrades: Firecrawl for JS-heavy pages, semantic locate via embeddings.

### Extract dates (`verifier/extract.py`) — LLM

Extract *every* date with role + evidence ("disambiguation by structure", not by making the model choose). "Never infer" in the system prompt guards against fabricated dates; anchoring to `resource_name` separates this resource's dates from unrelated ones on the page.

### Decide (`verifier/decide.py`) — pure code

```
deadlines = facts with a deadline role        upcoming = deadlines still in the future
any upcoming (or rolling)  → valid, earliest upcoming selected as the deadline
deadlines exist, none upcoming → stale ("all deadlines past")
none found                → unverifiable (never guess)
```

Pure, testable logic — no I/O, no LLM.

### Compose (`verifier/verify.py`)

Dead → `stale`. Evergreen (no deadline-bearing tags — `DEADLINE_BEARING_TAGS = {scholarship, financial-aid}`) → `valid` if the link is live (the semantic "still accurate" check is the last refinement). Deadline-bearing → fetch → locate → extract → decide.

### Batch + concurrency (`verifier/batch.py`)

`Semaphore(5)` caps simultaneous workers (don't hammer servers / hit rate limits). `gather` runs all due resources, waits for all. `model_dump(mode="json")` converts the result (dates included) to a JSON-safe dict for the jsonb column. `resources_due_for_verification` selects rows never verified or older than the TTL — re-verify each resource at most once a day. `pending_review` rows are excluded (humans first).

### Entrypoint & effect

Run with `python -m verifier` (from `src/app/backend`); a scheduler triggers it daily in deployment. When the verifier runs, Layer 2's `status_in` filter starts dropping `stale` resources and the card `verified` flag becomes real. The bank is self-cleaning.

## 8. Layer 4 — Discovery

**Goal:** grow the bank from trusted hubs and capped web search through a vetting + dedup gate, with a human review checkpoint. Mirrors the verifier: reuses fetch, structured output, batch/concurrency, repository. New concept: embeddings.

### Schemas (`discovery/schema.py`)

`Candidate { name, url, description, tags }`, `CandidateList`, `VettingResult { relevant, scam_risk, reason }`.

### Extract candidates from a hub (`discovery/extract.py`)

Structured extraction over a trusted aggregator page or fetched search result page: name, link, one-line description, tags from the fixed `TAGS` list. "Only list opportunities actually present on the page."

### Vetting gate (`discovery/vet.py`)

Cheap deterministic red-flag scan first (`application fee`, `pay to apply`, `guaranteed scholarship`, …); LLM judgment (with a grounding `reason`) for relevance + subtler scams. Conservative: not relevant or scam → dropped downstream.

### Embeddings dedup (`discovery/embed.py` + `repository.find_similar`)

`embed` returns 1536 floats (`text-embedding-3-small`) — matches `vector(1536)`. Embeddings catch duplicates that exact name/URL matching misses (same scholarship, different wording). `find_similar` orders by cosine distance (`<=>`) and returns the nearest resource if it's within `threshold` (smaller distance = more similar). Storing the embedding on insert powers future dedup and serving's semantic retrieval.

### Admission + verification

Discovered candidates are never served directly. Trusted hubs and official domains (`.edu`, `.gov`, CUNY/CCNY, HESC, Immigrants Rising) enter as `unverified`, so the verifier can classify them automatically. Lower-trust search results enter as `pending_review`.

Admin endpoints (in `server.py`, authenticated via the `X-Admin-Key` header against `ADMIN_API_KEY`):

- `GET /admin/pending` — list the review queue
- `POST /admin/approve/{id}` — flips `pending_review → unverified`, handing the resource to the verifier; it's checked before it can be served
- `POST /admin/reject/{id}` — deletes the candidate

### Pipeline + batch (`discovery/batch.py`)

The function *is* the pipeline: fetch hub/search result → extract candidates → drop if known by URL → drop if vetting fails → embed and drop if semantic duplicate → admit to verifier queue or review queue based on source trust. `HUBS` is a fixed list of trusted aggregators. If `BRAVE_SEARCH_API_KEY` is set, daily discovery also rotates through capped search query templates and fetches the top results before sending them through the same pipeline. Entrypoint mirrors the verifier's (`python -m discovery`), scheduled daily.

## 9. The closed loop

Discovery feeds in, the verifier maintains, serving reads out:

```
trusted hubs / official domains ──discovery──▶ unverified ──verifier──▶ valid ──serving──▶ students
                                          │                         └── stale/unverifiable (hidden)
lower-trust search results ───────────────└──▶ pending_review ──human approve──▶ unverified
```

Each layer reused the one before it — that reuse is the sign the architecture is coherent.

## 10. Install & run

Prerequisites: Node.js 18+, Python 3.11+ (3.12 pinned via `.python-version`), [uv](https://docs.astral.sh/uv/), and optionally a Postgres database with the `vector` extension (Supabase works).

```bash
# 1) Web dependencies
npm install

# 2) Backend dependencies
cd src/app/backend && uv sync && cd -

# 3) Env files (see section 11)

# 4) Apply migrations (only needed for the resource bank; app works without it)
supabase db push     # or run the two SQL files in supabase/migrations manually

# 5) Run both servers
npm run dev          # Next.js on :3000, FastAPI on :8001
```

Then open http://localhost:3000/ccny.

Background jobs (run from `src/app/backend`):

```bash
uv run python -m verifier    # daily — verify due resources
uv run python -m discovery   # daily — discover candidates from hubs/search
```

## 11. Environment variables

Frontend (root `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional, auth only)
- `PY_BACKEND_URL` (optional; defaults to `http://127.0.0.1:8001/chat`)
- `CCNY_API_TIMEOUT_MS` (optional; default `30000`)

Backend (`src/app/backend/.env`):

- `OPENAI_API_KEY` — **required** for LLM responses and embeddings
- `DATABASE_URL` — Postgres connection string (Supabase: Settings → Database). **Optional:** without it, `/chat` falls back to the legacy static-context agent
- `ADMIN_API_KEY` — shared secret for the `/admin/*` review endpoints (admin endpoints are disabled if unset)
- `BRAVE_SEARCH_API_KEY` — optional, enables broad web search discovery in addition to trusted hub discovery
- `DISCOVERY_SEARCH_QUERIES_PER_RUN` — optional, defaults to `10`
- `DISCOVERY_SEARCH_RESULTS_PER_QUERY` — optional, defaults to `5`
- `DISCOVERY_SEARCH_RESULT_CONCURRENCY` — optional, defaults to `5`

## 12. API reference

Base: `http://127.0.0.1:8001`

| Endpoint | Description |
|---|---|
| `GET /` | Root |
| `GET /health` | `{ ok, resource_bank, legacy_agent_error }` — shows whether the bank is live |
| `POST /chat` | body `{ message, session_id?, school_code?, profile? }` → `{ session_id, ask?, answer_text?, sources[], cards[] }` |
| `GET /admin/pending` | review queue (`X-Admin-Key` header required) |
| `POST /admin/approve/{id}` | `pending_review → unverified` |
| `POST /admin/reject/{id}` | delete candidate |

Cards now carry a `verified` flag (`status == "valid"`), in addition to the existing `name/url/category/why/deadline/authority` fields. The Next.js route `/api/ccny` proxies `/chat` unchanged.

## 13. Tests

```bash
cd src/app/backend
uv run pytest tests/ -q
```

`tests/test_decide.py` covers the verifier's deterministic core (`decide_status`): past deadlines → `stale`, upcoming → `valid`, rolling → `valid`, prior-cycle/no dates → `unverifiable`, earliest-upcoming selection — and asserts the dangerous error (**false `valid`** — telling a student an expired scholarship is open) stays at zero.

## 14. Deployment

- **Web**: Vercel (set `PY_BACKEND_URL`).
- **API**: any FastAPI host (Render/Fly/Docker). Start: `uv run uvicorn server:app --host 0.0.0.0 --port 8001`. Set `OPENAI_API_KEY`, `DATABASE_URL`, `ADMIN_API_KEY`.
- **Jobs**: AWS Lambda triggered by EventBridge — verifier daily, discovery daily. Everything below is in the repo.

### Jobs on AWS Lambda + EventBridge

Three artifacts make this work:

| Artifact | Role |
|---|---|
| `src/app/backend/lambda_handler.py` | `verifier_handler` / `discovery_handler` — sync Lambda entrypoints that wrap the async jobs in `asyncio.run`, opening and closing the DB pool per invocation (Lambda freezes environments between runs, so connections can't be assumed alive) |
| `src/app/backend/Dockerfile.lambda` | One container image for both jobs, built on `public.ecr.aws/lambda/python:3.12`. A container image (not a zip) because `asyncpg`/`pydantic-core` ship compiled wheels that must match the Lambda runtime. Stage 1 exports the locked deps with `uv`; stage 2 installs them into the Lambda task root |
| `infra/terraform/` | ECR repo, IAM role (CloudWatch Logs only — Postgres/OpenAI/search are outside AWS), two Lambda functions from the *same image* with the handler overridden per function via `image_config.command`, two EventBridge schedule rules (`rate(1 day)` / `rate(1 day)`), log groups with 30-day retention |

Deploy:

For `database_url`, use Supabase's **Session Pooler** connection string from
Dashboard -> Connect -> Session pooler. The direct `db.<project-ref>.supabase.co`
connection can be IPv6-only on Supabase free projects, which Lambda cannot reach
from the default public IPv4 runtime.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in keys (gitignored)
terraform init
terraform apply -target=aws_ecr_repository.jobs   # 1. create the registry

# 2. build & push the image (from src/app/backend)
aws ecr get-login-password --region us-east-1 | docker login --username AWS \
  --password-stdin "$(terraform output -raw ecr_repository_url | cut -d/ -f1)"
docker buildx build -f Dockerfile.lambda --platform linux/amd64 --provenance=false \
  -t "$(cd ../../infra/terraform && terraform output -raw ecr_repository_url):latest" \
  --push .

# 3. everything else: lambdas, schedules, IAM
terraform apply
```

Test an invocation without waiting for the schedule:

```bash
aws lambda invoke --function-name dreamers-agent-verifier /dev/stdout
```

To ship a new version of the jobs: rebuild, push with a new tag, `terraform apply -var image_tag=<tag>`.

Discovery uses two sources. Trusted hubs are always fetched. If `BRAVE_SEARCH_API_KEY` is set, the daily job also rotates through search query templates, fetches top results, extracts candidates, dedupes by URL and embedding, and inserts vetted discoveries into `resource_bank`. Trusted/official sources enter as `unverified`; lower-trust sources enter as `pending_review`.

## 15. Guardrails

- **Build before you claim it.** The repo on `main` is what gets evaluated, not the design.
- **Real numbers only.** No 100%-across-the-board; report honest before/after and a real false-valid rate.
- **Don't over-engineer.** Tag retrieval before vector retrieval; structured pipelines before agents; the cheapest reliable tool per job.
- **Understand every line.** Building with AI tools is fine; shipping code you can't explain is not.
- **Trust is the constraint.** Discovery feeds a vetted review queue, never the student directly; the "nothing stored" promise has to be technically real.
