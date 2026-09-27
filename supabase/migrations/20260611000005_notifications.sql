-- Migration 005: notifications
-- Stores a record of every outbound notification sent by the app (email alerts, etc.).
-- Insert-only from service role; users can read their own org's notification history.

create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references orgs(id) on delete cascade,
  model_id   uuid references ml_models(id) on delete set null,
  type       text not null check (type in ('drift_breach', 'doc_refresh', 'gap_alert')),
  recipient  text not null,
  payload    jsonb,
  sent_at    timestamptz default now()
);

alter table notifications enable row level security;

create policy "notifications_select_own_org"
  on notifications for select
  using (org_id = (select org_id from user_profiles where id = auth.uid()));
