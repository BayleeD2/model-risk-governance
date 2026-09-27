"use server";

import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { createServiceRoleClient } from "@/lib/db/auth";
import { writeAuditLog } from "@/lib/db/audit";
import type { ModelSource } from "@/lib/db/models";

export interface ImportRow {
  name: string;
  description?: string;
  model_type?: string;
  use_case?: string;
  owner_name?: string;
  source?: ModelSource;
}

export interface ImportResult {
  imported: number;
  errors: string[];
}

export async function importModelsAction(rows: ImportRow[]): Promise<ImportResult> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await getUserProfile(user.id);
  if (!profile) throw new Error("No organisation found");

  const db = createServiceRoleClient();
  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      errors.push(`Skipped row: name is required`);
      continue;
    }
    try {
      const { data, error } = await db
        .from("ml_models")
        .insert({
          org_id: profile.org_id,
          name,
          description: row.description?.trim() || null,
          model_type: row.model_type?.trim() || null,
          use_case: row.use_case?.trim() || null,
          owner_name: row.owner_name?.trim() || null,
          source: row.source ?? "first_party",
          discovery_state: "registered",
          metadata: {},
        })
        .select("id, name")
        .single();

      if (error) {
        errors.push(`"${name}": ${error.message}`);
      } else {
        await writeAuditLog({
          org_id: profile.org_id,
          actor_id: user.id,
          action: "model.created",
          table_name: "ml_models",
          row_id: data.id,
          payload: { name: data.name, source: row.source ?? "first_party", via: "bulk_import" },
        });
        imported++;
      }
    } catch (e) {
      errors.push(`"${name}": ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return { imported, errors };
}
