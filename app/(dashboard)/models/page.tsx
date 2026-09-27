import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { listModels } from "@/lib/db/models";
import { ModelTable } from "@/components/models/ModelTable";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Model Registry — Model Risk Governance" };

export default async function ModelsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  const models = await listModels(profile.org_id);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Model Registry</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {models.length} model{models.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/models/import">
            <Button variant="secondary">Import CSV/XLSX</Button>
          </Link>
          <Link href="/models/new">
            <Button>Register model</Button>
          </Link>
        </div>
      </div>
      <ModelTable models={models} />
    </div>
  );
}
