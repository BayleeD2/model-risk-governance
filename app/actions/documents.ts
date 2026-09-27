"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { buildContextPack } from "@/lib/ai/contextPack";
import { draftSection } from "@/lib/ai/sectionDrafter";
import { upsertValidationDoc, saveSection } from "@/lib/db/validationDocs";
import { writeAuditLog } from "@/lib/db/audit";
import type { SectionKey } from "@/lib/ai/prompts";
import type { ValidationDoc } from "@/lib/db/validationDocs";

export interface DocumentState {
  doc: ValidationDoc | null;
  error: string | null;
}

export async function draftSectionAction(
  modelId: string,
  sectionKey: SectionKey,
  _prevState: DocumentState,
  formData: FormData
): Promise<DocumentState> {
  const user = await getUser();
  if (!user) return { doc: null, error: "Not authenticated" };
  const profile = await getUserProfile(user.id);
  if (!profile) return { doc: null, error: "No organisation found" };

  const model = await getModel(modelId, profile.org_id);
  if (!model) return { doc: null, error: "Model not found" };

  try {
    const pack = buildContextPack(model);

    // Get or create the validation doc
    const validationDoc = await upsertValidationDoc(model.id, profile.org_id);

    // Check cache: skip regeneration if content hash hasn't changed.
    // forceRedraft bypasses the cache so the user can explicitly refresh a section.
    const forceRedraft = formData.get("forceRedraft") === "true";
    const existingSection = validationDoc.sections[sectionKey];
    if (!forceRedraft && existingSection && existingSection.contentHash === pack.contentHash) {
      return { doc: validationDoc, error: null };
    }

    const result = await draftSection(sectionKey, pack);
    const updatedDoc = await saveSection(validationDoc.id, sectionKey, result);

    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "draft_section",
      table_name: "validation_docs",
      row_id: validationDoc.id,
      payload: { model_id: model.id, section_key: sectionKey, context_snapshot: pack },
    });

    revalidatePath(`/models/${modelId}/document`);
    return { doc: updatedDoc, error: null };
  } catch (err) {
    console.error("draftSectionAction error:", err);
    return { doc: null, error: "Drafting failed. Please try again." };
  }
}
