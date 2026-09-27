import { describe, it, expect } from "vitest";
import type { ModelStatus } from "@/lib/db/models";

const VALID_STATUSES: ModelStatus[] = ["draft", "active", "retired"];

function validateModelInput(data: Record<string, unknown>) {
  const errors: string[] = [];
  const name = (data.name as string | undefined)?.trim();

  if (!name) errors.push("name is required");
  if (name && name.length > 200) errors.push("name must be ≤ 200 characters");

  if (
    data.status !== undefined &&
    !VALID_STATUSES.includes(data.status as ModelStatus)
  ) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  return errors;
}

describe("model input validation", () => {
  it("rejects missing name", () => {
    expect(validateModelInput({})).toContain("name is required");
  });

  it("rejects whitespace-only name", () => {
    expect(validateModelInput({ name: "   " })).toContain("name is required");
  });

  it("rejects name over 200 chars", () => {
    expect(validateModelInput({ name: "x".repeat(201) })).toContain(
      "name must be ≤ 200 characters"
    );
  });

  it("accepts a valid name with no status", () => {
    expect(validateModelInput({ name: "CRE-Scorecard-v2" })).toHaveLength(0);
  });

  it("accepts valid statuses", () => {
    for (const status of VALID_STATUSES) {
      expect(validateModelInput({ name: "test", status })).toHaveLength(0);
    }
  });

  it("rejects unknown status", () => {
    expect(validateModelInput({ name: "test", status: "pending" })).toContain(
      "status must be one of: draft, active, retired"
    );
  });
});
