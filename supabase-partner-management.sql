-- =====================================================
-- Atlas Deal Portal — Partner Management + TSD/Rep + super_admin
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Safe to run more than once (idempotent): uses IF NOT EXISTS / drop-then-create.
-- This does NOT replace supabase-migration.sql — run it AFTER the base migration.
-- =====================================================

-- 1. NEW COLUMNS ---------------------------------------------------

-- TSD (Master Agent) captured at signup, denormalized onto each deal.
alter table public.profiles add column if not exists tsd_name text;

alter table public.deals add column if not exists tsd_name  text;
alter table public.deals add column if not exists rep_name  text;
alter table public.deals add column if not exists rep_email text;
alter table public.deals add column if not exists rep_phone text;


-- 2. ALLOW super_admin ROLE ---------------------------------------
-- Extend the profiles role check constraint to permit 'super_admin'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'partner', 'super_admin'));


-- 3. CAPTURE tsd_name ON SIGNUP -----------------------------------
-- Recreate the new-user trigger function so it also reads tsd_name
-- from the signup metadata (set by AuthScreen.jsx).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, company, contact_name, phone, tsd_name)
  values (
    new.id,
    new.email,
    'partner',
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'contact_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'tsd_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;
-- (the on_auth_user_created trigger from the base migration already calls this)


-- 4. RLS: treat super_admin like admin -----------------------------
-- Helper keeps every staff policy in sync and avoids repeating the role list.
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$ language sql security definer stable;

-- PROFILES: staff can read all profiles
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_staff());

-- DEALS: staff can read every deal  (this is the fix for "0 deals" in Partner Management)
drop policy if exists "Admins can read all deals" on public.deals;
create policy "Admins can read all deals"
  on public.deals for select
  using (public.is_staff());

-- DEALS: staff can update any deal
drop policy if exists "Admins can update all deals" on public.deals;
create policy "Admins can update all deals"
  on public.deals for update
  using (public.is_staff());

-- DEALS: staff can insert deals (e.g. registering on behalf of a partner)
drop policy if exists "Admins can insert deals" on public.deals;
create policy "Admins can insert deals"
  on public.deals for insert
  with check (public.is_staff());

-- NOTIFICATION CHANNELS: staff can manage
drop policy if exists "Admins can manage notification channels" on public.notification_channels;
create policy "Admins can manage notification channels"
  on public.notification_channels for all
  using (public.is_staff());


-- 5. PROMOTE A super_admin ----------------------------------------
-- Run once, with the real email, to grant yourself super_admin:
--
--   UPDATE public.profiles SET role = 'super_admin' WHERE email = 'YOUR_EMAIL_HERE';


-- =====================================================
-- DONE! You should see "Success. No rows returned."
--
-- NOTE: partner deletion (the trash button) calls a Supabase Edge Function
-- named "delete-user" at /functions/v1/delete-user. That function must be
-- deployed separately and should verify the caller is a super_admin
-- (service-role key required to delete an auth user + cascade their deals).
-- =====================================================
