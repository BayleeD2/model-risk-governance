"use client";

import { useActionState } from "react";
import type { Framework } from "@/lib/ai/gapAnalyser";
import type { GapAnalysisState } from "@/app/actions/gapAnalysis";
import type { GapAnalysis } from "@/lib/db/gapAnalyses";

const FRAMEWORK_LABELS: Record<Framework, string> = {
  sr117: "SR 11-7",
  ss123: "SS 1/23",
  eu_ai_act: "EU AI Act",
  nist_rmf: "NIST AI RMF",
};

const STATUS_STYLES = {
  met:     { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", label: "Met" },
  partial: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", label: "Partial" },
  gap:     { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Gap" },
};

function SummaryBar({ analysis }: { analysis: GapAnalysis }) {
  const total = analysis.items.length;
  if (total === 0) return null;
  const met = analysis.items.filter((i) => i.status === "met").length;
  const partial = analysis.items.filter((i) => i.status === "partial").length;
  const gap = analysis.items.filter((i) => i.status === "gap").length;

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden flex">
        <div className="bg-green-500 h-full" style={{ width: `${(met / total) * 100}%` }} />
        <div className="bg-amber-400 h-full" style={{ width: `${(partial / total) * 100}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${(gap / total) * 100}%` }} />
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-green-700">{met} met</span>
        <span className="text-amber-700">{partial} partial</span>
        <span className="text-red-700">{gap} gap</span>
      </div>
    </div>
  );
}

interface Props {
  modelId: string;
  framework: Framework;
  initialAnalysis: GapAnalysis | null;
  runAction: (prevState: GapAnalysisState, formData: FormData) => Promise<GapAnalysisState>;
}

export default function GapReport({ modelId, framework, initialAnalysis, runAction }: Props) {
  const [state, formAction, isPending] = useActionState<GapAnalysisState, FormData>(
    runAction,
    { analysis: initialAnalysis, error: null }
  );

  const analysis = state.analysis;

  // Group items by category
  type GapItem = NonNullable<typeof analysis>["items"][number];
  const grouped = new Map<string, GapItem[]>();
  if (analysis) {
    for (const item of analysis.items) {
      if (!grouped.has(item.category)) grouped.set(item.category, []);
      grouped.get(item.category)!.push(item);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {FRAMEWORK_LABELS[framework]} Gap Report
          </h2>
          {analysis && (
            <p className="text-xs text-gray-400 mt-0.5">
              Analysed {new Date(analysis.analysed_at).toLocaleString()}
            </p>
          )}
        </div>
        <form action={formAction}>
          <input type="hidden" name="modelId" value={modelId} />
          <input type="hidden" name="framework" value={framework} />
          <button
            type="submit"
            disabled={isPending}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Analysing…" : analysis ? "Re-analyse" : "Run gap analysis"}
          </button>
        </form>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">{state.error}</p>
      )}

      {isPending && (
        <p className="text-sm text-gray-400 animate-pulse">Running gap analysis…</p>
      )}

      {analysis && !isPending && (
        <>
          <SummaryBar analysis={analysis} />

          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">{category}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const s = STATUS_STYLES[item.status];
                  return (
                    <div key={item.item_id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${s.bg} ${s.text} ${s.border}`}>
                          {s.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{item.requirement}</p>
                          {item.evidence_prompt && (
                            <p className="mt-1 text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1">
                              <span className="font-medium">Evidence needed:</span> {item.evidence_prompt}
                            </p>
                          )}
                          {item.evidence && item.evidence !== "None identified" && (
                            <p className="mt-1 text-xs text-gray-500">
                              <span className="font-medium">Evidence found:</span> {item.evidence}
                            </p>
                          )}
                          {item.recommendation && (
                            <p className="mt-1 text-xs text-amber-700">
                              <span className="font-medium">Recommendation:</span> {item.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {!analysis && !isPending && (
        <div className="text-center py-10 text-sm text-gray-400">
          Click &ldquo;Run gap analysis&rdquo; to assess this model against {FRAMEWORK_LABELS[framework]}.
        </div>
      )}

      <p className="text-xs text-gray-400">
        Analytical output only. Not legal or regulatory advice. Firms are responsible for their own compliance determinations.
      </p>
    </div>
  );
}
