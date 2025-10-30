create extension if not exists "pgcrypto";

-- scholarships table
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  description text,
  category text not null default 'scholarship',
  authority text,
  deadline text,
  amount_min numeric,
  amount_max numeric,
  eligibility_tags text[] not null default array[]::text[],
  schools text[] not null default array[]::text[],
  status text not null default 'pending' check (status in ('pending', 'active', 'archived')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scholarships_url_key unique (url)
);

create trigger trg_scholarships_updated_at
  before update on public.scholarships
  for each row
  execute function touch_updated_at();

create index if not exists scholarships_schools_idx on public.scholarships using gin (schools);
create index if not exists scholarships_status_idx on public.scholarships (status);
create index if not exists scholarships_tags_idx on public.scholarships using gin (eligibility_tags);

-- mentorships table
create table if not exists public.mentorships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  description text,
  category text not null default 'peer-support' check (category in ('peer-support', 'advising', 'legal', 'coaching', 'financial', 'other')),
  authority text,
  schools text[] not null default array[]::text[],
  contact_info jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'active', 'archived')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentorships_name_key unique (name)
);

create trigger trg_mentorships_updated_at
  before update on public.mentorships
  for each row
  execute function touch_updated_at();

create index if not exists mentorships_schools_idx on public.mentorships using gin (schools);
create index if not exists mentorships_status_idx on public.mentorships (status);

-- general resources table
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  description text,
  category text not null default 'benefit',
  authority text,
  deadline text,
  eligibility_tags text[] not null default array[]::text[],
  schools text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'active', 'archived')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_name_key unique (name)
);

create trigger trg_resources_updated_at
  before update on public.resources
  for each row
  execute function touch_updated_at();

create index if not exists resources_schools_idx on public.resources using gin (schools);
create index if not exists resources_status_idx on public.resources (status);
create index if not exists resources_tags_idx on public.resources using gin (eligibility_tags);

-- school hub metadata
create table if not exists public.school_hubs (
  school_code text primary key,
  display_name text not null,
  campus_url text,
  immigrant_center_url text,
  discord_invite text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_school_hubs_updated_at
  before update on public.school_hubs
  for each row
  execute function touch_updated_at();

-- submissions table for community content
create table if not exists public.resource_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null check (submission_type in ('scholarship', 'mentorship', 'resource')),
  name text not null,
  url text,
  description text,
  category text,
  authority text,
  schools text[] not null default array[]::text[],
  eligibility_tags text[] not null default array[]::text[],
  deadline text,
  amount_min numeric,
  amount_max numeric,
  contact_info jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_email text,
  submitted_ip inet,
  review_notes text,
  resolved_at timestamptz,
  linked_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_submissions_status_idx on public.resource_submissions (status);
create index if not exists resource_submissions_type_idx on public.resource_submissions (submission_type);
create index if not exists resource_submissions_created_idx on public.resource_submissions (created_at desc);

create trigger trg_resource_submissions_updated_at
  before update on public.resource_submissions
  for each row
  execute function touch_updated_at();

-- admin flag on profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
