-- Migration 003: validation_docs + drift_metrics + audit_log
-- audit_log is append-only: an BEFORE UPDATE/DELETE trigger raises an exception.
-- The INSERT-only RLS policy ensures app-layer code cannot bypass this via the
-- anon key; the service-role key (server-side only) is used for inserts.

-- ── Validation documents ─────────────────────────────────────────────────────
create table validation_docs (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references orgs(id) on delete cascade,
  model_id   uuid not null references ml_models(id) on delete cascade,
  sections   jsonb not null default '{}',
  status     text not null default 'draft'
               check (status in ('draft', 'in_review', 'approved')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Drift metrics ─────────────────────────────────────────────────────────────
create table drift_metrics (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references orgs(id) on delete cascade,
  model_id    uuid not null references ml_models(id) on delete cascade,
  metric_type text not null check (metric_type in ('psi', 'ks', 'csi')),
  value       numeric not null,
  threshold   numeric,
  breached    boolean not null default false,
  recorded_at timestamptz default now()
);

-- ── Audit log (append-only) ───────────────────────────────────────────────────
create table audit_log (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null,
  actor_id   uuid references auth.users(id),
  action     text not null,
  table_name text not null,
  row_id     uuid,
  payload    jsonb,
  created_at timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table validation_docs enable row level security;
alter table drift_metrics   enable row level security;
alter table audit_log       enable row level security;

create policy "validation_docs_all_own_org"
  on validation_docs for all
  using (org_id = (select org_id from user_profiles where id = auth.uid()))
  with check (org_id = (select org_id from user_profiles where id = auth.uid()));

create policy "drift_metrics_all_own_org"
  on drift_metrics for all
  using (org_id = (select org_id from user_profiles where id = auth.uid()))
  with check (org_id = (select org_id from user_profiles where id = auth.uid()));

-- audit_log: SELECT only via RLS; INSERT is service-role only (bypasses RLS)
create policy "audit_log_select_own_org"
  on audit_log for select
  using (org_id = (select org_id from user_profiles where id = auth.uid()));

-- ── Append-only trigger ───────────────────────────────────────────────────────
-- Fires BEFORE UPDATE or DELETE on every row.
-- Raises an exception so the operation is rolled back and the caller gets an error.
create or replace function block_audit_log_mutations()
returns trigger
language plpgsql
security definer
as $$
begin
  raise exception
    'audit_log is append-only: % operations are not permitted. '
    'Row id: %', TG_OP, OLD.id;
end;
$$;

create trigger enforce_audit_log_append_only
  before update or delete on audit_log
  for each row
  execute function block_audit_log_mutations();
