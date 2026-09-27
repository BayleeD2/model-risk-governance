"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { DriftMetric, MetricType } from "@/lib/db/driftMetrics";

const METRIC_COLORS: Record<MetricType, string> = {
  psi: "#6366f1",
  ks:  "#f59e0b",
  csi: "#10b981",
};

const METRIC_THRESHOLDS: Record<MetricType, number> = {
  psi: 0.25,
  ks:  0.10,
  csi: 0.25,
};

const METRIC_LABELS: Record<MetricType, string> = {
  psi: "PSI",
  ks:  "KS Statistic",
  csi: "CSI",
};

interface ChartPoint {
  date: string;
  psi?: number;
  ks?: number;
  csi?: number;
}

interface Props {
  metrics: DriftMetric[];
}

export default function DriftChart({ metrics }: Props) {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No drift metrics recorded yet.
      </div>
    );
  }

  // Build time-series points grouped by date
  const pointMap = new Map<string, ChartPoint>();
  for (const m of [...metrics].reverse()) {
    const date = new Date(m.recorded_at).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short",
    });
    if (!pointMap.has(date)) pointMap.set(date, { date });
    pointMap.get(date)![m.metric_type] = m.value;
  }
  const data = Array.from(pointMap.values());

  const activeTypes = Array.from(
    new Set(metrics.map((m) => m.metric_type))
  ) as MetricType[];

  // Use the highest threshold among active metrics for the breach line colour
  const hasBreaches = metrics.some((m) => m.breached);

  return (
    <div className="w-full">
      {hasBreaches && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          One or more metrics have breached their threshold.
        </div>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(4) : String(value),
              METRIC_LABELS[String(name) as MetricType] ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => METRIC_LABELS[value as MetricType] ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {activeTypes.map((type) => (
            <ReferenceLine
              key={`threshold-${type}`}
              y={METRIC_THRESHOLDS[type]}
              stroke={METRIC_COLORS[type]}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ))}
          {activeTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={METRIC_COLORS[type]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-400">
        Dashed lines indicate breach thresholds (PSI/CSI: 0.25, KS: 0.10).
      </p>
    </div>
  );
}
