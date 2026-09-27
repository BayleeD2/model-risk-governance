import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { insertDriftMetric, type MetricType } from "@/lib/db/driftMetrics";
import { writeAuditLog } from "@/lib/db/audit";

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:8000";

const METRIC_ENDPOINTS: Record<MetricType, string> = {
  psi: "/analytics/psi",
  ks: "/analytics/ks",
  csi: "/analytics/csi",
};

// POST /api/v1/metrics
// Body: { model_id, metric_type, reference_data, current_data, bins? }
// Calls Python analytics service to compute the metric, then stores result.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { model_id, metric_type, reference_data, current_data, features, bins } = body as {
    model_id?: string;
    metric_type?: string;
    reference_data?: number[];
    current_data?: number[];
    features?: Record<string, { expected: number[]; actual: number[] }>;
    bins?: number;
  };

  if (!model_id) return NextResponse.json({ error: "model_id required" }, { status: 400 });
  if (!metric_type || !["psi", "ks", "csi"].includes(metric_type)) {
    return NextResponse.json({ error: "metric_type must be psi, ks, or csi" }, { status: 400 });
  }

  const model = await getModel(model_id, profile.org_id);
  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  // Build analytics service payload
  let analyticsPayload: Record<string, unknown>;
  if (metric_type === "ks") {
    if (!reference_data?.length || !current_data?.length) {
      return NextResponse.json({ error: "reference_data and current_data required for KS" }, { status: 400 });
    }
    analyticsPayload = { reference: reference_data, current: current_data };
  } else if (metric_type === "csi") {
    if (!features || Object.keys(features).length === 0) {
      return NextResponse.json({ error: "features map required for CSI" }, { status: 400 });
    }
    analyticsPayload = { features, bins: bins ?? 10 };
  } else {
    if (!reference_data?.length || !current_data?.length) {
      return NextResponse.json({ error: "reference_data and current_data required for PSI" }, { status: 400 });
    }
    analyticsPayload = { expected: reference_data, actual: current_data, bins: bins ?? 10 };
  }

  // Call Python analytics service
  let analyticsResult: Record<string, unknown>;
  try {
    const analyticsResp = await fetch(
      `${ANALYTICS_URL}${METRIC_ENDPOINTS[metric_type as MetricType]}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsPayload),
      }
    );
    if (!analyticsResp.ok) {
      const detail = await analyticsResp.text();
      return NextResponse.json(
        { error: `Analytics service error: ${detail}` },
        { status: 502 }
      );
    }
    analyticsResult = await analyticsResp.json();
  } catch {
    return NextResponse.json({ error: "Analytics service unavailable" }, { status: 503 });
  }

  // Extract scalar metric value from result
  const metricValue =
    metric_type === "ks"
      ? (analyticsResult.ks_statistic as number)
      : metric_type === "csi"
      ? (analyticsResult.overall_csi as number)
      : (analyticsResult.psi as number);

  const metric = await insertDriftMetric(
    model.id,
    profile.org_id,
    metric_type as MetricType,
    metricValue
  );

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "ingest_metric",
    table_name: "drift_metrics",
    row_id: metric.id,
    payload: { model_id: model.id, metric_type, value: metricValue, breached: metric.breached },
  });

  return NextResponse.json({ metric, analytics_detail: analyticsResult }, { status: 201 });
}
