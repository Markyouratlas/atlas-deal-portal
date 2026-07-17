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
- **`deals.status` is stored as slugs.** Full set (also the `deals_status_check` DB constraint):
  `pending`, `qualified`, `declined`, `demo_booked`, `closed_won`, `closed_lost`, `closed_churned`.
- **`STATUS_CONFIG` in `src/lib/constants.js` is the single source of truth for the UI** (label, colors, icon, dot), keyed by the stored slug. `DealDetail.jsx` admin buttons and `AdminDashboard.jsx` filter chips iterate `Object.entries(STATUS_CONFIG)`, so adding a status there surfaces it everywhere automatically. Exceptions that hardcode slugs: `PartnerManagement.jsx` (`COUNT_KEYS`), `PartnerDashboard.jsx` / `AdminDashboard.jsx` stat tiles.
- If you add/change a status slug, you MUST also update the `deals_status_check` constraint (see `supabase-deal-closing-statuses.sql`) or saves are rejected.

## Scorecard integration (cross-project)

- The portal and Heather's Attio CRM both feed a separate app called **"scorecard"**, which aggregates deals into its own `channel_deals` table and computes "Open Partner Pipeline".
- Sync path: a **Supabase Dashboard DB webhook** (configured in the dashboard, NOT in this repo) forwards `deals` rows to the scorecard, passing `status` through **verbatim**. Don't add a status allowlist that would block forwarding.
- The scorecard's status matcher is **tolerant** (normalizes case / underscores / spacing), so slugs like `closed_won` bucket correctly: `closed_won` → Won; `closed_lost`, `closed_churned`, `declined` → Lost; everything else → Open (counts toward pipeline).
- Because of this, **keep new statuses as tidy slugs** matching the portal's convention. Do NOT rename existing stages to Attio's display strings — that would touch the email/CTA logic keyed on `'qualified'` and need a data migration, for no benefit.

## Email notifications (rep/partner emails)

- Edge Function **`supabase/functions/notify-rep/index.ts`** sends branded emails via **Resend** (`RESEND_API_KEY` secret). Recipient is always the **rep/partner**, resolved from `deal.rep_email` or the partner profile — **never the end business client.**
- Fired by a Postgres trigger, `notify_rep_on_deal_change()` in **`supabase-rep-notifications.sql`** (uses `pg_net` to POST to the function). Also `notify-new-deal` exists but is deployed outside this repo.
- **Which status changes email, and how it's controlled:**
  - `qualified` → `deal_qualified`, `declined` → `deal_declined`: **always on**, hardcoded in the trigger. No flag.
  - `pending` / `demo_booked`: never email.
  - `closed_won` / `closed_lost` / `closed_churned`: **gated by a DB flag, OFF by default.**

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

## Edge Function deploy

Repo is a linked Supabase CLI project (`supabase/config.toml`, project ref above). `notify-rep` has
`verify_jwt = false` in config (it's called by the DB trigger with the service key), replacing the
deprecated `--no-verify-jwt` flag.

```
supabase functions deploy notify-rep
```

`supabase/.temp/` is CLI-local cache and gitignored — never commit it.

## Conventions

- Match the existing terse, single-line JSX style; Tailwind utility classes inline; brand purple `#6639a6`.
- Prefer extending `STATUS_CONFIG` / RLS helpers over hardcoding new lists.
