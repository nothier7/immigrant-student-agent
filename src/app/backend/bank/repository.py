# bank/repository.py — the only module that talks to the database.
# Everything else (serving, verifier, discovery) calls these functions.

from __future__ import annotations

import json
from datetime import date, datetime
from uuid import UUID

import asyncpg

from bank.models import Resource

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    # jsonb round-trips as dicts instead of strings.
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    # pgvector round-trips as lists of floats (needed by find_similar/insert_candidate).
    try:
        from pgvector.asyncpg import register_vector

        await register_vector(conn)
    except Exception:
        # The vector extension may not exist yet (migration not applied);
        # everything except embeddings still works.
        pass


async def init_pool(dsn: str) -> None:
    """Open a reusable pool of DB connections once at startup."""
    global _pool
    _pool = await asyncpg.create_pool(dsn, init=_init_connection)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool_ready() -> bool:
    return _pool is not None


_COLUMNS = (
    "id, name, description, url, category, authority, source_tier, tags, "
    "deadline, deadline_type, status, last_verified_at, verification, "
    "added_by, created_at, updated_at"
)


def _to_resource(row: asyncpg.Record) -> Resource:
    return Resource(**dict(row))


# ---------- Serving (Layer 2) ----------

async def get_active_resources(
    tags: list[str] | None = None,
    status_in: tuple[str, ...] = ("valid", "unverified", "unverifiable"),
    limit: int = 8,
) -> list[Resource]:
    """Rows whose status is allowed and whose tags overlap the requested tags.

    && is array overlap; the `is null or` makes the tag filter optional.
    $1/$2/$3 are parameterized placeholders — user input never lands in SQL.
    """
    sql = f"""
        select {_COLUMNS} from resource_bank
        where status = any($1)
          and nullif(trim(url), '') is not null
          and ($2::text[] is null or tags && $2)
        order by source_tier asc, created_at desc
        limit $3
    """
    async with _pool.acquire() as conn:
        rows = await conn.fetch(sql, list(status_in), tags, limit)
    return [_to_resource(r) for r in rows]


async def get_directory_resources(
    tags: list[str] | None = None,
    school_code: str | None = "ccny",
    limit: int = 8,
) -> list[Resource]:
    """Fallback serving path for the public directory tables.

    `/admin` and `/resources` manage these rows separately from `resource_bank`.
    When the AI bank has no valid matches, the chat agent should still be able
    to answer from active curated scholarships/resources/mentorships.
    """
    sql = """
        with directory as (
          select
            id,
            name,
            description,
            url,
            category,
            authority,
            1::smallint as source_tier,
            array_remove(array_cat(eligibility_tags, array['scholarship', category]), null) as tags,
            null::date as deadline,
            null::text as deadline_type,
            case when coalesce(link_status, 'ok') in ('broken', 'timeout') then 'stale' else 'valid' end as status,
            link_checked_at as last_verified_at,
            jsonb_build_object('source', 'scholarships', 'link_status', coalesce(link_status, 'unknown')) as verification,
            'directory'::text as added_by,
            created_at,
            updated_at,
            schools,
            0 as source_order
          from scholarships
          where status = 'active'
            and nullif(trim(url), '') is not null
            and coalesce(link_status, 'ok') not in ('broken', 'timeout')

          union all

          select
            id,
            name,
            description,
            url,
            category,
            authority,
            2::smallint as source_tier,
            array_remove(array_cat(eligibility_tags, array[category]), null) as tags,
            null::date as deadline,
            null::text as deadline_type,
            case when coalesce(link_status, 'ok') in ('broken', 'timeout') then 'stale' else 'valid' end as status,
            link_checked_at as last_verified_at,
            jsonb_build_object('source', 'resources', 'link_status', coalesce(link_status, 'unknown')) as verification,
            'directory'::text as added_by,
            created_at,
            updated_at,
            schools,
            1 as source_order
          from resources
          where status = 'active'
            and nullif(trim(url), '') is not null
            and coalesce(link_status, 'ok') not in ('broken', 'timeout')

          union all

          select
            id,
            name,
            description,
            url,
            category,
            authority,
            2::smallint as source_tier,
            array_remove(array[category, 'general'], null) as tags,
            null::date as deadline,
            null::text as deadline_type,
            case when coalesce(link_status, 'ok') in ('broken', 'timeout') then 'stale' else 'valid' end as status,
            link_checked_at as last_verified_at,
            jsonb_build_object('source', 'mentorships', 'link_status', coalesce(link_status, 'unknown')) as verification,
            'directory'::text as added_by,
            created_at,
            updated_at,
            schools,
            2 as source_order
          from mentorships
          where status = 'active'
            and nullif(trim(url), '') is not null
            and coalesce(link_status, 'ok') not in ('broken', 'timeout')
        )
        select id, name, description, url, category, authority, source_tier,
               tags, deadline, deadline_type, status, last_verified_at,
               verification, added_by, created_at, updated_at
        from directory
        where ($1::text[] is null or tags && $1)
          and (
            $2::text is null
            or coalesce(array_length(schools, 1), 0) = 0
            or $2 = any(schools)
          )
        order by source_order asc, source_tier asc, updated_at desc
        limit $3
    """
    async with _pool.acquire() as conn:
        rows = await conn.fetch(sql, tags, school_code, limit)
    return [_to_resource(r) for r in rows]


# ---------- Verifier (Layer 3) ----------

async def set_status(
    resource_id: UUID,
    status: str,
    verification: dict | None = None,
    last_verified_at: datetime | None = None,
    deadline: date | None = None,
    deadline_type: str | None = None,
) -> None:
    """The verifier's write path: status, verification jsonb, timestamp, and
    the selected deadline (if one was found)."""
    sql = """
        update resource_bank
           set status = $2,
               verification = $3,
               last_verified_at = $4,
               deadline = coalesce($5, deadline),
               deadline_type = coalesce($6, deadline_type)
         where id = $1
    """
    async with _pool.acquire() as conn:
        await conn.execute(
            sql, resource_id, status, verification, last_verified_at, deadline, deadline_type
        )


async def resources_due_for_verification(
    max_age_hours: int = 24, limit: int = 100
) -> list[Resource]:
    """Resources never verified, or last verified more than max_age_hours ago.
    pending_review rows wait for human approval before the verifier touches them."""
    sql = f"""
        select {_COLUMNS} from resource_bank
        where status != 'pending_review'
          and (
                status = 'unverified'
                or last_verified_at is null
                or last_verified_at < now() - ($1 || ' hours')::interval
              )
        order by last_verified_at asc nulls first
        limit $2
    """
    async with _pool.acquire() as conn:
        rows = await conn.fetch(sql, str(max_age_hours), limit)
    return [_to_resource(r) for r in rows]


# ---------- Discovery (Layer 4) ----------

async def url_exists(url: str) -> bool:
    async with _pool.acquire() as conn:
        return await conn.fetchval(
            "select exists(select 1 from resource_bank where url = $1)", url
        )


async def find_similar(embedding: list[float], threshold: float = 0.15) -> Resource | None:
    """Nearest resource by cosine distance (<=>); a hit within threshold means
    'we already have this' even if the name/URL differ."""
    sql = f"""
        select {_COLUMNS}, embedding <=> $1 as distance
        from resource_bank
        where embedding is not null
        order by embedding <=> $1
        limit 1
    """
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(sql, embedding)
    if row and row["distance"] < threshold:
        return Resource(**{k: row[k] for k in row.keys() if k != "distance"})
    return None


async def insert_candidate(candidate, embedding: list[float], tier: int = 2) -> None:
    """Web-discovered candidates land as pending_review (human gate);
    they only become servable after approve() + a verifier pass."""
    sql = """
        insert into resource_bank (name, description, url, tags, source_tier, status, embedding, added_by)
        values ($1, $2, $3, $4, $5, 'pending_review', $6, 'discovery')
        on conflict (url) do nothing
    """
    async with _pool.acquire() as conn:
        await conn.execute(
            sql, candidate.name, candidate.description, candidate.url,
            candidate.tags, tier, embedding,
        )


async def list_pending() -> list[Resource]:
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            f"select {_COLUMNS} from resource_bank where status = 'pending_review' order by created_at asc"
        )
    return [_to_resource(r) for r in rows]


async def approve(resource_id: UUID) -> None:
    """Hand the candidate to the verifier: pending_review -> unverified."""
    async with _pool.acquire() as conn:
        await conn.execute(
            "update resource_bank set status = 'unverified' where id = $1 and status = 'pending_review'",
            resource_id,
        )


async def reject(resource_id: UUID) -> None:
    async with _pool.acquire() as conn:
        await conn.execute(
            "delete from resource_bank where id = $1 and status = 'pending_review'",
            resource_id,
        )
