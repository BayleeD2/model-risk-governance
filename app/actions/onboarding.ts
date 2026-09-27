"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/db/auth";
import { createOrgWithOwner, getUserProfile } from "@/lib/db/orgs";

type OnboardingState = { error?: string } | null;

export async function createOrgAction(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const orgName = (formData.get("orgName") as string)?.trim();
  if (!orgName) return { error: "Organisation name is required" };
  if (orgName.length > 100) return { error: "Name must be 100 characters or fewer" };

  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  // Idempotent: if the user already has a profile, just continue.
  const existing = await getUserProfile(user.id);
  if (existing) redirect("/models");

  try {
    await createOrgWithOwner(user.id, orgName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create organisation" };
  }

  redirect("/models");
}
