import type { ContextPack } from "./contextPack";
import { DISCLAIMER } from "./groundingGuard";

export type SectionKey =
  | "model_overview"
  | "conceptual_soundness"
  | "data_governance"
  | "performance_validation";

export const SECTION_LABELS: Record<SectionKey, string> = {
  model_overview: "Model Overview",
  conceptual_soundness: "Conceptual Soundness",
  data_governance: "Data Governance",
  performance_validation: "Performance & Validation",
};

export const SECTION_KEYS: SectionKey[] = [
  "model_overview",
  "conceptual_soundness",
  "data_governance",
  "performance_validation",
];

const GROUNDING_INSTRUCTION = `
CRITICAL RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. Every specific claim, figure, date, or metric you write MUST be sourced from the context pack provided.
2. If a required piece of information is missing from the context pack, write exactly:
   [EVIDENCE REQUIRED — <describe what is missing, e.g. "training data description not provided">]
3. Do NOT invent numbers, percentages, dates, or statistics.
4. Do NOT state or imply that the model "complies with", "satisfies", or "meets the requirements of" any regulation.
5. Do NOT give legal opinions or compliance verdicts.
6. End every section with this exact disclaimer on its own line:
   ${DISCLAIMER}
`;

export function buildSectionPrompt(sectionKey: SectionKey, pack: ContextPack): string {
  const packJson = JSON.stringify(pack, null, 2);

  const sectionInstructions: Record<SectionKey, string> = {
    model_overview: `
Write a Model Overview section for a validation evidence pack.
Cover: model name and identifier, stated purpose and use case, model type and methodology family,
model owner, current deployment status and environment, version, and regulatory frameworks in scope.
Length: 2–3 paragraphs. Plain English, suitable for a non-technical reviewer.
`,
    conceptual_soundness: `
Write a Conceptual Soundness section for a validation evidence pack.
Cover: the theoretical basis of the model type, key modelling assumptions that can be inferred
from the model type and use case, known limitations of this approach, and any challenger model status.
If the methodology is not specified in the context pack, note [EVIDENCE REQUIRED — model methodology not described].
Length: 2–3 paragraphs.
`,
    data_governance: `
Write a Data Governance section for a validation evidence pack.
Cover: training data description (source, volume, time period), feature/input variable list,
data quality considerations, and any known data gaps.
If training_data or features are null, use [EVIDENCE REQUIRED] markers for each missing element.
Length: 2–3 paragraphs.
`,
    performance_validation: `
Write a Performance & Validation section for a validation evidence pack.
Cover: performance metrics as recorded in the context pack, validation date and next review date,
and an overall assessment of validation recency.
Cite every metric exactly as it appears in the context pack. Do not round or adjust figures.
If performance_metrics is null, state [EVIDENCE REQUIRED — no performance metrics provided].
Length: 2–3 paragraphs.
`,
  };

  return `${GROUNDING_INSTRUCTION}

CONTEXT PACK (the ONLY source you may cite):
${packJson}

TASK:
${sectionInstructions[sectionKey]}

Write the section now. Begin directly with the section prose — no headers, no preamble.`;
}
