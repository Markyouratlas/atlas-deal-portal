-- =====================================================
-- Atlas Deal Portal — Phase B: full Attio pipeline vocabulary
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Idempotent (safe to re-run). Run AFTER supabase-deal-closing-statuses.sql.
-- Supersedes the deals_status_check constraint defined there.
--
-- Adopts the full Attio pipeline as portal slugs so deal stage syncs
-- bidirectionally Attio <-> Scorecard <-> Portal (see docs/phase-b-integration.md),
-- and retires the legacy `demo_booked` slug in favor of `demo_scheduled`.
--
-- ⚠️ Run this BEFORE (or together with) the frontend deploy so no live deal is
-- left on the removed `demo_booked` slug.
-- =====================================================

-- ORDER MATTERS: drop the old constraint, MIGRATE the data, THEN add the new
-- constraint — otherwise existing `demo_booked` rows violate the new constraint
-- (which no longer lists `demo_booked`).

-- 1. DROP THE OLD CONSTRAINT --------------------------------------
alter table public.deals drop constraint if exists deals_status_check;


-- 2. MIGRATE LEGACY demo_booked -> demo_scheduled -----------------
-- One-time. Fires the rep trigger (demo_scheduled has no email branch → no email)
-- and the portal→scorecard webhook once per row (harmless). Best run off-peak.
update public.deals
  set status = 'demo_scheduled', updated_at = now()
  where status = 'demo_booked';


-- 3. ADD THE NEW CONSTRAINT ---------------------------------------
-- Final vocabulary: 3 portal-only review states + 7 Attio pipeline stages.
-- `demo_booked` is intentionally NOT included (migrated above).
-- If this still fails, some row holds an unexpected status — find it with:
--   select distinct status from public.deals order by status;
alter table public.deals
  add constraint deals_status_check
  check (status in (
    -- portal-only review states
    'pending', 'qualified', 'declined',
    -- Attio pipeline stages (1:1 with Attio stage titles)
    'intro_call_pre_demo', 'demo_scheduled', 'demo_complete', 'poc_proposal_sent',
    'closed_won', 'closed_lost', 'closed_churned'
  ));


-- =====================================================
-- DONE! You should see "Success. N rows returned/affected."
-- Verify:
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'deals_status_check';
--   select count(*) from public.deals where status = 'demo_booked';   -- expect 0
-- =====================================================
