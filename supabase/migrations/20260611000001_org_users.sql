-- Migration 001: orgs + user_profiles
-- Multi-tenancy foundation: every subsequent table has org_id FK back to orgs.

create extension if not exists "uuid-ossp";

-- ── Organizations ────────────────────────────────────────────────────────────
create table orgs (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz default now()
);

-- ── User profiles (extends auth.users) ───────────────────────────────────────
create table user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references orgs(id) on delete cascade,
  role       text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table orgs          enable row level security;
alter table user_profiles enable row level security;

-- orgs: members can read their own org only
create policy "orgs_select_own"
  on orgs for select
  using (id = (select org_id from user_profiles where id = auth.uid()));

-- user_profiles: members can read all profiles in their org
create policy "user_profiles_select_own_org"
  on user_profiles for select
  using (org_id = (select org_id from user_profiles where id = auth.uid()));

-- user_profiles: a user can create their own profile row on sign-up
create policy "user_profiles_insert_self"
  on user_profiles for insert
  with check (id = auth.uid());
