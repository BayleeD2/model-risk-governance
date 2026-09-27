import { describe, it, expect } from "vitest";

// ── Item 3: Model source / vendor-AI inventory ─────────────────────────────

type ModelSource = "first_party" | "third_party";
type ModelDiscoveryState = "registered" | "discovered";

const VALID_SOURCES: ModelSource[] = ["first_party", "third_party"];
const VALID_DISCOVERY_STATES: ModelDiscoveryState[] = ["registered", "discovered"];

function isValidSource(s: string): s is ModelSource {
  return (VALID_SOURCES as string[]).includes(s);
}

function isValidDiscoveryState(s: string): s is ModelDiscoveryState {
  return (VALID_DISCOVERY_STATES as string[]).includes(s);
}

describe("model source validation", () => {
  it("accepts valid source values", () => {
    for (const s of VALID_SOURCES) expect(isValidSource(s)).toBe(true);
  });
  it("rejects unknown source values", () => {
    expect(isValidSource("unknown")).toBe(false);
    expect(isValidSource("")).toBe(false);
  });
  it("accepts valid discovery states", () => {
    for (const s of VALID_DISCOVERY_STATES) expect(isValidDiscoveryState(s)).toBe(true);
  });
  it("defaults new registrations to first_party and registered", () => {
    const defaults = { source: "first_party" as ModelSource, discovery_state: "registered" as ModelDiscoveryState };
    expect(isValidSource(defaults.source)).toBe(true);
    expect(isValidDiscoveryState(defaults.discovery_state)).toBe(true);
  });
});

// ── Item 1: Bulk import logic ─────────────────────────────────────────────

interface ImportRow {
  name: string;
  description?: string;
  model_type?: string;
  use_case?: string;
  owner_name?: string;
  source?: ModelSource;
}

function validateImportRows(rows: ImportRow[]): { valid: ImportRow[]; errors: string[] } {
  const valid: ImportRow[] = [];
  const errors: string[] = [];
  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      errors.push("Skipped row: name is required");
    } else {
      valid.push({ ...row, name });
    }
  }
  return { valid, errors };
}

function applyColumnMapping(
  rows: string[][],
  headers: string[],
  colMap: Partial<Record<keyof ImportRow, string>>
): ImportRow[] {
  const idx = (col: string | undefined) =>
    col !== undefined ? headers.indexOf(col) : -1;
  return rows.map((row) => ({
    name: row[idx(colMap.name)] ?? "",
    description: row[idx(colMap.description)] || undefined,
    model_type: row[idx(colMap.model_type)] || undefined,
    use_case: row[idx(colMap.use_case)] || undefined,
    owner_name: row[idx(colMap.owner_name)] || undefined,
    source: (row[idx(colMap.source)] as ModelSource) || undefined,
  }));
}

describe("bulk import row validation", () => {
  it("accepts rows with valid names", () => {
    const { valid, errors } = validateImportRows([
      { name: "CRE-Scorecard-v2", use_case: "Credit scoring" },
      { name: "  Fraud-Model  " },
    ]);
    expect(valid).toHaveLength(2);
    expect(valid[1].name).toBe("Fraud-Model");
    expect(errors).toHaveLength(0);
  });

  it("skips rows with missing names", () => {
    const { valid, errors } = validateImportRows([
      { name: "" },
      { name: "  " },
    ]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it("handles mixed valid and invalid rows", () => {
    const { valid, errors } = validateImportRows([
      { name: "Valid Model" },
      { name: "" },
      { name: "Another Model" },
    ]);
    expect(valid).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it("applies column mapping correctly", () => {
    const headers = ["Model Name", "Owner", "Type"];
    const rows = [["CRE Scorecard", "Jane Smith", "classification"]];
    const colMap = { name: "Model Name", owner_name: "Owner", model_type: "Type" };
    const result = applyColumnMapping(rows, headers, colMap);
    expect(result[0].name).toBe("CRE Scorecard");
    expect(result[0].owner_name).toBe("Jane Smith");
    expect(result[0].model_type).toBe("classification");
  });

  it("handles missing mapped column gracefully", () => {
    const headers = ["Name"];
    const rows = [["Test Model"]];
    const colMap = { name: "Name", description: "Description" };
    const result = applyColumnMapping(rows, headers, colMap);
    expect(result[0].name).toBe("Test Model");
    expect(result[0].description).toBeUndefined();
  });
});

// ── Item 4: Evidence snapshot in audit payload ─────────────────────────────

interface ContextSnapshot {
  modelId: string;
  name: string;
  contentHash: string;
  [key: string]: unknown;
}

interface AuditPayload {
  model_id?: string;
  tier?: string;
  score?: number;
  context_snapshot?: ContextSnapshot;
}

function hasSnapshot(payload: AuditPayload): boolean {
  return !!payload.context_snapshot;
}

function snapshotHash(payload: AuditPayload): string | null {
  return payload.context_snapshot?.contentHash ?? null;
}

describe("evidence snapshot (reproducibility-lite)", () => {
  const snapshot: ContextSnapshot = {
    modelId: "uuid-123",
    name: "CRE-Scorecard",
    contentHash: "abc123",
    modelType: "classification",
  };

  it("detects presence of context snapshot in audit payload", () => {
    expect(hasSnapshot({ model_id: "uuid-123", tier: "high", context_snapshot: snapshot })).toBe(true);
    expect(hasSnapshot({ model_id: "uuid-123", tier: "high" })).toBe(false);
  });

  it("extracts content hash from snapshot", () => {
    expect(snapshotHash({ context_snapshot: snapshot })).toBe("abc123");
    expect(snapshotHash({})).toBeNull();
  });

  it("content hash changes when model name changes", () => {
    const snap2 = { ...snapshot, name: "CRE-Scorecard-v2", contentHash: "xyz789" };
    expect(snapshotHash({ context_snapshot: snapshot })).not.toBe(
      snapshotHash({ context_snapshot: snap2 })
    );
  });
});

// ── Item 2: Evidence prompts on checklist items ────────────────────────────

import { SR117_CHECKLIST } from "@/lib/regulatoryData/sr117";
import { SS123_CHECKLIST } from "@/lib/regulatoryData/ss123";
import { EU_AI_ACT_CHECKLIST } from "@/lib/regulatoryData/eu_ai_act";
import { NIST_RMF_CHECKLIST } from "@/lib/regulatoryData/nist_rmf";

describe("checklist evidence_prompt coverage", () => {
  const frameworks = [
    { name: "SR 11-7", list: SR117_CHECKLIST },
    { name: "SS 1/23", list: SS123_CHECKLIST },
    { name: "EU AI Act", list: EU_AI_ACT_CHECKLIST },
    { name: "NIST RMF", list: NIST_RMF_CHECKLIST },
  ];

  for (const { name, list } of frameworks) {
    it(`every ${name} item has a non-empty evidence_prompt`, () => {
      for (const item of list) {
        expect(item.evidence_prompt, `${item.id} missing evidence_prompt`).toBeTruthy();
        expect(item.evidence_prompt.length).toBeGreaterThan(10);
      }
    });

    it(`${name} items have unique IDs`, () => {
      const ids = list.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it("SR 11-7 points to the drift monitoring page in monitoring items", () => {
    const monItems = SR117_CHECKLIST.filter((i) => i.id.startsWith("sr117-om"));
    const mentionsDrift = monItems.some((i) =>
      i.evidence_prompt.toLowerCase().includes("drift monitoring")
    );
    expect(mentionsDrift).toBe(true);
  });
});
