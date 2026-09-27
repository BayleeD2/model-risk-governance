import type { ContextPack } from "./contextPack";

const DISCLAIMER =
  "Analytical output only. Not legal or regulatory advice. Firms are responsible for their own compliance determinations.";

const LEGAL_OPINION_PATTERNS: RegExp[] = [
  /complies with/gi,
  /satisfies\s+regulation/gi,
  /meets the requirements of/gi,
  /is compliant with/gi,
  /legally required/gi,
];

/**
 * Collects every numeric value present anywhere in the context pack.
 * These are the ONLY numbers that may appear in generated output.
 */
function collectAllowedNumbers(pack: ContextPack): Set<number> {
  const nums = new Set<number>();
  const visit = (v: unknown) => {
    if (typeof v === "number") nums.add(v);
    else if (typeof v === "string") {
      const ms = v.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
      ms.forEach((m) => nums.add(Number(m)));
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v).forEach(visit);
  };
  visit(pack);
  return nums;
}

/**
 * Returns true if a number should be exempt from grounding checks:
 * year-like values and small ordinals (1–10) may appear in prose without
 * being explicitly listed in the context pack.
 */
function isExemptNumber(n: number): boolean {
  return (n >= 1900 && n <= 2100) || (Number.isInteger(n) && n <= 10);
}

/**
 * Removes legal opinion phrases from text, replacing them with a safe
 * neutral phrase so the sentence still reads naturally.
 */
function stripLegalOpinions(text: string): string {
  let out = text;
  out = out.replace(/complies with/gi, "is assessed against");
  out = out.replace(/satisfies\s+regulation/gi, "is evaluated against regulation");
  out = out.replace(/meets the requirements of/gi, "is reviewed against the requirements of");
  out = out.replace(/is compliant with/gi, "is evaluated against");
  out = out.replace(/legally required/gi, "referenced in applicable guidance");
  return out;
}

/**
 * Detects sentences containing numbers not present in the context pack
 * and replaces the entire sentence with an [EVIDENCE REQUIRED] marker.
 *
 * Strategy: split on sentence boundaries, check each sentence, rebuild.
 */
function redactUngroundedNumbers(text: string, allowed: Set<number>): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .map((sentence) => {
      const nums = (sentence.match(/\b\d+(?:\.\d+)?\b/g) ?? []).map(Number);
      const ungrounded = nums.filter((n) => !isExemptNumber(n) && !allowed.has(n));
      if (ungrounded.length === 0) return sentence;
      return `[EVIDENCE REQUIRED — figure not present in model record: ${ungrounded.join(", ")}]`;
    })
    .join(" ");
}

/**
 * Detects null fields in the pack that the text appears to describe with
 * invented content. Heuristic: if training_data is null but the text contains
 * phrases suggesting training data details, flag it.
 */
function redactNullFieldClaims(text: string, pack: ContextPack): string {
  let out = text;

  if (!pack.trainingData) {
    out = out.replace(
      /\b(?:trained on|training data|training set|training dataset)\b[^.!?]*/gi,
      "[EVIDENCE REQUIRED — training data description not provided]"
    );
  }

  if (!pack.features || pack.features.length === 0) {
    out = out.replace(
      /\b(?:features? include[sd]?|input variables? include[sd]?|predictors? include[sd]?)\b[^.!?]*/gi,
      "[EVIDENCE REQUIRED — feature list not provided]"
    );
  }

  if (!pack.performanceMetrics) {
    out = out.replace(
      /\b(?:gini|auc|f1|precision|recall|accuracy|ks statistic|r.squared|brier)\b[^.!?]*/gi,
      "[EVIDENCE REQUIRED — performance metrics not provided]"
    );
  }

  return out;
}

/**
 * Applies all grounding checks to AI-generated text.
 * Call this on every section before persisting to validation_docs.
 *
 * The output is safe to store and render to users.
 */
export function applyGroundingGuard(text: string, pack: ContextPack): string {
  const allowed = collectAllowedNumbers(pack);
  let out = text;

  // 1. Strip legal opinions
  out = stripLegalOpinions(out);

  // 2. Redact invented numbers
  out = redactUngroundedNumbers(out, allowed);

  // 3. Redact claims about null fields
  out = redactNullFieldClaims(out, pack);

  // 4. Ensure disclaimer is present
  if (!out.includes(DISCLAIMER)) {
    out = out.trimEnd() + "\n\n" + DISCLAIMER;
  }

  return out;
}

export { DISCLAIMER };
