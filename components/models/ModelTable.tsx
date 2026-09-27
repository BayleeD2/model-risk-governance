"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type Model } from "@/lib/db/models";
import { deleteModelAction, type ModelFormState } from "@/app/actions/models";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(status: string) {
  if (status === "active") return "active";
  if (status === "retired") return "retired";
  return "draft";
}

function DeleteButton({ modelId }: { modelId: string }) {
  const [, formAction, isPending] = useActionState<ModelFormState, FormData>(
    deleteModelAction,
    null
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this model? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="modelId" value={modelId} />
      <Button variant="ghost" size="sm" type="submit" loading={isPending}
        className="text-red-600 hover:text-red-700 hover:bg-red-50">
        Delete
      </Button>
    </form>
  );
}

interface ModelTableProps {
  models: Model[];
}

export function ModelTable({ models }: ModelTableProps) {
  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white py-16 text-center">
        <p className="text-sm font-medium text-zinc-900">No models registered yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Register your first model to get started.
        </p>
        <Link href="/models/new">
          <Button className="mt-4" size="sm">Register model</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {["Name", "Source", "Type", "Use case", "Status", "Owner", "Registered", ""].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {models.map((model) => (
            <tr key={model.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-4 py-3 font-medium text-zinc-900">
                <Link
                  href={`/models/${model.id}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {model.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  model.source === "third_party"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}>
                  {model.source === "third_party" ? "Vendor" : "Internal"}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {model.model_type ?? <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {model.use_case ?? <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(model.status)}>
                  {model.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {model.owner_name ?? <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {formatDate(model.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Link href={`/models/${model.id}/edit`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                  <DeleteButton modelId={model.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
