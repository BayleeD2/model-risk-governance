import { createServiceRoleClient } from "./auth";
import type { Framework, GapItem } from "@/lib/ai/gapAnalyser";

export interface GapAnalysis {
  id: string;
  org_id: string;
  model_id: string;
  framework: Framework;
  items: GapItem[];
  content_hash: string | null;
  analysed_at: string;
}

export async function upsertGapAnalysis(
  modelId: string,
  orgId: string,
  framework: Framework,
  items: GapItem[],
  contentHash: string
): Promise<GapAnalysis> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("gap_analyses")
    .insert({
      org_id: orgId,
      model_id: modelId,
      framework,
      items,
      content_hash: contentHash,
    })
    .select()
    .single();
  if (error) throw error;
  return data as GapAnalysis;
}

export async function getLatestGapAnalysis(
  modelId: string,
  orgId: string,
  framework: Framework
): Promise<GapAnalysis | null> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("gap_analyses")
    .select("*")
    .eq("model_id", modelId)
    .eq("org_id", orgId)
    .eq("framework", framework)
    .order("analysed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as GapAnalysis;
}
