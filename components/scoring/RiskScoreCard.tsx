"use client";

import { useActionState } from "react";
import type { RiskScore } from "@/lib/db/riskScores";
import type { ScoringState } from "@/app/actions/scoring";

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  low:      { bg: "bg-green-50",  text: "text-green-800",  border: "border-green-200", label: "Low Risk" },
  medium:   { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", label: "Medium Risk" },
  high:     { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", label: "High Risk" },
  critical: { bg: "bg-red-50",    text: "text-red-800",    border: "border-red-200",    label: "Critical Risk" },
};

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct <= 25 ? "#16a34a" :
    pct <= 50 ? "#ca8a04" :
    pct <= 75 ? "#ea580c" : "#dc2626";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">
          {score}
        </span>
      </div>
      <div className="text-xs text-gray-500">out of 100</div>
    </div>
  );
}

interface Props {
  initialScore: RiskScore | null;
  scoreAction: (prevState: ScoringState, formData: FormData) => Promise<ScoringState>;
}

export default function RiskScoreCard({ initialScore, scoreAction }: Props) {
  const [state, formAction, isPending] = useActionState<ScoringState, FormData>(
    scoreAction,
    { score: initialScore, error: null }
  );

  const score = state.score;
  const styles = score ? (TIER_STYLES[score.tier] ?? TIER_STYLES.low) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Risk Score</h2>
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Scoring…" : score ? "Re-score" : "Score this model"}
          </button>
        </form>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 mb-3">{state.error}</p>
      )}

      {score && styles ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ScoreGauge score={score.score} />
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles.bg} ${styles.text} ${styles.border}`}>
              {styles.label}
            </span>
          </div>

          {score.rationale && (
            <p className="text-sm text-gray-700 leading-relaxed">{score.rationale}</p>
          )}

          {score.factors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Key risk factors
              </p>
              <ul className="space-y-1">
                {score.factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Scored {new Date(score.scored_at).toLocaleString()}
          </p>
        </div>
      ) : (
        !isPending && (
          <p className="text-sm text-gray-500">
            No risk score yet. Click &ldquo;Score this model&rdquo; to generate one.
          </p>
        )
      )}

      {isPending && (
        <p className="text-sm text-gray-500 animate-pulse">Analysing model risk…</p>
      )}
    </div>
  );
}
