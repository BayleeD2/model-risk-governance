import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { getModel } from "@/lib/db/models";
import { listDriftMetrics } from "@/lib/db/driftMetrics";
import { submitMetricAction } from "@/app/actions/metrics";
import { Button } from "@/components/ui/Button";
import DriftChart from "@/components/drift/DriftChart";
import MetricIngestForm from "@/components/drift/MetricIngestForm";

const METRIC_LABELS = { psi: "PSI", ks: "KS", csi: "CSI" };

export default async function DriftPage({
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

  const metrics = await listDriftMetrics(model.id, profile.org_id, 100);
  const boundSubmitAction = submitMetricAction.bind(null, model.id);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Drift Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">{model.name}</p>
        </div>
        <Link href={`/models/${model.id}`}>
          <Button variant="ghost">← Back to model</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Metric history</h2>
            <DriftChart metrics={metrics} />
          </div>

          {metrics.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Recent readings</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="px-5 py-2 text-left">Type</th>
                    <th className="px-5 py-2 text-left">Value</th>
                    <th className="px-5 py-2 text-left">Threshold</th>
                    <th className="px-5 py-2 text-left">Status</th>
                    <th className="px-5 py-2 text-left">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-2 font-medium">
                        {METRIC_LABELS[m.metric_type] ?? m.metric_type}
                      </td>
                      <td className="px-5 py-2 font-mono">{m.value.toFixed(4)}</td>
                      <td className="px-5 py-2 font-mono text-gray-400">
                        {m.threshold?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-5 py-2">
                        {m.breached ? (
                          <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full border border-red-200">
                            Breached
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                            Stable
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-gray-400 text-xs">
                        {new Date(m.recorded_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <MetricIngestForm modelId={model.id} submitAction={boundSubmitAction} />
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Analytical output only. Not legal or regulatory advice. Firms are responsible for their own compliance determinations.
      </p>
    </div>
  );
}
