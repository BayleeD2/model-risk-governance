"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getUser } from "@/lib/db/auth";

export type AuthState = { error?: string; message?: string } | null;

export async function signIn(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  const user = await getUser();
  if (user) {
    const profile = await getUserProfile(user.id);
    if (!profile) redirect("/onboarding");
  }

  redirect("/models");
}

export async function signUp(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return {
    message:
      "Account created. Check your email and click the confirmation link to sign in.",
  };
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
