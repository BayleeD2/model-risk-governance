import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { listModels, createModel } from "@/lib/db/models";
import { writeAuditLog } from "@/lib/db/audit";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const models = await listModels(profile.org_id);
  return NextResponse.json({ data: models });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const model = await createModel({
    org_id: profile.org_id,
    name: body.name.trim(),
    description: body.description,
    model_type: body.model_type,
    use_case: body.use_case,
    owner_name: body.owner_name,
  });

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "model.created",
    table_name: "ml_models",
    row_id: model.id,
    payload: { name: model.name, source: "api" },
  });

  return NextResponse.json({ data: model }, { status: 201 });
}
