"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { insertDriftMetric, type MetricType } from "@/lib/db/driftMetrics";
import { writeAuditLog } from "@/lib/db/audit";
import type { DriftMetric } from "@/lib/db/driftMetrics";

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:8000";

const METRIC_ENDPOINTS: Record<MetricType, string> = {
  psi: "/analytics/psi",
  ks: "/analytics/ks",
  csi: "/analytics/csi",
};

export interface MetricState {
  metric: DriftMetric | null;
  error: string | null;
}

export async function submitMetricAction(
  modelId: string,
  _prevState: MetricState,
  formData: FormData
): Promise<MetricState> {
  const user = await getUser();
  if (!user) return { metric: null, error: "Not authenticated" };
  const profile = await getUserProfile(user.id);
  if (!profile) return { metric: null, error: "No organisation found" };

  const metricType = formData.get("metric_type") as string;
  const referenceRaw = formData.get("reference_data") as string;
  const currentRaw = formData.get("current_data") as string;

  if (!metricType || !["psi", "ks", "csi"].includes(metricType)) {
    return { metric: null, error: "Select a valid metric type" };
  }

  let referenceData: number[];
  let currentData: number[];
  try {
    referenceData = JSON.parse(referenceRaw);
    currentData = JSON.parse(currentRaw);
    if (!Array.isArray(referenceData) || !Array.isArray(currentData)) throw new Error();
  } catch {
    return { metric: null, error: "Data must be valid JSON arrays of numbers, e.g. [0.1, 0.4, 0.2]" };
  }

  const model = await getModel(modelId, profile.org_id);
  if (!model) return { metric: null, error: "Model not found" };

  // Build analytics payload for the correct endpoint
  let analyticsPayload: Record<string, unknown>;
  if (metricType === "ks") {
    analyticsPayload = { reference: referenceData, current: currentData };
  } else if (metricType === "csi") {
    return { metric: null, error: "CSI requires a features map — use the API directly." };
  } else {
    analyticsPayload = { expected: referenceData, actual: currentData, bins: 10 };
  }

  // Call Python analytics service at the correct endpoint
  let analyticsResult: Record<string, unknown>;
  try {
    const analyticsResp = await fetch(
      `${ANALYTICS_URL}${METRIC_ENDPOINTS[metricType as MetricType]}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsPayload),
      }
    );
    if (!analyticsResp.ok) {
      const detail = await analyticsResp.text();
      return { metric: null, error: `Analytics service error: ${detail}` };
    }
    analyticsResult = await analyticsResp.json();
  } catch {
    return { metric: null, error: "Could not reach analytics service. Is it running?" };
  }

  // Extract scalar metric value
  const metricValue =
    metricType === "ks"
      ? (analyticsResult.ks_statistic as number)
      : (analyticsResult.psi as number);

  const metric = await insertDriftMetric(
    model.id,
    profile.org_id,
    metricType as MetricType,
    metricValue
  );

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "ingest_metric",
    table_name: "drift_metrics",
    row_id: metric.id,
    payload: { model_id: model.id, metric_type: metricType, value: metricValue, breached: metric.breached },
  });

  revalidatePath(`/models/${modelId}/drift`);
  return { metric, error: null };
}
