-- Resource flagging reports for existing items
create table if not exists public.resource_flags (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('scholarship','mentorship','resource')),
  resource_id uuid not null,
  reason text not null check (reason in ('broken','invalid','other')),
  comment text,
  submitted_email text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists resource_flags_kind_id_idx on public.resource_flags (resource_kind, resource_id);
create index if not exists resource_flags_status_idx on public.resource_flags (status);

