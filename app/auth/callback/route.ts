import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/models";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const profile = await getUserProfile(data.user.id);
      const redirectTo = profile ? next : "/onboarding";
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
