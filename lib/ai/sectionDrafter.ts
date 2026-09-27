import Anthropic from "@anthropic-ai/sdk";
import type { ContextPack } from "./contextPack";
import { applyGroundingGuard } from "./groundingGuard";
import { buildSectionPrompt, type SectionKey } from "./prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a model risk documentation assistant for a financial-services MRM platform.
You write sections of validation evidence packs for ML models.
You only cite information that appears in the context pack you are given.
If information is absent, you write [EVIDENCE REQUIRED — <describe what is missing>].
You never invent figures, dates, or statistics.
You never give legal opinions or state that a model complies with any regulation.`;

export interface DraftResult {
  content: string;           // guarded, safe-to-store text
  contentHash: string;       // hash of the context pack used — for cache invalidation
  draftedAt: string;
}

export async function draftSection(
  sectionKey: SectionKey,
  pack: ContextPack
): Promise<DraftResult> {
  const prompt = buildSectionPrompt(sectionKey, pack);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const guardedContent = applyGroundingGuard(rawText, pack);

  return {
    content: guardedContent,
    contentHash: pack.contentHash,
    draftedAt: new Date().toISOString(),
  };
}
