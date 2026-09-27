"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  return (
    <Card header={<h1 className="text-base font-semibold text-zinc-900">Sign in</h1>}>
      <form action={formAction} className="flex flex-col gap-4">
        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        <Button type="submit" loading={isPending} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
