"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type Model } from "@/lib/db/models";
import { type ModelFormState } from "@/app/actions/models";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";

const MODEL_TYPE_OPTIONS = [
  { value: "", label: "Select type…" },
  { value: "classification", label: "Classification" },
  { value: "regression", label: "Regression" },
  { value: "nlp", label: "NLP / Text" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "time_series", label: "Time Series" },
  { value: "other", label: "Other" },
];

const SOURCE_OPTIONS = [
  { value: "first_party", label: "First-party (Internal)" },
  { value: "third_party", label: "Third-party / Vendor AI" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "retired", label: "Retired" },
];

interface ModelFormProps {
  model?: Model;
  action: (prevState: ModelFormState, formData: FormData) => Promise<ModelFormState>;
  cancelHref: string;
}

export function ModelForm({ model, action, cancelHref }: ModelFormProps) {
  const [state, formAction, isPending] = useActionState<ModelFormState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-xl">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Input
        label="Model name"
        name="name"
        required
        placeholder="e.g. CRE-Scorecard-v2"
        defaultValue={model?.name}
      />

      <Textarea
        label="Description"
        name="description"
        placeholder="Brief description of what this model does and where it is deployed."
        defaultValue={model?.description ?? ""}
      />

      <Select
        label="Model type"
        name="model_type"
        options={MODEL_TYPE_OPTIONS}
        defaultValue={model?.model_type ?? ""}
      />

      <Input
        label="Use case"
        name="use_case"
        placeholder="e.g. Consumer credit scoring"
        defaultValue={model?.use_case ?? ""}
      />

      <Input
        label="Model owner"
        name="owner_name"
        placeholder="e.g. Jane Smith"
        defaultValue={model?.owner_name ?? ""}
      />

      <Select
        label="Source"
        name="source"
        options={SOURCE_OPTIONS}
        defaultValue={model?.source ?? "first_party"}
      />

      {model && (
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={model.status}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {model ? "Save changes" : "Register model"}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}
