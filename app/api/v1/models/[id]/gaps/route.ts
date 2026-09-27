import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { buildContextPack } from "@/lib/ai/contextPack";
import { analyseGaps, type Framework } from "@/lib/ai/gapAnalyser";
import { upsertGapAnalysis, getLatestGapAnalysis } from "@/lib/db/gapAnalyses";
import { writeAuditLog } from "@/lib/db/audit";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_FRAMEWORKS: Framework[] = ["sr117", "ss123", "eu_ai_act", "nist_rmf"];

export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const framework = (searchParams.get("framework") ?? "sr117") as Framework;
  if (!VALID_FRAMEWORKS.includes(framework)) {
    return NextResponse.json({ error: "Invalid framework" }, { status: 400 });
  }

  const analysis = await getLatestGapAnalysis(id, profile.org_id, framework);
  return NextResponse.json({ analysis });
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const framework = (body?.framework ?? "sr117") as Framework;
  if (!VALID_FRAMEWORKS.includes(framework)) {
    return NextResponse.json({ error: "Invalid framework" }, { status: 400 });
  }

  const model = await getModel(id, profile.org_id);
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pack = buildContextPack(model);
  const result = await analyseGaps(pack, framework);
  const analysis = await upsertGapAnalysis(model.id, profile.org_id, framework, result.items, pack.contentHash);

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "run_gap_analysis",
    table_name: "gap_analyses",
    row_id: analysis.id,
    payload: { model_id: model.id, framework, summary: result.summary },
  });

  return NextResponse.json({ analysis }, { status: 201 });
}
