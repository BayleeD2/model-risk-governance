import { describe, it, expect } from "vitest";

// Unit tests: notification logic, audit trail helpers, and doc re-draft flag.

// ── Notification type validation ──────────────────────────────────────────────

const NOTIFICATION_TYPES = ["drift_breach", "doc_refresh", "gap_alert"] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

function isValidNotificationType(t: string): t is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(t);
}

describe("notification type validation", () => {
  it("accepts all valid notification types", () => {
    for (const t of NOTIFICATION_TYPES) {
      expect(isValidNotificationType(t)).toBe(true);
    }
  });

  it("rejects unknown types", () => {
    expect(isValidNotificationType("sms_alert")).toBe(false);
    expect(isValidNotificationType("")).toBe(false);
  });
});

// ── Drift breach alert payload ─────────────────────────────────────────────────

interface BreachedMetric {
  type: string;
  value: number;
  threshold: number | null;
}

function formatBreachSummary(metrics: BreachedMetric[]): string {
  return metrics
    .map(
      (m) =>
        `${m.type.toUpperCase()}: ${m.value.toFixed(4)} (threshold: ${
          m.threshold != null ? m.threshold : "N/A"
        })`
    )
    .join(", ");
}

describe("drift breach alert formatting", () => {
  it("formats a single breach correctly", () => {
    const result = formatBreachSummary([
      { type: "psi", value: 0.3456, threshold: 0.2 },
    ]);
    expect(result).toBe("PSI: 0.3456 (threshold: 0.2)");
  });

  it("formats multiple breaches", () => {
    const result = formatBreachSummary([
      { type: "psi", value: 0.3, threshold: 0.2 },
      { type: "ks", value: 0.15, threshold: 0.1 },
    ]);
    expect(result).toContain("PSI");
    expect(result).toContain("KS");
  });

  it("handles null threshold", () => {
    const result = formatBreachSummary([
      { type: "csi", value: 0.5, threshold: null },
    ]);
    expect(result).toContain("N/A");
  });

  it("returns empty string for empty metrics", () => {
    expect(formatBreachSummary([])).toBe("");
  });
});

// ── forceRedraft flag logic ────────────────────────────────────────────────────

function shouldSkipCache(
  existingHash: string | undefined,
  currentHash: string,
  forceRedraft: boolean
): boolean {
  if (forceRedraft) return false; // always regenerate
  if (!existingHash) return false; // no prior draft — must generate
  return existingHash === currentHash; // skip if unchanged
}

describe("forceRedraft cache bypass logic", () => {
  it("skips regeneration when hash matches and forceRedraft is false", () => {
    expect(shouldSkipCache("abc123", "abc123", false)).toBe(true);
  });

  it("does not skip when hash differs", () => {
    expect(shouldSkipCache("abc123", "xyz456", false)).toBe(false);
  });

  it("does not skip when forceRedraft is true even if hash matches", () => {
    expect(shouldSkipCache("abc123", "abc123", true)).toBe(false);
  });

  it("does not skip when no prior draft exists", () => {
    expect(shouldSkipCache(undefined, "abc123", false)).toBe(false);
  });

  it("does not skip when forceRedraft is true with no prior draft", () => {
    expect(shouldSkipCache(undefined, "abc123", true)).toBe(false);
  });
});

// ── Audit trail entry filtering ───────────────────────────────────────────────

interface AuditEntry {
  row_id: string | null;
  payload: Record<string, unknown> | null;
}

function isEntryForModel(entry: AuditEntry, modelId: string): boolean {
  return (
    entry.row_id === modelId ||
    (entry.payload != null && entry.payload.model_id === modelId)
  );
}

describe("audit trail model filtering", () => {
  const MODEL_ID = "model-uuid-123";

  it("includes entries where row_id matches model id", () => {
    const entry: AuditEntry = { row_id: MODEL_ID, payload: null };
    expect(isEntryForModel(entry, MODEL_ID)).toBe(true);
  });

  it("includes entries where payload.model_id matches", () => {
    const entry: AuditEntry = { row_id: null, payload: { model_id: MODEL_ID } };
    expect(isEntryForModel(entry, MODEL_ID)).toBe(true);
  });

  it("excludes unrelated entries", () => {
    const entry: AuditEntry = { row_id: "other-uuid", payload: { model_id: "other-uuid" } };
    expect(isEntryForModel(entry, MODEL_ID)).toBe(false);
  });

  it("excludes entries with null payload and different row_id", () => {
    const entry: AuditEntry = { row_id: "other-uuid", payload: null };
    expect(isEntryForModel(entry, MODEL_ID)).toBe(false);
  });

  it("includes entries with row_id match regardless of payload", () => {
    const entry: AuditEntry = {
      row_id: MODEL_ID,
      payload: { model_id: "different-id" },
    };
    expect(isEntryForModel(entry, MODEL_ID)).toBe(true);
  });
});

// ── Pagination logic ──────────────────────────────────────────────────────────

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const from = (page - 1) * pageSize;
  return items.slice(from, from + pageSize);
}

describe("audit trail pagination", () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1);

  it("returns first page correctly", () => {
    const result = paginate(items, 1, 20);
    expect(result).toHaveLength(20);
    expect(result[0]).toBe(1);
    expect(result[19]).toBe(20);
  });

  it("returns second page correctly", () => {
    const result = paginate(items, 2, 20);
    expect(result).toHaveLength(20);
    expect(result[0]).toBe(21);
  });

  it("returns partial last page", () => {
    const result = paginate(items, 3, 20);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe(41);
  });

  it("returns empty array for out-of-range page", () => {
    expect(paginate(items, 4, 20)).toHaveLength(0);
  });
});
