import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { createSupabaseServerClient } from "@/lib/db/auth";

const PAGE_SIZE = 20;

interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  row_id: string | null;
  payload: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string;
}

function ActionBadge({ action }: { action: string }) {
  const color =
    action.includes("deleted") || action.includes("breach")
      ? "bg-red-100 text-red-700"
      : action.includes("created")
      ? "bg-green-100 text-green-700"
      : "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {action}
    </span>
  );
}

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;

  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  const model = await getModel(id, profile.org_id);
  if (!model) notFound();

  const db = await createSupabaseServerClient();

  const { data: all } = await db
    .from("audit_log")
    .select("id, action, table_name, row_id, payload, actor_id, created_at")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(500);

  const entries: AuditEntry[] = ((all ?? []) as AuditEntry[]).filter(
    (e) =>
      e.row_id === model.id ||
      (e.payload && (e.payload as Record<string, unknown>).model_id === model.id)
  );

  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageEntries = entries.slice(from, from + PAGE_SIZE);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">{model.name}</p>
        </div>
        <Link href={`/models/${model.id}`}>
          <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50">
            ← Back to model
          </button>
        </Link>
      </div>

      {pageEntries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-400">No audit events recorded for this model yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {new Date(entry.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {entry.table_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs font-mono">
                      {entry.payload ? (
                        <div>
                          <span className="truncate block">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(entry.payload).filter(
                                  ([k]) => k !== "context_snapshot"
                                )
                              )
                            )}
                          </span>
                          {entry.payload.context_snapshot != null && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-indigo-600 hover:underline not-font-mono text-xs font-sans">
                                Show inputs
                              </summary>
                              <pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                                {JSON.stringify(entry.payload.context_snapshot as Record<string, unknown>, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ) : (
                        entry.row_id ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing {from + 1}–{Math.min(from + PAGE_SIZE, total)} of {total} events
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/models/${model.id}/audit?page=${page - 1}`}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/models/${model.id}/audit?page=${page + 1}`}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Audit records are append-only and immutable. Analytical output only. Not legal or
        regulatory advice.
      </p>
    </div>
  );
}
