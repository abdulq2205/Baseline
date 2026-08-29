import { describe, expect, it } from "vitest";
import {
  INCOMPLETE_RISK_SCORE,
  NOT_APPLICABLE_NEEDS_NOTE,
  validateAssessment,
} from "./assessment-input";

const base = { categoryId: "PR.AA", status: "PARTIAL" } as const;
/** Narrow the result union so tests can read `.value` without repeating guards. */
const valid = (raw: unknown) => {
  const result = validateAssessment(raw);
  if (!result.ok) throw new Error(`expected valid, got: ${result.error}`);
  return result.value;
};

describe("category ID", () => {
  it.each([
    ["a subcategory ID", "PR.AA-01"],
    ["lowercase", "pr.aa"],
    ["a function ID alone", "PR"],
    ["SQL-looking input", "'; DROP TABLE assessments; --"],
    ["empty", ""],
  ])("rejects %s", (_label, categoryId) => {
    expect(validateAssessment({ ...base, categoryId }).ok).toBe(false);
  });

  it("accepts a well-formed category ID", () => {
    expect(valid(base).categoryId).toBe("PR.AA");
  });
});

describe("status", () => {
  it("rejects a status outside the enum", () => {
    expect(validateAssessment({ ...base, status: "BANANA" }).ok).toBe(false);
  });

  it.each(["IMPLEMENTED", "PARTIAL", "NOT_IMPLEMENTED"])("accepts %s", (status) => {
    expect(validateAssessment({ ...base, status }).ok).toBe(true);
  });
});

describe("NOT_APPLICABLE requires a justification", () => {
  it("is refused with no note", () => {
    const result = validateAssessment({ ...base, status: "NOT_APPLICABLE" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(NOT_APPLICABLE_NEEDS_NOTE);
  });

  it("is refused with a whitespace-only note", () => {
    expect(
      validateAssessment({ ...base, status: "NOT_APPLICABLE", notes: "   \n " }).ok,
    ).toBe(false);
  });

  it("is accepted with a real note", () => {
    const value = valid({ ...base, status: "NOT_APPLICABLE", notes: "No cloud infrastructure." });
    expect(value.notes).toBe("No cloud infrastructure.");
  });
});

describe("risk scoring and owner only survive on a gap", () => {
  it.each(["NOT_IMPLEMENTED", "PARTIAL"])("keeps them on %s", (status) => {
    const value = valid({ ...base, status, likelihood: 4, impact: 5, owner: "Sam" });
    expect(value.likelihood).toBe(4);
    expect(value.impact).toBe(5);
    expect(value.owner).toBe("Sam");
  });

  it("clears them when a gap is fixed", () => {
    const value = valid({ ...base, status: "IMPLEMENTED", likelihood: 4, impact: 5, owner: "Sam" });
    expect(value.likelihood).toBeNull();
    expect(value.impact).toBeNull();
    expect(value.owner).toBeNull();
  });

  it("clears them when a category is scoped out", () => {
    const value = valid({
      ...base,
      status: "NOT_APPLICABLE",
      notes: "Out of scope.",
      likelihood: 4,
      impact: 5,
      owner: "Sam",
    });
    expect(value.likelihood).toBeNull();
    expect(value.impact).toBeNull();
    expect(value.owner).toBeNull();
  });
});

describe("likelihood and impact bounds", () => {
  it.each([0, 6, -1, 2.5])("rejects %p", (bad) => {
    expect(validateAssessment({ ...base, likelihood: bad, impact: 3 }).ok).toBe(false);
    expect(validateAssessment({ ...base, likelihood: 3, impact: bad }).ok).toBe(false);
  });

  it.each([1, 2, 3, 4, 5])("accepts %i", (good) => {
    expect(validateAssessment({ ...base, likelihood: good, impact: good }).ok).toBe(true);
  });

  it("coerces the strings a form sends", () => {
    const value = valid({ ...base, likelihood: "4", impact: "2" });
    expect(value.likelihood).toBe(4);
    expect(value.impact).toBe(2);
  });
});

describe("a score must have both halves or neither", () => {
  it("rejects likelihood without impact", () => {
    const result = validateAssessment({ ...base, likelihood: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(INCOMPLETE_RISK_SCORE);
  });

  it("rejects impact without likelihood", () => {
    expect(validateAssessment({ ...base, impact: 3 }).ok).toBe(false);
  });

  it("allows a gap that has not been scored yet", () => {
    const value = valid({ ...base });
    expect(value.likelihood).toBeNull();
    expect(value.impact).toBeNull();
  });
});

describe("text handling", () => {
  it("trims notes and owner, and treats whitespace-only as absent", () => {
    const value = valid({ ...base, notes: "  something  ", owner: "   " });
    expect(value.notes).toBe("something");
    expect(value.owner).toBeNull();
  });

  it("accepts a note at the 4000-character limit and rejects one over it", () => {
    expect(validateAssessment({ ...base, notes: "x".repeat(4000) }).ok).toBe(true);
    expect(validateAssessment({ ...base, notes: "x".repeat(4001) }).ok).toBe(false);
  });

  it("rejects an owner over the limit", () => {
    expect(validateAssessment({ ...base, owner: "x".repeat(121) }).ok).toBe(false);
  });
});

describe("malformed input", () => {
  it.each([[null], [undefined], ["a string"], [42], [{}]])("rejects %p", (raw) => {
    expect(validateAssessment(raw).ok).toBe(false);
  });
});
