alter table public.scholarships
  add column if not exists link_status text not null default 'unknown',
  add column if not exists link_checked_at timestamptz,
  add column if not exists link_fail_count integer not null default 0,
  add column if not exists link_http_status integer;

alter table public.mentorships
  add column if not exists link_status text not null default 'unknown',
  add column if not exists link_checked_at timestamptz,
  add column if not exists link_fail_count integer not null default 0,
  add column if not exists link_http_status integer;

alter table public.resources
  add column if not exists link_status text not null default 'unknown',
  add column if not exists link_checked_at timestamptz,
  add column if not exists link_fail_count integer not null default 0,
  add column if not exists link_http_status integer;

create index if not exists scholarships_link_status_idx on public.scholarships (link_status);
create index if not exists mentorships_link_status_idx on public.mentorships (link_status);
create index if not exists resources_link_status_idx on public.resources (link_status);
