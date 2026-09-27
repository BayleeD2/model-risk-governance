import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { updateModelAction } from "@/app/actions/models";
import { ModelForm } from "@/components/models/ModelForm";
import { Card } from "@/components/ui/Card";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  const model = await getModel(id, profile.org_id);
  if (!model) notFound();

  // Bind the model ID into the action so the form only needs (prevState, formData).
  const boundAction = updateModelAction.bind(null, model.id);

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">
        Edit — {model.name}
      </h1>
      <Card>
        <ModelForm model={model} action={boundAction} cancelHref={`/models/${model.id}`} />
      </Card>
    </div>
  );
}
