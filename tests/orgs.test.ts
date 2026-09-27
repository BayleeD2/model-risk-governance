import { describe, it, expect } from "vitest";

function validateOrgName(name: unknown) {
  const errors: string[] = [];
  const trimmed = (name as string | undefined)?.trim();

  if (!trimmed) errors.push("organisation name is required");
  if (trimmed && trimmed.length > 100)
    errors.push("name must be ≤ 100 characters");

  return errors;
}

describe("org name validation", () => {
  it("rejects empty name", () => {
    expect(validateOrgName("")).toContain("organisation name is required");
    expect(validateOrgName("  ")).toContain("organisation name is required");
    expect(validateOrgName(undefined)).toContain("organisation name is required");
  });

  it("rejects name over 100 chars", () => {
    expect(validateOrgName("x".repeat(101))).toContain(
      "name must be ≤ 100 characters"
    );
  });

  it("accepts valid org name", () => {
    expect(validateOrgName("Acme Bank Ltd")).toHaveLength(0);
  });

  it("trims whitespace before validation", () => {
    expect(validateOrgName("  Acme  ")).toHaveLength(0);
  });
});
