"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { buildContextPack } from "@/lib/ai/contextPack";
import { scoreModel } from "@/lib/ai/riskScoring";
import { upsertRiskScore } from "@/lib/db/riskScores";
import { writeAuditLog } from "@/lib/db/audit";
import type { RiskScore } from "@/lib/db/riskScores";

export interface ScoringState {
  score: RiskScore | null;
  error: string | null;
}

export async function scoreModelAction(
  modelId: string,
  _prevState: ScoringState,
  _formData: FormData
): Promise<ScoringState> {
  const user = await getUser();
  if (!user) return { score: null, error: "Not authenticated" };
  const profile = await getUserProfile(user.id);
  if (!profile) return { score: null, error: "No organisation found" };

  const model = await getModel(modelId, profile.org_id);
  if (!model) return { score: null, error: "Model not found" };

  try {
    const pack = buildContextPack(model);
    const result = await scoreModel(pack);
    const score = await upsertRiskScore(model.id, profile.org_id, result);

    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "score_model",
      table_name: "risk_scores",
      row_id: score.id,
      payload: {
        model_id: model.id,
        tier: score.tier,
        score: score.score,
        context_snapshot: pack,
      },
    });

    revalidatePath(`/models/${modelId}`);
    return { score, error: null };
  } catch (err) {
    console.error("scoreModelAction error:", err);
    return { score: null, error: "Scoring failed. Please try again." };
  }
}
