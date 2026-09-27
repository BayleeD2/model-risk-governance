"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signUp,
    null
  );

  if (state?.message) {
    return (
      <Card header={<h1 className="text-base font-semibold text-zinc-900">Check your email</h1>}>
        <p className="text-sm text-zinc-600">{state.message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Back to{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            sign in
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card header={<h1 className="text-base font-semibold text-zinc-900">Create an account</h1>}>
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
          autoComplete="new-password"
          required
          placeholder="••••••••"
          hint="Minimum 6 characters"
        />
        <Button type="submit" loading={isPending} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
