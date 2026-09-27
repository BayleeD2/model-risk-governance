import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/db/auth";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface BreachedMetric {
  type: string;
  value: number;
  threshold: number | null;
}

export async function sendDriftBreachAlert(params: {
  orgId: string;
  modelId: string;
  modelName: string;
  breachedMetrics: BreachedMetric[];
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log("[notifications] RESEND_API_KEY not set — skipping email");
    return;
  }

  const db = createServiceRoleClient();

  const { data: profiles } = await db
    .from("user_profiles")
    .select("id")
    .eq("org_id", params.orgId);

  if (!profiles || profiles.length === 0) return;

  const emails: string[] = [];
  for (const profile of profiles) {
    const { data } = await db.auth.admin.getUserById(profile.id);
    if (data?.user?.email) emails.push(data.user.email);
  }

  if (emails.length === 0) return;

  const metricLines = params.breachedMetrics
    .map(
      (m) =>
        `  • ${m.type.toUpperCase()}: ${m.value.toFixed(4)} (threshold: ${
          m.threshold != null ? m.threshold : "N/A"
        })`
    )
    .join("\n");

  const subject = `Drift alert: ${params.modelName}`;
  const body = [
    `A drift threshold breach has been detected for model "${params.modelName}".`,
    "",
    "Breached metrics:",
    metricLines,
    "",
    "Sign in to review the drift monitoring page and decide what action to take.",
    "",
    "Analytical output only. Not legal or regulatory advice. Firms are responsible for their own compliance determinations.",
  ].join("\n");

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "alerts@example.com",
        to: email,
        subject,
        text: body,
      });
    } catch (err) {
      console.error("[notifications] Failed to send to", email, err);
    }

    // Log to notifications table (non-fatal if it fails)
    try {
      await db.from("notifications").insert({
        org_id: params.orgId,
        model_id: params.modelId,
        type: "drift_breach",
        recipient: email,
        payload: {
          model_name: params.modelName,
          breached_metrics: params.breachedMetrics,
        },
      });
    } catch (err) {
      console.error("[notifications] Failed to write notification record", err);
    }
  }
}
