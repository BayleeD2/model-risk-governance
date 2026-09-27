import { NextResponse } from "next/server";
import { getUser, createServiceRoleClient } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import type { ValidationDoc } from "@/lib/db/validationDocs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("validation_docs")
    .select("*")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ doc: data as ValidationDoc });
}
