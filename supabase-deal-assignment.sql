-- =====================================================
-- Atlas Deal Portal — Deal assignment (assigned_to)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Idempotent (safe to re-run). Adds the per-deal assignee (an Atlas email)
-- so deals route to the right salesperson and the scorecard can filter each
-- person's view by channel_deals.assigned_to.
--
-- Rule: Sandler-sourced deals → Omer; everything else → Heather.
-- The portal app sets assigned_to on every new deal (DealForm) and lets admins
-- override it (DealDetail); this backfills existing rows by the same rule.
-- =====================================================

-- 1. ADD THE COLUMN -----------------------------------------------
-- Free text (the assignee's Atlas email). Intentionally no CHECK constraint,
-- so adding a third salesperson later needs no migration.
alter table public.deals add column if not exists assigned_to text;


-- 2. BACKFILL EXISTING ROWS ---------------------------------------
-- Same rule as the app. (All current deals are non-Sandler → Heather, but this
-- is rule-based so it stays correct if a Sandler deal already exists.)
update public.deals
  set assigned_to = case
        when lower(trim(coalesce(tsd_name, ''))) = 'sandler' then 'omer@youratlas.com'
        else 'heather@youratlas.com'
      end
  where assigned_to is null;


-- =====================================================
-- DONE! You should see "Success. N rows affected."
-- The existing portal→scorecard DB webhook sends the native full-row payload,
-- so assigned_to reaches the scorecard automatically now that the column exists.
-- Verify:  select assigned_to, count(*) from public.deals group by 1 order by 1;
-- =====================================================
