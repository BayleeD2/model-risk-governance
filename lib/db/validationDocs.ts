import { createServiceRoleClient } from "./auth";
import type { SectionKey } from "@/lib/ai/prompts";

export interface SectionEntry {
  content: string;
  contentHash: string;
  draftedAt: string;
}

export type SectionsMap = Partial<Record<SectionKey, SectionEntry>>;

export interface ValidationDoc {
  id: string;
  org_id: string;
  model_id: string;
  sections: SectionsMap;
  status: "draft" | "in_review" | "approved";
  created_at: string;
  updated_at: string;
}

export async function getValidationDoc(
  modelId: string,
  orgId: string
): Promise<ValidationDoc | null> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("validation_docs")
    .select("*")
    .eq("model_id", modelId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as ValidationDoc;
}

export async function upsertValidationDoc(
  modelId: string,
  orgId: string
): Promise<ValidationDoc> {
  const db = createServiceRoleClient();
  // Return existing doc or create a new one
  const existing = await getValidationDoc(modelId, orgId);
  if (existing) return existing;

  const { data, error } = await db
    .from("validation_docs")
    .insert({ org_id: orgId, model_id: modelId, sections: {}, status: "draft" })
    .select()
    .single();
  if (error) throw error;
  return data as ValidationDoc;
}

export async function saveSection(
  docId: string,
  sectionKey: SectionKey,
  entry: SectionEntry
): Promise<ValidationDoc> {
  const db = createServiceRoleClient();

  // Fetch current sections first (optimistic merge)
  const { data: current, error: fetchErr } = await db
    .from("validation_docs")
    .select("sections")
    .eq("id", docId)
    .single();
  if (fetchErr) throw fetchErr;

  const existingSections = (current?.sections ?? {}) as SectionsMap;
  const updatedSections: SectionsMap = { ...existingSections, [sectionKey]: entry };

  const { data, error } = await db
    .from("validation_docs")
    .update({ sections: updatedSections, updated_at: new Date().toISOString() })
    .eq("id", docId)
    .select()
    .single();
  if (error) throw error;
  return data as ValidationDoc;
}
