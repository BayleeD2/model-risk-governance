import { createServiceRoleClient } from "./auth";

export type MetricType = "psi" | "ks" | "csi";

export interface DriftMetric {
  id: string;
  org_id: string;
  model_id: string;
  metric_type: MetricType;
  value: number;
  threshold: number | null;
  breached: boolean;
  recorded_at: string;
}

const DEFAULT_THRESHOLDS: Record<MetricType, number> = {
  psi: 0.25,
  ks: 0.1,
  csi: 0.25,
};

export async function insertDriftMetric(
  modelId: string,
  orgId: string,
  metricType: MetricType,
  value: number,
  threshold?: number
): Promise<DriftMetric> {
  const db = createServiceRoleClient();
  const resolvedThreshold = threshold ?? DEFAULT_THRESHOLDS[metricType];
  const breached = value > resolvedThreshold;

  const { data, error } = await db
    .from("drift_metrics")
    .insert({
      org_id: orgId,
      model_id: modelId,
      metric_type: metricType,
      value,
      threshold: resolvedThreshold,
      breached,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DriftMetric;
}

export async function listDriftMetrics(
  modelId: string,
  orgId: string,
  limit = 50
): Promise<DriftMetric[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("drift_metrics")
    .select("*")
    .eq("model_id", modelId)
    .eq("org_id", orgId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DriftMetric[];
}

export async function getLatestDriftMetrics(
  modelId: string,
  orgId: string
): Promise<Partial<Record<MetricType, DriftMetric>>> {
  const all = await listDriftMetrics(modelId, orgId, 100);
  const latest: Partial<Record<MetricType, DriftMetric>> = {};
  for (const m of all) {
    if (!latest[m.metric_type]) latest[m.metric_type] = m;
  }
  return latest;
}
