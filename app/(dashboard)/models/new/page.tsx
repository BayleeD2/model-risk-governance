import { createModelAction } from "@/app/actions/models";
import { ModelForm } from "@/components/models/ModelForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Register Model — Model Risk Governance" };

export default function NewModelPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Register a model</h1>
      <Card>
        <ModelForm action={createModelAction} cancelHref="/models" />
      </Card>
    </div>
  );
}
