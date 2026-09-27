/**
 * Eval gate: hallucination + citation checks.
 *
 * Rules (from CLAUDE.md):
 *  1. Every numeric value in generated output must be present in the fixture's
 *     context pack (metadata or top-level fields). Unknown numbers → hard fail.
 *  2. Every section must carry the required disclaimer.
 *  3. Output must not contain a legal opinion or compliance verdict
 *     ("complies with", "satisfies regulation", "meets the requirements of").
 *  4. If a required datum is absent from the context pack, the output must
 *     emit [EVIDENCE REQUIRED] rather than inventing a value.
 *
 * These tests run against the grounding-guard output, not the raw LLM output,
 * so they verify the guard is working correctly across the 10 fixture profiles.
 */

import { describe, it, expect } from "vitest";
import { buildContextPack, type ContextPack } from "../lib/ai/contextPack";
import { applyGroundingGuard } from "../lib/ai/groundingGuard";

// Load all 10 fixtures
const fixtures = [
  "model_01", "model_02", "model_03", "model_04", "model_05",
  "model_06", "model_07", "model_08", "model_09", "model_10",
].map((name) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(`./fixtures/${name}.json`);
  return { name, raw };
});

const DISCLAIMER =
  "Analytical output only. Not legal or regulatory advice. Firms are responsible for their own compliance determinations.";

const LEGAL_OPINION_PATTERNS = [
  /complies with/i,
  /satisfies.*regulation/i,
  /meets the requirements of/i,
  /is compliant with/i,
  /legally required/i,
];

// Extracts all numeric literals from a string, excluding those inside
// [EVIDENCE REQUIRED] markers (those ARE the redaction — counting them
// as failures would be a false positive).
function extractNumbers(text: string): number[] {
  const stripped = text.replace(/\[EVIDENCE REQUIRED[^\]]*\]/g, "");
  const matches = stripped.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  return matches.map(Number);
}

// Flattens a context pack to the set of numeric values it contains.
function numbersInPack(pack: ContextPack): Set<number> {
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

describe("Grounding guard — disclaimer enforcement", () => {
  for (const { name, raw } of fixtures) {
    it(`${name}: disclaimer present after guard`, () => {
      const pack = buildContextPack(raw);
      const guardedText = applyGroundingGuard(
        `Model overview for ${raw.name}. ${DISCLAIMER}`,
        pack
      );
      expect(guardedText).toContain(DISCLAIMER);
    });
  }
});

describe("Grounding guard — legal opinion rejection", () => {
  for (const { name, raw } of fixtures) {
    it(`${name}: no legal opinion in guarded output`, () => {
      const pack = buildContextPack(raw);
      const riskySentence =
        "This model complies with SR 11-7 and satisfies regulation. " + DISCLAIMER;
      const guardedText = applyGroundingGuard(riskySentence, pack);
      for (const pattern of LEGAL_OPINION_PATTERNS) {
        expect(guardedText).not.toMatch(pattern);
      }
    });
  }
});

describe("Grounding guard — numeric grounding", () => {
  for (const { name, raw } of fixtures) {
    it(`${name}: no ungrounded numbers survive the guard`, () => {
      const pack = buildContextPack(raw);
      const allowedNumbers = numbersInPack(pack);
      // Inject a number that is definitely not in the pack
      const fabricatedNumber = 99999.123;
      const textWithFabrication =
        `The model achieved a Gini of ${fabricatedNumber} last quarter. ` + DISCLAIMER;
      const guardedText = applyGroundingGuard(textWithFabrication, pack);
      const numbersAfterGuard = extractNumbers(guardedText);
      for (const n of numbersAfterGuard) {
        // Year-like numbers (1900-2100) and small integers used in prose (1,2,3) are allowed
        const isYearLike = n >= 1900 && n <= 2100;
        const isSmallOrdinal = Number.isInteger(n) && n <= 10;
        if (isYearLike || isSmallOrdinal) continue;
        expect(allowedNumbers.has(n)).toBe(true);
      }
    });
  }
});

describe("Grounding guard — null fields become EVIDENCE REQUIRED", () => {
  it("model_07: null training_data triggers [EVIDENCE REQUIRED]", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("./fixtures/model_07.json");
    const pack = buildContextPack(raw);
    // Simulate output that references training data when none exists in the pack
    const fabricated =
      "The model was trained on 500,000 records with a 24-month lookback. " + DISCLAIMER;
    const guardedText = applyGroundingGuard(fabricated, pack);
    expect(guardedText).toContain("[EVIDENCE REQUIRED");
  });
});
