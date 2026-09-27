-- Migration 002: ml_models + risk_scores
-- Every row carries org_id; RLS gates access to the owning org.

-- ── ML Models registry ───────────────────────────────────────────────────────
create table ml_models (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  description text,
  model_type  text,
  use_case    text,
  owner_name  text,
  status      text not null default 'draft'
                check (status in ('draft', 'active', 'retired')),
  metadata    jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Risk scores ───────────────────────────────────────────────────────────────
create table risk_scores (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references orgs(id) on delete cascade,
  model_id   uuid not null references ml_models(id) on delete cascade,
  score      numeric not null check (score >= 0 and score <= 100),
  tier       text not null check (tier in ('low', 'medium', 'high', 'critical')),
  factors    jsonb not null default '{}',
  scored_at  timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table ml_models   enable row level security;
alter table risk_scores enable row level security;

create policy "ml_models_all_own_org"
  on ml_models for all
  using (org_id = (select org_id from user_profiles where id = auth.uid()))
  with check (org_id = (select org_id from user_profiles where id = auth.uid()));

create policy "risk_scores_all_own_org"
  on risk_scores for all
  using (org_id = (select org_id from user_profiles where id = auth.uid()))
  with check (org_id = (select org_id from user_profiles where id = auth.uid()));
