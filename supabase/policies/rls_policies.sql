-- Reference copy of all RLS policies and the audit_log append-only trigger.
-- These are applied via supabase/migrations/. Do NOT run this file directly.

-- ── orgs ──────────────────────────────────────────────────────────────────────
-- "orgs_select_own": members read only their own org row.

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- "user_profiles_select_own_org": read all profiles that share your org_id.
-- "user_profiles_insert_self": a user may create their own profile (id = auth.uid()).

-- ── ml_models ─────────────────────────────────────────────────────────────────
-- "ml_models_all_own_org": full CRUD gated by org_id match.

-- ── risk_scores ───────────────────────────────────────────────────────────────
-- "risk_scores_all_own_org": full CRUD gated by org_id match.

-- ── validation_docs ───────────────────────────────────────────────────────────
-- "validation_docs_all_own_org": full CRUD gated by org_id match.

-- ── drift_metrics ─────────────────────────────────────────────────────────────
-- "drift_metrics_all_own_org": full CRUD gated by org_id match.

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- "audit_log_select_own_org": SELECT only via anon/authenticated key.
-- INSERT is performed server-side via service_role key (bypasses RLS by design).
-- UPDATE / DELETE are blocked at the Postgres trigger level regardless of key.

-- ── Trigger: enforce_audit_log_append_only ────────────────────────────────────
-- Defined in migration 003. Fires BEFORE UPDATE or DELETE on audit_log.
-- Raises an exception → rolls back the statement → caller receives an error.
-- Cannot be bypassed by the service_role key.
