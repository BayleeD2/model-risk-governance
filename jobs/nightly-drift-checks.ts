import { createServiceRoleClient } from "@/lib/db/auth";
import { writeAuditLog } from "@/lib/db/audit";
import { sendDriftBreachAlert } from "@/lib/notifications/email";

interface ActiveModel {
  id: string;
  org_id: string;
  name: string;
}

/**
 * Nightly drift check job.
 * Scans all active models and flags any that have drift metrics breaching
 * their thresholds, writing a summary entry to the audit_log.
 *
 * This function is called by POST /api/v1/jobs (Vercel Cron).
 * It does not recalculate metrics — it audits the state of existing readings.
 */
export async function runNightlyDriftChecks(): Promise<{ checked: number; breached: number }> {
  const db = createServiceRoleClient();

  // Fetch all active models across all orgs
  const { data: models, error: modelsErr } = await db
    .from("ml_models")
    .select("id, org_id, name")
    .eq("status", "active");

  if (modelsErr) throw modelsErr;
  if (!models || models.length === 0) return { checked: 0, breached: 0 };

  let breachedCount = 0;

  for (const model of models as ActiveModel[]) {
    // Get latest metric per type for this model
    const { data: metrics } = await db
      .from("drift_metrics")
      .select("metric_type, value, breached, threshold, recorded_at")
      .eq("model_id", model.id)
      .eq("org_id", model.org_id)
      .order("recorded_at", { ascending: false })
      .limit(10);

    if (!metrics || metrics.length === 0) continue;

    // Deduplicate: latest reading per metric type
    const latestByType = new Map<string, { value: number; breached: boolean; threshold: number | null }>();
    for (const m of metrics) {
      if (!latestByType.has(m.metric_type)) {
        latestByType.set(m.metric_type, {
          value: m.value,
          breached: m.breached,
          threshold: m.threshold,
        });
      }
    }

    const breachedMetrics = Array.from(latestByType.entries())
      .filter(([, v]) => v.breached)
      .map(([type, v]) => ({ type, value: v.value, threshold: v.threshold }));

    if (breachedMetrics.length > 0) {
      breachedCount++;
      await writeAuditLog({
        org_id: model.org_id,
        action: "nightly_drift_breach_detected",
        table_name: "drift_metrics",
        payload: {
          model_id: model.id,
          model_name: model.name,
          breached_metrics: breachedMetrics,
        },
      });
      // Fire-and-forget email — non-fatal if it fails
      sendDriftBreachAlert({
        orgId: model.org_id,
        modelId: model.id,
        modelName: model.name,
        breachedMetrics,
      }).catch((err) =>
        console.error("[nightly-drift-checks] email notification failed:", err)
      );
    }
  }

  return { checked: models.length, breached: breachedCount };
}
