import { createServiceRoleClient } from "./auth";

export interface UserProfile {
  id: string;
  org_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  orgs: {
    id: string;
    name: string;
    created_at: string;
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*, orgs(*)")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

export async function createOrgWithOwner(
  userId: string,
  orgName: string
): Promise<{ org_id: string }> {
  const supabase = createServiceRoleClient();

  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .insert({ name: orgName.trim() })
    .select()
    .single();
  if (orgError) throw orgError;

  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({ id: userId, org_id: org.id, role: "owner" });
  if (profileError) throw profileError;

  return { org_id: org.id };
}
