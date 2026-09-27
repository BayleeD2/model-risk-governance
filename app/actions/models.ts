"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import {
  createModel,
  updateModel,
  deleteModel,
  type ModelStatus,
} from "@/lib/db/models";
import { writeAuditLog } from "@/lib/db/audit";

export type ModelFormState = { error?: string } | null;

async function requireAuthContext() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await getUserProfile(user.id);
  if (!profile) throw new Error("No organisation found");
  return { user, profile };
}

export async function createModelAction(
  prevState: ModelFormState,
  formData: FormData
): Promise<ModelFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Model name is required" };

  try {
    const { user, profile } = await requireAuthContext();
    const model = await createModel({
      org_id: profile.org_id,
      name,
      description: (formData.get("description") as string) || undefined,
      model_type: (formData.get("model_type") as string) || undefined,
      use_case: (formData.get("use_case") as string) || undefined,
      owner_name: (formData.get("owner_name") as string) || undefined,
      source: ((formData.get("source") as string) || "first_party") as import("@/lib/db/models").ModelSource,
    });
    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "model.created",
      table_name: "ml_models",
      row_id: model.id,
      payload: { name: model.name, model_type: model.model_type },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create model" };
  }

  revalidatePath("/models");
  redirect("/models");
}

export async function updateModelAction(
  modelId: string,
  prevState: ModelFormState,
  formData: FormData
): Promise<ModelFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Model name is required" };

  try {
    const { user, profile } = await requireAuthContext();
    const model = await updateModel(modelId, profile.org_id, {
      name,
      description: (formData.get("description") as string) || undefined,
      model_type: (formData.get("model_type") as string) || undefined,
      use_case: (formData.get("use_case") as string) || undefined,
      owner_name: (formData.get("owner_name") as string) || undefined,
      status: (formData.get("status") as ModelStatus) || undefined,
      source: ((formData.get("source") as string) || undefined) as import("@/lib/db/models").ModelSource | undefined,
    });
    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "model.updated",
      table_name: "ml_models",
      row_id: model.id,
      payload: { name: model.name, status: model.status },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update model" };
  }

  revalidatePath("/models");
  revalidatePath(`/models/${modelId}`);
  redirect(`/models/${modelId}`);
}

export async function deleteModelAction(
  prevState: ModelFormState,
  formData: FormData
): Promise<ModelFormState> {
  const modelId = formData.get("modelId") as string;
  if (!modelId) return { error: "Model ID is required" };

  try {
    const { user, profile } = await requireAuthContext();
    await deleteModel(modelId, profile.org_id);
    await writeAuditLog({
      org_id: profile.org_id,
      actor_id: user.id,
      action: "model.deleted",
      table_name: "ml_models",
      row_id: modelId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete model" };
  }

  revalidatePath("/models");
  redirect("/models");
}
