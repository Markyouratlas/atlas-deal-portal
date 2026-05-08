-- =====================================================
-- Atlas Deal Portal — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================

-- 1. PROFILES TABLE
-- Auto-created when a user signs up via the trigger below
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null default 'partner' check (role in ('admin', 'partner')),
  company text,
  contact_name text,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- Pulls company/contact_name/phone from the signup metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, company, contact_name, phone)
  values (
    new.id,
    new.email,
    'partner',
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'contact_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 3. DEALS TABLE
create table public.deals (
  id uuid default gen_random_uuid() primary key,
  partner_id uuid references public.profiles(id) on delete cascade not null,
  partner_company text,
  partner_contact text,
  business_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  call_volume text,
  call_volume_flag text check (call_volume_flag in ('green', 'red')),
  connects_100 text check (connects_100 in ('yes', 'no')),
  connects_100_flag text check (connects_100_flag in ('green', 'red')),
  connects_100_detail text,
  avg_value text,
  avg_value_flag text check (avg_value_flag in ('green', 'red')),
  crm text,
  pain_point text,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'declined', 'demo_booked')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deals enable row level security;

-- Partners can only see their own deals
create policy "Partners can read own deals"
  on public.deals for select
  using (auth.uid() = partner_id);

-- Partners can insert deals (only for themselves)
create policy "Partners can insert own deals"
  on public.deals for insert
  with check (auth.uid() = partner_id);

-- Admins can see ALL deals
create policy "Admins can read all deals"
  on public.deals for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update any deal (status changes, notes)
create policy "Admins can update all deals"
  on public.deals for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can also insert deals
create policy "Admins can insert deals"
  on public.deals for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- 4. NOTIFICATION CHANNELS TABLE (admin-only)
create table public.notification_channels (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('slack', 'email', 'webhook')),
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz default now()
);

alter table public.notification_channels enable row level security;

create policy "Admins can manage notification channels"
  on public.notification_channels for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- 5. ENABLE REALTIME on deals table so dashboards update live
alter publication supabase_realtime add table public.deals;


-- 6. SEED: Promote Heather to admin AFTER she signs up
-- Run this AFTER Heather creates her account with heather@youratlas.com:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'heather@youratlas.com';
--
-- Or to promote yourself during testing:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'YOUR_EMAIL_HERE';


-- =====================================================
-- DONE! You should see "Success. No rows returned."
-- =====================================================
