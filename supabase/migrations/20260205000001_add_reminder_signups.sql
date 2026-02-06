create table if not exists public.reminder_signups (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('scholarship','mentorship','resource')),
  resource_id uuid not null,
  name text not null,
  url text,
  deadline text,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists reminder_signups_status_idx on public.reminder_signups (status);
create index if not exists reminder_signups_resource_idx on public.reminder_signups (resource_kind, resource_id);
create index if not exists reminder_signups_created_idx on public.reminder_signups (created_at desc);
