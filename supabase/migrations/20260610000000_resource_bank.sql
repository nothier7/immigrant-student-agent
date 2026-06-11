-- Layer 1: Resource Bank
-- Structured, stateful storage for agent-served resources.
-- Named resource_bank (not "resources") because public.resources already
-- exists for the community resources directory in the Next.js app.

create extension if not exists vector;

create table if not exists public.resource_bank (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  url              text not null,
  category         text not null default 'benefit',   -- scholarship|grant|tuition|advising|legal|benefit
  authority        text,                              -- CCNY|CUNY|HESC|TheDream.US|Immigrants Rising|...
  source_tier      smallint not null default 2,       -- 0 official, 1 trusted national, 2 web-discovered
  tags             text[] not null default '{}',
  deadline         date,
  deadline_type    text,                              -- 'final' | 'priority' | 'rolling'
  status           text not null default 'unverified',
  last_verified_at timestamptz,
  verification     jsonb,
  embedding        vector(1536),
  raw_snapshot     text,
  added_by         text not null default 'seed',      -- seed | discovery | admin
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint resource_bank_url_key unique (url),
  constraint resource_bank_status_check
    check (status in ('unverified', 'valid', 'stale', 'unverifiable', 'pending_review'))
);

create trigger trg_resource_bank_updated_at
  before update on public.resource_bank
  for each row
  execute function touch_updated_at();

create index if not exists resource_bank_status_idx    on public.resource_bank (status);
create index if not exists resource_bank_tags_idx      on public.resource_bank using gin (tags);
create index if not exists resource_bank_embedding_idx on public.resource_bank
  using hnsw (embedding vector_cosine_ops);
