-- =====================================================
-- Atlas Deal Portal — Deal-closing statuses + email flag
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Idempotent (safe to re-run). Run AFTER the base migration and
-- supabase-partner-management.sql (it relies on public.is_staff()).
--
-- Adds three closing statuses so deals can leave the open pipeline and
-- sync to the scorecard as Won / Lost / Lost. Stored as slugs to match the
-- portal's existing convention (pending / demo_booked / ...); the scorecard's
-- status matcher normalizes case/underscores/spacing.
-- =====================================================

-- 1. ALLOW THE NEW STATUS SLUGS -----------------------------------
-- The base migration created an inline CHECK on deals.status (auto-named
-- deals_status_check). Relax it to permit the three closing statuses,
-- otherwise saving a closed deal is rejected.
alter table public.deals drop constraint if exists deals_status_check;
alter table public.deals
  add constraint deals_status_check
  check (status in (
    'pending', 'qualified', 'declined', 'demo_booked',
    'closed_won', 'closed_lost', 'closed_churned'
  ));


-- 2. APP SETTINGS: closed-deal email toggle -----------------------
-- Small key/value settings table. The closed-deal email capability is built
-- but OFF by default: setting a deal closed sends NO email until this flips.
-- Enable later with (no code redeploy needed):
--   update public.app_settings set value = 'true' where key = 'closed_deal_emails';
create table if not exists public.app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into public.app_settings (key, value)
values ('closed_deal_emails', 'false')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

-- Staff (admin / super_admin) can read + manage settings from the app.
-- The notify-rep trigger reads this table via SECURITY DEFINER and bypasses RLS.
drop policy if exists "Staff can manage app settings" on public.app_settings;
create policy "Staff can manage app settings"
  on public.app_settings for all
  using (public.is_staff());


-- =====================================================
-- DONE! You should see "Success. No rows returned."
-- Verify:  select * from public.app_settings;   -- closed_deal_emails = false
-- =====================================================
