import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel, updateModel, deleteModel } from "@/lib/db/models";
import { writeAuditLog } from "@/lib/db/audit";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const model = await getModel(id, profile.org_id);
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: model });
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const model = await updateModel(id, profile.org_id, {
    name: body.name?.trim(),
    description: body.description,
    model_type: body.model_type,
    use_case: body.use_case,
    owner_name: body.owner_name,
    status: body.status,
  });

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "model.updated",
    table_name: "ml_models",
    row_id: model.id,
    payload: { name: model.name, source: "api" },
  });

  return NextResponse.json({ data: model });
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const model = await getModel(id, profile.org_id);
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteModel(id, profile.org_id);

  await writeAuditLog({
    org_id: profile.org_id,
    actor_id: user.id,
    action: "model.deleted",
    table_name: "ml_models",
    row_id: id,
    payload: { name: model.name, source: "api" },
  });

  return new NextResponse(null, { status: 204 });
}
