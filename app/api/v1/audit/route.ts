import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { createSupabaseServerClient } from "@/lib/db/auth";

const PAGE_SIZE = 20;

// GET /api/v1/audit?model_id=<uuid>&page=1
// Returns paginated audit_log entries for the authenticated user's org.
// Optionally filtered to entries related to a specific model.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const modelId = searchParams.get("model_id") ?? null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const db = await createSupabaseServerClient();

  const query = db
    .from("audit_log")
    .select("id, action, table_name, row_id, payload, actor_id, created_at", { count: "exact" })
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  // When filtering by model, include both direct model rows and payload-referenced entries.
  // We fetch with a generous limit and filter in TypeScript to avoid complex JSONB query syntax.
  if (modelId) {
    const { data: all, error } = await db
      .from("audit_log")
      .select("id, action, table_name, row_id, payload, actor_id, created_at")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (all ?? []).filter(
      (e) =>
        e.row_id === modelId ||
        (e.payload && (e.payload as Record<string, unknown>).model_id === modelId)
    );

    const paginated = filtered.slice(from, from + PAGE_SIZE);
    return NextResponse.json({
      entries: paginated,
      total: filtered.length,
      page,
      pageSize: PAGE_SIZE,
    });
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
