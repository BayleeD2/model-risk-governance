import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { upsertValidationDoc, getValidationDoc } from "@/lib/db/validationDocs";

// GET /api/v1/documents?model_id=<id> — fetch existing validation doc for a model
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const modelId = searchParams.get("model_id");
  if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const doc = await getValidationDoc(modelId, profile.org_id);
  if (!doc) return NextResponse.json({ doc: null }, { status: 200 });
  return NextResponse.json({ doc });
}

// POST /api/v1/documents — create or return existing doc for a model
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const modelId = body?.model_id as string | undefined;
  if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const doc = await upsertValidationDoc(modelId, profile.org_id);
  return NextResponse.json({ doc }, { status: 201 });
}
