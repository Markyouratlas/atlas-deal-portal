-- =====================================================
-- Atlas Deal Portal — Rep Notifications + Admin Calendar
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Idempotent (safe to re-run). Run AFTER the base migration.
-- Requires the `notify-rep` Edge Function to be deployed (see
-- supabase-functions/notify-rep/index.ts).
-- =====================================================

-- 1. NEW COLUMNS ---------------------------------------------------

-- Admin's personal booking link, surfaced in "Deal Qualified" emails.
alter table public.profiles add column if not exists calendar_url text;

-- Track who reviewed a deal and when (set by DealDetail.jsx on status change).
alter table public.deals add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.deals add column if not exists reviewed_at timestamptz;


-- 2. CALL notify-rep ON DEAL INSERT / STATUS CHANGE ---------------
-- Uses pg_net to POST to the Edge Function. Enable pg_net if it isn't already:
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_rep_on_deal_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_action  text;
  v_url     text := 'https://hkpglfdslglrjcgzbqpx.supabase.co/functions/v1/notify-rep';
  -- Optional: only needed if notify-rep was deployed WITH JWT verification.
  -- Set once with:  alter database postgres set app.notify_rep.service_key = '<service_role_key>';
  v_key     text := current_setting('app.notify_rep.service_key', true);
  v_headers jsonb := jsonb_build_object('Content-Type', 'application/json');
begin
  if (TG_OP = 'INSERT') then
    v_action := 'deal_submitted';
  elsif (TG_OP = 'UPDATE') then
    -- Only fire when the status actually changes.
    if (OLD.status is distinct from NEW.status) then
      if    (NEW.status = 'qualified') then v_action := 'deal_qualified';
      elsif (NEW.status = 'declined')  then v_action := 'deal_declined';
      end if;  -- pending / demo_booked: no rep email
    end if;
  end if;

  if v_action is null then
    return NEW;
  end if;

  if v_key is not null and v_key <> '' then
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_key);
  end if;

  perform net.http_post(
    url     := v_url,
    headers := v_headers,
    body    := jsonb_build_object('action', v_action, 'deal', to_jsonb(NEW))
  );

  return NEW;
end;
$$;

-- Fire on new deals (deal_submitted). This is a SEPARATE trigger from the
-- existing admin-facing notify-new-deal, so both coexist.
drop trigger if exists trg_notify_rep_insert on public.deals;
create trigger trg_notify_rep_insert
  after insert on public.deals
  for each row execute function public.notify_rep_on_deal_change();

-- Fire on status changes (deal_qualified / deal_declined).
drop trigger if exists trg_notify_rep_update on public.deals;
create trigger trg_notify_rep_update
  after update of status on public.deals
  for each row execute function public.notify_rep_on_deal_change();


-- =====================================================
-- DONE! You should see "Success. No rows returned."
--
-- Deploy the function:   supabase functions deploy notify-rep --no-verify-jwt
-- Set its secret:        supabase secrets set RESEND_API_KEY=<your key>
-- (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
--
-- If you deploy WITHOUT --no-verify-jwt, also run:
--   alter database postgres set app.notify_rep.service_key = '<service_role_key>';
-- =====================================================
