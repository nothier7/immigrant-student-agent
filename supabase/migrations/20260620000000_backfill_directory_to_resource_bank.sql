-- Backfill legacy public directory rows into the canonical AI resource bank.
-- Active rows become unverified so the verifier must pass them before they are
-- treated as trusted. Pending rows keep the manual-review gate, and archived
-- rows enter as stale for audit/history.

with directory_rows as (
  select
    0 as source_order,
    'scholarships'::text as source_table,
    id as source_id,
    name,
    description,
    url,
    coalesce(category, 'scholarship') as category,
    authority,
    case
      when lower(coalesce(authority, '')) like '%ccny%' then 0::smallint
      when lower(coalesce(authority, '')) like '%cuny%' then 0::smallint
      when lower(coalesce(authority, '')) like '%hesc%' then 0::smallint
      else 1::smallint
    end as source_tier,
    array_remove(array_cat(eligibility_tags, array['scholarship', category]), null) as tags,
    case when deadline ~ '^\d{4}-\d{2}-\d{2}' then left(deadline, 10)::date else null::date end as deadline,
    null::text as deadline_type,
    status as directory_status,
    created_at,
    updated_at,
    jsonb_build_object(
      'source_table', 'scholarships',
      'source_id', id,
      'directory_status', status,
      'schools', schools,
      'amount_min', amount_min,
      'amount_max', amount_max
    )::text as raw_snapshot
  from public.scholarships
  where nullif(trim(coalesce(url, '')), '') is not null

  union all

  select
    1 as source_order,
    'resources'::text as source_table,
    id as source_id,
    name,
    description,
    url,
    coalesce(category, 'benefit') as category,
    authority,
    case
      when lower(coalesce(authority, '')) like '%ccny%' then 0::smallint
      when lower(coalesce(authority, '')) like '%cuny%' then 0::smallint
      when lower(coalesce(authority, '')) like '%hesc%' then 0::smallint
      else 2::smallint
    end as source_tier,
    array_remove(array_cat(eligibility_tags, array[category]), null) as tags,
    case when deadline ~ '^\d{4}-\d{2}-\d{2}' then left(deadline, 10)::date else null::date end as deadline,
    null::text as deadline_type,
    status as directory_status,
    created_at,
    updated_at,
    jsonb_build_object(
      'source_table', 'resources',
      'source_id', id,
      'directory_status', status,
      'schools', schools,
      'metadata', metadata
    )::text as raw_snapshot
  from public.resources
  where nullif(trim(coalesce(url, '')), '') is not null

  union all

  select
    2 as source_order,
    'mentorships'::text as source_table,
    id as source_id,
    name,
    description,
    url,
    coalesce(category, 'advising') as category,
    authority,
    case
      when lower(coalesce(authority, '')) like '%ccny%' then 0::smallint
      when lower(coalesce(authority, '')) like '%cuny%' then 0::smallint
      else 2::smallint
    end as source_tier,
    array_remove(array[category, 'general'], null) as tags,
    null::date as deadline,
    null::text as deadline_type,
    status as directory_status,
    created_at,
    updated_at,
    jsonb_build_object(
      'source_table', 'mentorships',
      'source_id', id,
      'directory_status', status,
      'schools', schools,
      'contact_info', contact_info
    )::text as raw_snapshot
  from public.mentorships
  where nullif(trim(coalesce(url, '')), '') is not null
),
deduped as (
  select distinct on (url)
    *
  from directory_rows
  order by url, source_order asc, updated_at desc
),
prepared as (
  select
    name,
    description,
    url,
    category,
    authority,
    source_tier,
    tags,
    deadline,
    deadline_type,
    case
      when directory_status = 'active' then 'unverified'
      when directory_status = 'archived' then 'stale'
      else 'pending_review'
    end as bank_status,
    case
      when directory_status = 'archived' then jsonb_build_object(
        'status', 'stale',
        'reason', 'Imported from archived directory row.',
        'source', source_table
      )
      else null::jsonb
    end as verification,
    case
      when directory_status = 'archived' then now()
      else null::timestamptz
    end as last_verified_at,
    raw_snapshot,
    created_at,
    updated_at
  from deduped
)
insert into public.resource_bank (
  name,
  description,
  url,
  category,
  authority,
  source_tier,
  tags,
  deadline,
  deadline_type,
  status,
  verification,
  last_verified_at,
  raw_snapshot,
  added_by,
  created_at,
  updated_at
)
select
  name,
  description,
  url,
  category,
  authority,
  source_tier,
  tags,
  deadline,
  deadline_type,
  bank_status,
  verification,
  last_verified_at,
  raw_snapshot,
  'directory-import',
  created_at,
  updated_at
from prepared
on conflict (url) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  authority = excluded.authority,
  source_tier = excluded.source_tier,
  tags = excluded.tags,
  deadline = coalesce(excluded.deadline, public.resource_bank.deadline),
  deadline_type = coalesce(excluded.deadline_type, public.resource_bank.deadline_type),
  status = case
    when public.resource_bank.status = 'valid' and public.resource_bank.last_verified_at is not null then public.resource_bank.status
    else excluded.status
  end,
  verification = case
    when public.resource_bank.status = 'valid' and public.resource_bank.last_verified_at is not null then public.resource_bank.verification
    else excluded.verification
  end,
  last_verified_at = case
    when public.resource_bank.status = 'valid' and public.resource_bank.last_verified_at is not null then public.resource_bank.last_verified_at
    else excluded.last_verified_at
  end,
  raw_snapshot = excluded.raw_snapshot,
  added_by = public.resource_bank.added_by,
  updated_at = now();
