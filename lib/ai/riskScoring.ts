import Anthropic from "@anthropic-ai/sdk";
import type { ContextPack } from "./contextPack";

export interface RiskScoringResult {
  score: number;        // 0–100
  tier: "low" | "medium" | "high" | "critical";
  factors: string[];    // human-readable driving factors, grounded in context pack fields
  rationale: string;   // one paragraph plain-English summary (Haiku-generated)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a model risk classification assistant for a financial-services MRM platform.
You must respond with valid JSON only — no prose outside the JSON object.
Never invent figures. Every factor you cite must reference a field provided in the model context.
Never state or imply that a model "complies with" any regulation or is "approved" by a regulator.`;

function buildScoringPrompt(pack: ContextPack): string {
  return `Assess the model risk of the following ML model and return a JSON object.

MODEL CONTEXT:
${JSON.stringify(pack, null, 2)}

SCORING RULES:
- score: integer 0–100. Higher = higher risk.
- tier: "low" (0–25), "medium" (26–50), "high" (51–75), "critical" (76–100)
- factors: array of 3–6 short strings, each citing a specific field from the context above
- rationale: one paragraph (max 80 words) summarising the risk assessment in plain English.
  Do NOT include legal opinions or compliance verdicts.

RISK DRIVERS TO CONSIDER:
1. Use case materiality (regulatory capital, credit scoring, AML = higher risk)
2. Deployment environment (production > staging)
3. Validation recency (last_validation_date — older = higher risk)
4. Performance metrics completeness (null metrics = higher uncertainty risk)
5. Human oversight (human_review_required = lower risk when present)
6. Challenger model status (no challenger = higher risk)
7. Data completeness (null training_data = higher risk)
8. Regulatory framework scope (more frameworks = broader scrutiny)

RESPONSE FORMAT (JSON only, no markdown):
{
  "score": <integer 0-100>,
  "tier": "<low|medium|high|critical>",
  "factors": ["<factor 1>", "<factor 2>", ...],
  "rationale": "<plain English paragraph>"
}`;
}

function tierFromScore(score: number): RiskScoringResult["tier"] {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

export async function scoreModel(pack: ContextPack): Promise<RiskScoringResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildScoringPrompt(pack) }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: { score: number; tier: string; factors: string[]; rationale: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Risk scoring returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score))));
  const tier = tierFromScore(score);

  return {
    score,
    tier,
    factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 6) : [],
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}
