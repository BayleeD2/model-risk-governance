"use client";

import { useActionState } from "react";
import type { MetricState } from "@/app/actions/metrics";

interface Props {
  modelId: string;
  submitAction: (prevState: MetricState, formData: FormData) => Promise<MetricState>;
}

export default function MetricIngestForm({ modelId, submitAction }: Props) {
  const [state, formAction, isPending] = useActionState<MetricState, FormData>(
    submitAction,
    { metric: null, error: null }
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Submit drift metric</h3>

      {state.error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 rounded p-2">{state.error}</p>
      )}
      {state.metric && !state.error && (
        <p className="mb-3 text-xs text-green-700 bg-green-50 rounded p-2">
          Metric recorded: {state.metric.metric_type.toUpperCase()} = {state.metric.value.toFixed(4)}
          {state.metric.breached && " ⚠ threshold breached"}
        </p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="model_id" value={modelId} />

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Metric type</label>
          <select
            name="metric_type"
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="psi">PSI — Population Stability Index</option>
            <option value="ks">KS — Kolmogorov-Smirnov</option>
            <option value="csi">CSI — Characteristic Stability Index</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reference data <span className="text-gray-400">(JSON array)</span>
          </label>
          <textarea
            name="reference_data"
            rows={2}
            placeholder="[0.1, 0.4, 0.2, 0.3]"
            className="w-full text-xs font-mono border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Current data <span className="text-gray-400">(JSON array)</span>
          </label>
          <textarea
            name="current_data"
            rows={2}
            placeholder="[0.15, 0.35, 0.25, 0.25]"
            className="w-full text-xs font-mono border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full text-sm py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit metric"}
        </button>
      </form>
    </div>
  );
}
