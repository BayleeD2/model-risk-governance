import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { upsertValidationDoc } from "@/lib/db/validationDocs";
import { draftSectionAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/Button";
import DocBuilder from "@/components/documents/DocBuilder";
import { SECTION_KEYS, type SectionKey } from "@/lib/ai/prompts";

export default async function DocumentPage({
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

  const doc = await upsertValidationDoc(model.id, profile.org_id);

  // Build bound actions for each section key
  const draftActions = Object.fromEntries(
    SECTION_KEYS.map((key) => [
      key,
      draftSectionAction.bind(null, model.id, key),
    ])
  ) as Record<SectionKey, (prevState: Parameters<typeof draftSectionAction>[2], formData: FormData) => ReturnType<typeof draftSectionAction>>;

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Validation Evidence Pack
          </h1>
          <p className="mt-1 text-sm text-gray-500">{model.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/models/${model.id}`}>
            <Button variant="ghost">← Back to model</Button>
          </Link>
        </div>
      </div>

      <DocBuilder
        modelId={model.id}
        sections={doc.sections}
        draftActions={draftActions}
      />
    </div>
  );
}
