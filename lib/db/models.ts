import { createSupabaseServerClient } from "./auth";

export type ModelStatus = "draft" | "active" | "retired";
export type ModelSource = "first_party" | "third_party";
export type ModelDiscoveryState = "registered" | "discovered";

export interface Model {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  model_type: string | null;
  use_case: string | null;
  owner_name: string | null;
  status: ModelStatus;
  source: ModelSource;
  discovery_state: ModelDiscoveryState;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModelInsert {
  org_id: string;
  name: string;
  description?: string;
  model_type?: string;
  use_case?: string;
  owner_name?: string;
  status?: ModelStatus;
  source?: ModelSource;
  discovery_state?: ModelDiscoveryState;
}

export async function listModels(orgId: string): Promise<Model[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ml_models")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Model[];
}

export async function getModel(id: string, orgId: string): Promise<Model | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ml_models")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  if (error) return null;
  return data as Model;
}

export async function createModel(insert: ModelInsert): Promise<Model> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ml_models")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data as Model;
}

export async function updateModel(
  id: string,
  orgId: string,
  updates: Partial<Omit<ModelInsert, "org_id">>
): Promise<Model> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ml_models")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();
  if (error) throw error;
  return data as Model;
}

export async function deleteModel(id: string, orgId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ml_models")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw error;
}
