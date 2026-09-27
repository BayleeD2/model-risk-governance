"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { buildContextPack } from "@/lib/ai/contextPack";
import { analyseGaps, type Framework } from "@/lib/ai/gapAnalyser";
import { upsertGapAnalysis, getLatestGapAnalysis } from "@/lib/db/gapAnalyses";
import { writeAuditLog } from "@/lib/db/audit";
import type { GapAnalysis } from "@/lib/db/gapAnalyses";

export interface GapAnalysisState {
  analysis: GapAnalysis | null;
  error: string | null;
}

export async function runGapAnalysisAction(
  modelId: string,
  framework: Framework,
  _prevState: GapAnalysisState,
  _formData: FormData
): Promise<GapAnalysisState> {
  const user = await getUser();
  if (!user) return { analysis: null, error: "Not authenticated" };
  const profile = await getUserProfile(user.id);
  if (!profile) return { analysis: null, error: "No organisation found" };

  const model = await getModel(modelId, profile.org_id);
  if (!model) return { analysis: null, error: "Model not found" };

  try {
    const pack = buildContextPack(model);

    // Cache check: skip if content hash unchanged
    const existing = await getLatestGapAnalysis(modelId, profile.org_id, framework);
    if (existing && existing.content_hash === pack.contentHash) {
      return { analysis: existing, error: null };
    }

    const result = await analyseGaps(pack, framework);
    const analysis = await upsertGapAnalysis(
      model.id,
      profile.org_id,
      framework,
      result.items,
      pack.contentHash
    );

    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "run_gap_analysis",
      table_name: "gap_analyses",
      row_id: analysis.id,
      payload: { model_id: model.id, framework, summary: result.summary },
    });

    revalidatePath(`/models/${modelId}/gaps`);
    return { analysis, error: null };
  } catch (err) {
    console.error("runGapAnalysisAction error:", err);
    return { analysis: null, error: "Gap analysis failed. Please try again." };
  }
}
