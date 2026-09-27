import { createServiceRoleClient } from "./auth";
import type { RiskScoringResult } from "@/lib/ai/riskScoring";

export interface RiskScore {
  id: string;
  org_id: string;
  model_id: string;
  score: number;
  tier: "low" | "medium" | "high" | "critical";
  factors: string[];
  rationale: string;
  scored_at: string;
}

export async function upsertRiskScore(
  modelId: string,
  orgId: string,
  result: RiskScoringResult
): Promise<RiskScore> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("risk_scores")
    .insert({
      org_id: orgId,
      model_id: modelId,
      score: result.score,
      tier: result.tier,
      factors: { list: result.factors, rationale: result.rationale },
    })
    .select()
    .single();
  if (error) throw error;

  const row = data as {
    id: string; org_id: string; model_id: string;
    score: number; tier: string;
    factors: { list: string[]; rationale: string };
    scored_at: string;
  };

  return {
    id: row.id,
    org_id: row.org_id,
    model_id: row.model_id,
    score: row.score,
    tier: row.tier as RiskScore["tier"],
    factors: row.factors?.list ?? [],
    rationale: row.factors?.rationale ?? "",
    scored_at: row.scored_at,
  };
}

export async function getLatestRiskScore(
  modelId: string,
  orgId: string
): Promise<RiskScore | null> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("risk_scores")
    .select("*")
    .eq("model_id", modelId)
    .eq("org_id", orgId)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as {
    id: string; org_id: string; model_id: string;
    score: number; tier: string;
    factors: { list: string[]; rationale: string };
    scored_at: string;
  };

  return {
    id: row.id,
    org_id: row.org_id,
    model_id: row.model_id,
    score: row.score,
    tier: row.tier as RiskScore["tier"],
    factors: row.factors?.list ?? [],
    rationale: row.factors?.rationale ?? "",
    scored_at: row.scored_at,
  };
}
