import { createServiceRoleClient } from "./auth";

interface AuditEntry {
  org_id: string;
  actor_id?: string;
  action: string;
  table_name: string;
  row_id?: string;
  payload?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("audit_log").insert(entry);
  // Non-fatal: audit log failure must never block the primary operation.
  if (error) console.error("[audit_log] write failed:", error.message);
}
