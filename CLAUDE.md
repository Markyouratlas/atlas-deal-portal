# CLAUDE.md — Atlas Channel Partner Deal Portal

Guidance for Claude Code working in this repo. Live at `deals.youratlas.com`.

## Stack

- **Vite + React 18** SPA (no router — view state in `src/App.jsx`), **Tailwind**, **lucide-react** icons.
- **Supabase** backend: Postgres + Auth + Realtime + Edge Functions (Deno). Client in `src/lib/supabase.js` (uses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- Supabase project ref: **`hkpglfdslglrjcgzbqpx`**. Deployed on Vercel from `main`.
- Commands: `npm run dev`, `npm run build`, `npm run preview`.

## Roles & auth

- Profiles have `role`: `partner` | `admin` | `super_admin` (constraint set in `supabase-partner-management.sql`).
- Treat **`admin` and `super_admin` as staff** — use the SQL helper `public.is_staff()` in RLS policies. In JS, `isAdmin = role === 'admin' || role === 'super_admin'`.
- `super_admin` additionally manages admins (`AdminManagement.jsx`).
- Partners see only their own deals; staff see all (RLS enforced).

## Deals & statuses (the important part)

- The portal writes to its own table **`public.deals`** — NOT `channel_deals`. There is no `channel_deals` table or `origin` column in this repo.
- **`deals.status` is stored as slugs.** Full set (also the `deals_status_check` DB constraint) — 3 portal-only review states + the 7 Attio pipeline stages (1:1 with Attio stage titles):
  `pending`, `qualified`, `declined`, `intro_call_pre_demo`, `demo_scheduled`, `demo_complete`, `poc_proposal_sent`, `closed_won`, `closed_lost`, `closed_churned`.
  Legacy `demo_booked` was **retired** in Phase B (migrated to `demo_scheduled`).
- **`STATUS_CONFIG` in `src/lib/constants.js` is the single source of truth for the UI** (label, colors, icon, dot, `emails` flag), keyed by the stored slug. `statusTooltip(slug)` builds the hover tooltip (email behavior + Attio-linked note); `StatusBadge` and the `DealDetail.jsx` admin buttons use it. `DealDetail.jsx` admin buttons and `AdminDashboard.jsx` filter chips iterate `Object.entries(STATUS_CONFIG)`, so adding a status there surfaces it everywhere automatically. Exceptions that hardcode slugs: `PartnerManagement.jsx` (`COUNT_KEYS`), `PartnerDashboard.jsx` / `AdminDashboard.jsx` stat tiles.
- If you add/change a status slug, you MUST also update the `deals_status_check` constraint (latest is `supabase-phase-b-vocab.sql`) **and** the `KNOWN_STATUSES` set in `supabase/functions/deal-sync-inbound/index.ts`, or saves/sync are rejected.

## Scorecard integration (cross-project)

- The portal and Heather's Attio CRM both feed a separate app called **"scorecard"**, which aggregates deals into its own `channel_deals` table and computes "Open Partner Pipeline".
- Sync path: a **Supabase Dashboard DB webhook** (configured in the dashboard, NOT in this repo) forwards `deals` rows to the scorecard, passing `status` through **verbatim**. Don't add a status allowlist that would block forwarding.
- The scorecard's status matcher is **tolerant** (normalizes case / underscores / spacing), so slugs like `closed_won` bucket correctly: `closed_won` → Won; `closed_lost`, `closed_churned`, `declined` → Lost; everything else → Open (counts toward pipeline).
- Because of this, **keep new statuses as tidy slugs** matching the portal's convention.

## Phase B: bidirectional deal sync

Full contract: **`docs/phase-b-integration.md`** (mirrored in the `csm-scorecard` repo). Deal **stage**
syncs in all directions between Attio, the scorecard `channel_deals`, and the portal `deals`, all keyed
by the same id (`external_id` = `channel_deals.id` = `deals.id`).

- **Down-sync (scorecard → portal)** is owned here: edge function **`supabase/functions/deal-sync-inbound/index.ts`**.
  It receives the scorecard's `channel_deals` **DB-webhook** native payload (`{ type, record, old_record, … }`),
  authenticates on the **`X-Sync-Secret`** header (matches the `SYNC_SECRET` Supabase secret), and
  **UPDATEs `deals` by `id`, status-only, write-if-changed** (the compare-and-skip is the loop guard).
  It only acts on `record.origin === 'portal'` and never INSERTs.
- **Loop safety:** every writer is write-if-changed; a change travels the ring once and stops. `deal-sync-inbound`'s
  "already in sync" no-op is one of those guards.
- **v1 is status-only** — value (`avg_value`) sync is deferred.
- To enable the down-sync in production: `supabase secrets set SYNC_SECRET=…`, deploy the function, and have
  the scorecard side point a `channel_deals` DB webhook at it with the matching `X-Sync-Secret` header.

## Email notifications (rep/partner emails)

- Edge Function **`supabase/functions/notify-rep/index.ts`** sends branded emails via **Resend** (`RESEND_API_KEY` secret). Recipient is always the **rep/partner**, resolved from `deal.rep_email` or the partner profile — **never the end business client.**
- Fired by a Postgres trigger, `notify_rep_on_deal_change()` in **`supabase-rep-notifications.sql`** (uses `pg_net` to POST to the function). Also `notify-new-deal` exists but is deployed outside this repo.
- **Which status changes email, and how it's controlled:**
  - `qualified` → `deal_qualified`, `declined` → `deal_declined`: **always on**, hardcoded in the trigger. No flag.
  - `pending` (on submit only) → `deal_submitted`; the pipeline stages (`intro_call_pre_demo`, `demo_scheduled`, `demo_complete`, `poc_proposal_sent`): never email.
  - `closed_won` / `closed_lost` / `closed_churned`: **gated by a DB flag, OFF by default.**
- Sync-driven status changes (from `deal-sync-inbound`) never email **by construction** — sync only ever writes pipeline/closed slugs, none of which hit a live email branch (see the Phase B section).

### The closed-deal email flag (no UI — deliberate)

There is **no toggle in the app UI**. The switch is a single row in `public.app_settings`:

```sql
-- Enable closed-deal emails to reps (off by default):
update public.app_settings set value = 'true'  where key = 'closed_deal_emails';
-- Disable again:
update public.app_settings set value = 'false' where key = 'closed_deal_emails';
```

The trigger reads that row on each status change; the `notify-rep` function already ships the
`deal_closed_won` / `deal_closed_lost` / `deal_closed_churned` templates. So flipping the flag is the
*entire* enable/disable action — no code change and no redeploy. (An admin-UI toggle was considered
and intentionally not built; if ever wanted, it would read/write this same row.)

## SQL files (run in the Supabase SQL editor; all idempotent)

Run order:
1. `supabase-migration.sql` — base schema (profiles, deals, notification_channels, RLS, realtime).
2. `supabase-partner-management.sql` — `super_admin` role, `is_staff()`, TSD/rep fields.
3. `supabase-rep-notifications.sql` — rep-email trigger + `notify-rep` wiring; reads the `closed_deal_emails` flag.
4. `supabase-deal-closing-statuses.sql` — relaxes `deals_status_check` for the closing slugs; creates `app_settings` seeded with `closed_deal_emails = false`.
5. `supabase-phase-b-vocab.sql` — relaxes `deals_status_check` to the full 10-slug vocabulary and migrates `demo_booked` → `demo_scheduled`. **Run before/with the frontend deploy.**

## Edge Function deploy

Repo is a linked Supabase CLI project (`supabase/config.toml`, project ref above). Both functions have
`verify_jwt = false` in config (`notify-rep` is called by the DB trigger with the service key;
`deal-sync-inbound` authenticates on `X-Sync-Secret`), replacing the deprecated `--no-verify-jwt` flag.

```
supabase functions deploy notify-rep
supabase functions deploy deal-sync-inbound
```

`supabase/.temp/` is CLI-local cache and gitignored — never commit it.

## Conventions

- Match the existing terse, single-line JSX style; Tailwind utility classes inline; brand purple `#6639a6`.
- Prefer extending `STATUS_CONFIG` / RLS helpers over hardcoding new lists.
