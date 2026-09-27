-- Migration 004: gap_analyses
-- Stores Haiku-generated gap assessments per model per regulatory framework.
-- org_id RLS enforced on every row.

create table gap_analyses (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references orgs(id) on delete cascade,
  model_id     uuid not null references ml_models(id) on delete cascade,
  framework    text not null check (framework in ('sr117', 'ss123', 'eu_ai_act', 'nist_rmf')),
  items        jsonb not null default '[]',
  content_hash text,
  analysed_at  timestamptz default now()
);

alter table gap_analyses enable row level security;

create policy "gap_analyses_all_own_org"
  on gap_analyses for all
  using (org_id = (select org_id from user_profiles where id = auth.uid()))
  with check (org_id = (select org_id from user_profiles where id = auth.uid()));
