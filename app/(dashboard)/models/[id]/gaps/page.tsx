import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { getLatestGapAnalysis } from "@/lib/db/gapAnalyses";
import { runGapAnalysisAction } from "@/app/actions/gapAnalysis";
import { Button } from "@/components/ui/Button";
import GapReport from "@/components/gaps/GapReport";
import type { Framework } from "@/lib/ai/gapAnalyser";

const FRAMEWORKS: { key: Framework; label: string }[] = [
  { key: "sr117",    label: "SR 11-7" },
  { key: "ss123",    label: "SS 1/23" },
  { key: "eu_ai_act", label: "EU AI Act" },
  { key: "nist_rmf", label: "NIST RMF" },
];

export default async function GapsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ framework?: string }>;
}) {
  const { id } = await params;
  const { framework: rawFramework } = await searchParams;
  const framework: Framework =
    (["sr117", "ss123", "eu_ai_act", "nist_rmf"].includes(rawFramework ?? "")
      ? rawFramework
      : "sr117") as Framework;

  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  const model = await getModel(id, profile.org_id);
  if (!model) notFound();

  const latestAnalysis = await getLatestGapAnalysis(id, profile.org_id, framework);
  const boundAction = runGapAnalysisAction.bind(null, model.id, framework);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gap Analysis</h1>
          <p className="mt-1 text-sm text-gray-500">{model.name}</p>
        </div>
        <Link href={`/models/${model.id}`}>
          <Button variant="ghost">← Back to model</Button>
        </Link>
      </div>

      {/* Framework tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {FRAMEWORKS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/models/${id}/gaps?framework=${key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              framework === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <GapReport
        modelId={model.id}
        framework={framework}
        initialAnalysis={latestAnalysis}
        runAction={boundAction}
      />
    </div>
  );
}
