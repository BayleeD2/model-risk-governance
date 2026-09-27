"use client";

import { useActionState } from "react";
import { redirect } from "next/navigation";
import { createOrgWithOwner } from "@/lib/db/orgs";
import { getUser } from "@/lib/db/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Server action defined inline — needs "use server" in a separate file
// to work with useActionState; we delegate to the dedicated actions file.
import { createOrgAction } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(createOrgAction, null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
          A
        </span>
        <span className="text-xl font-semibold text-zinc-900">Model Risk Governance</span>
      </div>
      <div className="w-full max-w-sm">
        <Card
          header={
            <div>
              <h1 className="text-base font-semibold text-zinc-900">
                Create your organisation
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                This is how your organisation will appear in the app.
              </p>
            </div>
          }
        >
          <form action={formAction} className="flex flex-col gap-4">
            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}
            <Input
              label="Organisation name"
              name="orgName"
              required
              placeholder="Acme Bank Ltd"
              autoFocus
            />
            <Button type="submit" loading={isPending} className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
