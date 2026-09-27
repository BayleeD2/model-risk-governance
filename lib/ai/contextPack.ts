import type { Model } from "@/lib/db/models";

/**
 * A ContextPack is the structured, deterministic representation of a model's
 * known facts. It is the ONLY source of truth the AI layer may cite.
 * Fields absent from the underlying model record are set to null.
 * The sectionDrafter and groundingGuard both operate on this type.
 */
export interface ContextPack {
  // Identity
  modelId: string;
  name: string;
  description: string | null;
  modelType: string | null;
  useCase: string | null;
  ownerName: string | null;
  status: string;

  // Governance metadata (from metadata jsonb)
  regulatoryFrameworks: string[] | null;
  modelVersion: string | null;
  deploymentEnvironment: string | null;
  lastValidationDate: string | null;
  nextReviewDate: string | null;
  challengerModel: boolean | null;
  humanReviewRequired: boolean | null;

  // Data
  trainingData: string | null;
  features: string[] | null;

  // Performance
  performanceMetrics: Record<string, number | string> | null;

  // Catch-all for any extra metadata fields
  additionalMetadata: Record<string, unknown>;

  // Hash of the pack content — used for cache invalidation in sectionDrafter
  contentHash: string;
}

function extractString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" ? v : null;
}

function extractBoolean(meta: Record<string, unknown>, key: string): boolean | null {
  const v = meta[key];
  return typeof v === "boolean" ? v : null;
}

function extractStringArray(meta: Record<string, unknown>, key: string): string[] | null {
  const v = meta[key];
  if (!Array.isArray(v)) return null;
  if (v.every((x) => typeof x === "string")) return v as string[];
  return null;
}

function extractMetrics(meta: Record<string, unknown>): Record<string, number | string> | null {
  const v = meta["performance_metrics"];
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const out: Record<string, number | string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "number" || typeof val === "string") out[k] = val;
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Simple deterministic hash — not cryptographic, just for cache keying.
function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function buildContextPack(model: Model | Record<string, unknown>): ContextPack {
  const meta = (model.metadata ?? {}) as Record<string, unknown>;

  const knownKeys = [
    "regulatory_frameworks", "model_version", "deployment_environment",
    "last_validation_date", "next_review_date", "challenger_model",
    "human_review_required", "training_data", "features", "performance_metrics",
  ];
  const additional: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!knownKeys.includes(k)) additional[k] = v;
  }

  const pack: Omit<ContextPack, "contentHash"> = {
    modelId: model.id as string,
    name: model.name as string,
    description: (model.description as string | null) ?? null,
    modelType: (model.model_type as string | null) ?? null,
    useCase: (model.use_case as string | null) ?? null,
    ownerName: (model.owner_name as string | null) ?? null,
    status: model.status as string,

    regulatoryFrameworks: extractStringArray(meta, "regulatory_frameworks"),
    modelVersion: extractString(meta, "model_version"),
    deploymentEnvironment: extractString(meta, "deployment_environment"),
    lastValidationDate: extractString(meta, "last_validation_date"),
    nextReviewDate: extractString(meta, "next_review_date"),
    challengerModel: extractBoolean(meta, "challenger_model"),
    humanReviewRequired: extractBoolean(meta, "human_review_required"),

    trainingData: extractString(meta, "training_data"),
    features: extractStringArray(meta, "features"),
    performanceMetrics: extractMetrics(meta),

    additionalMetadata: additional,
  };

  const contentHash = djb2Hash(JSON.stringify(pack));
  return { ...pack, contentHash };
}
