import Anthropic from "@anthropic-ai/sdk";
import type { ContextPack } from "./contextPack";
import { SR117_CHECKLIST } from "@/lib/regulatoryData/sr117";
import { SS123_CHECKLIST } from "@/lib/regulatoryData/ss123";
import { EU_AI_ACT_CHECKLIST } from "@/lib/regulatoryData/eu_ai_act";
import { NIST_RMF_CHECKLIST } from "@/lib/regulatoryData/nist_rmf";

export type Framework = "sr117" | "ss123" | "eu_ai_act" | "nist_rmf";
export type GapStatus = "met" | "partial" | "gap";

export interface GapItem {
  item_id: string;
  category: string;
  requirement: string;
  evidence_prompt: string; // what evidence would satisfy this obligation (from checklist seed)
  status: GapStatus;
  evidence: string;        // what in the context pack supports this, or "None identified"
  recommendation: string;  // what to do if gap or partial
}

export interface GapAnalysisResult {
  framework: Framework;
  items: GapItem[];
  summary: { met: number; partial: number; gap: number };
}

const CHECKLISTS = {
  sr117: SR117_CHECKLIST,
  ss123: SS123_CHECKLIST,
  eu_ai_act: EU_AI_ACT_CHECKLIST,
  nist_rmf: NIST_RMF_CHECKLIST,
};

const FRAMEWORK_LABELS: Record<Framework, string> = {
  sr117: "SR 11-7",
  ss123: "SS 1/23",
  eu_ai_act: "EU AI Act",
  nist_rmf: "NIST AI RMF",
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a model risk gap assessment assistant for a financial-services MRM platform.
You assess each checklist item against evidence present in the model context pack.
Respond with valid JSON only — no prose outside the JSON array.
Do NOT state that the model "complies with" any regulation. Assess evidence only.
Status rules:
- "met": clear evidence in the context pack satisfies this requirement
- "partial": some evidence present but incomplete or unclear
- "gap": no evidence in the context pack addresses this requirement
Each checklist item includes an evidence_prompt field describing what evidence would satisfy it — use this as guidance when assessing and writing recommendations.`;

function buildGapPrompt(pack: ContextPack, framework: Framework): string {
  const checklist = CHECKLISTS[framework];
  const label = FRAMEWORK_LABELS[framework];

  return `Assess the following ${label} checklist against the model context pack.
For each item return a JSON object with: item_id, status ("met"|"partial"|"gap"), evidence, recommendation.

MODEL CONTEXT PACK:
${JSON.stringify(pack, null, 2)}

CHECKLIST ITEMS TO ASSESS:
${JSON.stringify(checklist, null, 2)}

Return a JSON array — one object per checklist item — in this exact format:
[
  {
    "item_id": "<id from checklist>",
    "status": "<met|partial|gap>",
    "evidence": "<what in the context pack supports this, or 'None identified'>",
    "recommendation": "<what to do — empty string if met>"
  }
]`;
}

export async function analyseGaps(
  pack: ContextPack,
  framework: Framework
): Promise<GapAnalysisResult> {
  const checklist = CHECKLISTS[framework];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildGapPrompt(pack, framework) }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // Strip possible markdown fences
  const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let parsed: Array<{ item_id: string; status: string; evidence: string; recommendation: string }>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gap analysis returned invalid JSON: ${rawText.slice(0, 300)}`);
  }

  // Merge with checklist metadata and validate statuses
  const itemMap = new Map(checklist.map((c) => [c.id, c]));
  const items: GapItem[] = parsed.map((p) => {
    const meta = itemMap.get(p.item_id);
    const status: GapStatus = ["met", "partial", "gap"].includes(p.status)
      ? (p.status as GapStatus)
      : "gap";
    return {
      item_id: p.item_id,
      category: meta?.category ?? "Unknown",
      requirement: meta?.requirement ?? p.item_id,
      evidence_prompt: meta?.evidence_prompt ?? "",
      status,
      evidence: p.evidence ?? "None identified",
      recommendation: p.recommendation ?? "",
    };
  });

  const summary = {
    met: items.filter((i) => i.status === "met").length,
    partial: items.filter((i) => i.status === "partial").length,
    gap: items.filter((i) => i.status === "gap").length,
  };

  return { framework, items, summary };
}
