import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { buildContextPack } from "@/lib/ai/contextPack";
import { scoreModel } from "@/lib/ai/riskScoring";
import { upsertRiskScore, getLatestRiskScore } from "@/lib/db/riskScores";
import { writeAuditLog } from "@/lib/db/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const score = await getLatestRiskScore(id, profile.org_id);
  if (!score) return NextResponse.json({ score: null }, { status: 200 });
  return NextResponse.json({ score });
}

export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const model = await getModel(id, profile.org_id);
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pack = buildContextPack(model);
  const result = await scoreModel(pack);
  const score = await upsertRiskScore(model.id, profile.org_id, result);

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "score_model",
    table_name: "risk_scores",
    row_id: score.id,
    payload: { model_id: model.id, tier: score.tier, score: score.score },
  });

  return NextResponse.json({ score }, { status: 201 });
}
