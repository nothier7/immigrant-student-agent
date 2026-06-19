# Admin Resource Operations Console Design

## Context

The app currently has two resource planes:

- `resource_bank`: the AI assistant's resource bank, maintained by verifier/discovery jobs and served in chat cards.
- Public directory tables: `resources`, `scholarships`, and `mentorships`, maintained through Next.js/Supabase routes and link checks.

The current `/admin` page only shows `resource_bank` items in `pending_review`. It does not explain why chat cards still say `link check pending`, which resources are stale, what discovery found, or what state public-directory links are in.

## Goals

- Replace `/admin` with a unified admin console for both the AI resource bank and public directory resources.
- Show real status instead of a vague pending state:
  - AI bank: `pending_review`, `unverified`, `valid`, `stale`, `unverifiable`.
  - Public directory: `pending`, `active`, `archived`, plus `link_status`, `link_checked_at`, and `link_fail_count`.
- Provide tabs for:
  - Overview
  - AI Bank
  - Discovery
  - Verification
  - Directory Links
  - Manual Review
  - Logs
- Support filters by source, status, date range, and search text.
- Show which records came from a discovery/verification run when run metadata exists, and group legacy records by date/run-like buckets when it does not.
- Keep the visual style scoped to `/admin`; do not change the main app design.

## Non-Goals

- Do not redesign the public homepage, chat UI, resources directory, or global theme.
- Do not expose AWS credentials to the browser.
- Do not auto-approve discovered resources. Human review remains required before discovered resources can move into verification.

## Visual Direction

Use a self-contained light admin shell under `/admin`.

Palette:

- Neutral base for page shell, panels, filters, and tables.
- Amber for manual review or human attention.
- Green for verified/healthy resources.
- Red for stale, broken, or failed resources.
- Violet for discovery-generated records and run metadata.
- Gray for neutral pending/system states.

This palette applies only to admin surfaces.

## Architecture

Use a Next.js-owned admin console backed by server-only API routes.

Frontend:

- Replace `src/app/admin/page.tsx` with a table-first operations dashboard.
- Keep the admin key unlock flow already used by the current page.
- Store the admin key in `sessionStorage` only, matching the current behavior.

Next.js admin APIs:

- `GET /api/admin/resources`
  - Requires `x-admin-key`.
  - Reads from Supabase with the service role key.
  - Returns normalized rows from `resource_bank`, `resources`, `scholarships`, and `mentorships`.
  - Supports query params: `source`, `status`, `q`, `dateFrom`, `dateTo`, `tab`, `limit`.
- `POST /api/admin/resource-action`
  - Requires `x-admin-key`.
  - Supports resource actions:
    - AI bank: approve, reject, recheck-requested, mark-valid-override, mark-stale.
    - Public directory: archive, restore/activate, run-link-check for one item.
- `POST /api/admin/run-link-check`
  - Requires `x-admin-key`.
  - Calls existing link-check logic for public directory tables.

Existing Python admin endpoints can remain for compatibility, but the new `/admin` page should not depend on the Python backend just to list resources.

## Data Model

Normalize resource rows in the API response:

```ts
type AdminResourceRow = {
  id: string;
  source: "resource_bank" | "resources" | "scholarships" | "mentorships";
  kind: "ai-bank" | "resource" | "scholarship" | "mentorship";
  name: string;
  url: string | null;
  description: string | null;
  authority: string | null;
  status: string;
  healthStatus: "pending" | "verified" | "stale" | "unverifiable" | "broken" | "restricted" | "unknown";
  addedBy: string | null;
  runKey: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  reason: string | null;
};
```

Run visibility:

- If `verification.checked_at` exists in `resource_bank.verification`, use it for verification grouping.
- If a discovered record has no explicit run id, group by `added_by = discovery` and `created_at` date.
- Future improvement: add a formal `resource_job_runs` table and write run ids from Lambda jobs. The admin UI should be structured so that adding this table later only improves the `runKey` field.

## UX Details

Overview tab:

- Summary cards: total AI bank rows, manual review count, stale/broken count, verified count, last run time.
- Needs Attention table combining:
  - `resource_bank.pending_review`
  - `resource_bank.stale`
  - `resource_bank.unverifiable`
  - public rows with missing `link_checked_at` or broken/timeout `link_status`

AI Bank tab:

- Shows all `resource_bank` rows with status, authority, source tier, tags, last verified date, and reason.

Discovery tab:

- Shows `added_by = discovery` rows.
- Groups by `runKey`.
- Surfaces missing URL, duplicate-looking entries, and pending review items.

Verification tab:

- Shows verifier outcomes by status.
- Makes it obvious when all chat resources are stale/unverifiable, which explains why chat cards do not show verified.

Directory Links tab:

- Shows `resources`, `scholarships`, and `mentorships`.
- Uses `link_status`, `link_checked_at`, `link_fail_count`, and public table `status`.

Manual Review tab:

- Focuses on records needing admin decisions.
- Supports approve/reject for AI bank candidates and archive/activate for public directory records.

Logs tab:

- V1 can show latest run summary derived from DB fields.
- AWS CloudWatch log streaming is not required in V1.

## Security

- All admin APIs require `x-admin-key`.
- The service role key stays server-side only.
- No AWS credentials are sent to the browser.
- Any future Lambda trigger endpoint must be server-only and separately protected by `x-admin-key`.

## Error Handling

- If the admin key is missing or wrong, return 401 and clear the stored session key.
- If Supabase queries fail, show a non-destructive error banner and preserve current filters.
- If an action fails, keep the row visible and show the action error inline or in the banner.
- If a row has no URL, show it as a manual-review issue instead of trying to link-check it.

## Testing

- Run `npm run build`.
- Add focused tests only if the project test setup supports API helpers cleanly; otherwise validate with:
  - admin resources API returns normalized rows.
  - date/status/source filters work.
  - pending review actions still work.
  - public directory link status fields display correctly.

## Implementation Notes

- Keep `/admin` client-side because it depends on session-stored admin key and interactive filters.
- Prefer small helpers for normalization rather than embedding table-specific logic throughout the component.
- Do not import AWS SDK in V1.
- Do not change main app theme files unless a scoped admin-only class/token is needed.
