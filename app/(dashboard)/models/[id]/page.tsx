import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { getLatestRiskScore } from "@/lib/db/riskScores";
import { getLatestDriftMetrics } from "@/lib/db/driftMetrics";
import { scoreModelAction } from "@/app/actions/scoring";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import RiskScoreCard from "@/components/scoring/RiskScoreCard";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex py-3 border-b border-zinc-100 last:border-0">
      <dt className="w-40 flex-shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900">
        {value ?? <span className="text-zinc-400">—</span>}
      </dd>
    </div>
  );
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  const [model, latestScore, latestDrift] = await Promise.all([
    getModel(id, profile.org_id),
    getLatestRiskScore(id, profile.org_id),
    getLatestDriftMetrics(id, profile.org_id),
  ]);
  if (!model) notFound();

  const boundScoreAction = scoreModelAction.bind(null, model.id);
  const anyBreach = Object.values(latestDrift).some((m) => m?.breached);
  const driftTypes = Object.keys(latestDrift) as string[];

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900">{model.name}</h1>
            <Badge variant={model.status as "draft" | "active" | "retired"}>
              {model.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Registered{" "}
            {new Date(model.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/models/${model.id}/drift`}>
            <Button variant="secondary">Drift</Button>
          </Link>
          <Link href={`/models/${model.id}/gaps`}>
            <Button variant="secondary">Gap Analysis</Button>
          </Link>
          <Link href={`/models/${model.id}/document`}>
            <Button variant="secondary">Evidence Pack</Button>
          </Link>
          <Link href={`/models/${model.id}/audit`}>
            <Button variant="secondary">Audit Trail</Button>
          </Link>
          <Link href={`/models/${model.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Link href="/models">
            <Button variant="ghost">← Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card header={<h2 className="text-sm font-medium text-zinc-900">Model metadata</h2>}>
            <dl>
              <Row label="Model name" value={model.name} />
              <Row label="Description" value={model.description} />
              <Row label="Type" value={model.model_type} />
              <Row label="Use case" value={model.use_case} />
              <Row label="Owner" value={model.owner_name} />
            </dl>
          </Card>

          {/* Drift summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-900">Drift summary</h2>
              <Link href={`/models/${model.id}/drift`} className="text-xs text-indigo-600 hover:underline">
                View monitoring →
              </Link>
            </div>
            {driftTypes.length === 0 ? (
              <p className="text-sm text-gray-400">No drift metrics recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {driftTypes.map((type) => {
                  const m = latestDrift[type as keyof typeof latestDrift]!;
                  return (
                    <div
                      key={type}
                      className={`px-3 py-2 rounded border text-xs ${
                        m.breached
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-green-50 border-green-200 text-green-700"
                      }`}
                    >
                      <span className="font-semibold uppercase">{type}</span>{" "}
                      {m.value.toFixed(4)}{" "}
                      {m.breached ? "⚠ breached" : "✓ stable"}
                    </div>
                  );
                })}
              </div>
            )}
            {anyBreach && (
              <p className="mt-2 text-xs text-red-600">
                One or more metrics have breached their threshold. Review required.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <RiskScoreCard
            initialScore={latestScore}
            scoreAction={boundScoreAction}
          />
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        Analytical output only. Not legal or regulatory advice. Firms are responsible
        for their own compliance determinations.
      </p>
    </div>
  );
}
