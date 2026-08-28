import { describe, expect, it } from "vitest";
import { calculateCoverage, coverageByGroup } from "./coverage";
import type { AssessmentStatus } from "@/generated/prisma/enums";

const I: AssessmentStatus = "IMPLEMENTED";
const P: AssessmentStatus = "PARTIAL";
const N: AssessmentStatus = "NOT_IMPLEMENTED";
const NA: AssessmentStatus = "NOT_APPLICABLE";

describe("calculateCoverage", () => {
  it("is 100% when everything assessed is implemented", () => {
    expect(calculateCoverage([I, I, I]).percent).toBe(100);
  });

  it("is 0% when everything assessed is missing", () => {
    const coverage = calculateCoverage([N, N]);
    expect(coverage.percent).toBe(0);
    // 0% and "no basis" are different answers; this one really is zero.
    expect(coverage.ratio).toBe(0);
  });

  it("counts PARTIAL as a half", () => {
    expect(calculateCoverage([P, P]).percent).toBe(50);
    expect(calculateCoverage([I, P]).earned).toBe(1.5);
  });

  it("worked example: 2 implemented + 1 partial + 2 missing is 50%", () => {
    const coverage = calculateCoverage([I, I, P, N, N]);
    expect(coverage.earned).toBe(2.5);
    expect(coverage.scored).toBe(5);
    expect(coverage.percent).toBe(50);
  });

  describe("NOT_APPLICABLE", () => {
    it("is excluded from the denominator", () => {
      // Without exclusion this would be 1/2 = 50%.
      const coverage = calculateCoverage([I, NA]);
      expect(coverage.scored).toBe(1);
      expect(coverage.percent).toBe(100);
    });

    it("is excluded from the numerator too", () => {
      // If N/A quietly scored a point this would be above 0%.
      expect(calculateCoverage([N, NA]).percent).toBe(0);
    });

    it("does not change the score when added", () => {
      const before = calculateCoverage([I, P, N]);
      const after = calculateCoverage([I, P, N, NA, NA]);
      expect(after.percent).toBe(before.percent);
      expect(after.earned).toBe(before.earned);
      expect(after.scored).toBe(before.scored);
    });

    it("is reported separately so the number can be explained", () => {
      expect(calculateCoverage([I, NA, NA]).notApplicable).toBe(2);
    });

    it("gives null, not 0%, when everything assessed is scoped out", () => {
      const coverage = calculateCoverage([NA, NA]);
      expect(coverage.percent).toBeNull();
      expect(coverage.ratio).toBeNull();
      expect(coverage.notApplicable).toBe(2);
    });
  });

  it("gives null, not 0%, when nothing has been assessed", () => {
    const coverage = calculateCoverage([]);
    expect(coverage.percent).toBeNull();
    expect(coverage.scored).toBe(0);
  });

  it("rounds to a whole percent", () => {
    // 1 of 3 = 33.33...
    expect(calculateCoverage([I, N, N]).percent).toBe(33);
    // 2 of 3 = 66.66...
    expect(calculateCoverage([I, I, N]).percent).toBe(67);
  });

  it("keeps the unrounded ratio available alongside the rounded percent", () => {
    const coverage = calculateCoverage([I, N, N]);
    expect(coverage.ratio).toBeCloseTo(1 / 3);
    expect(coverage.percent).toBe(33);
  });
});

describe("coverageByGroup", () => {
  const groups = [
    {
      id: "GV",
      name: "GOVERN",
      categories: [
        { assessment: { status: I } },
        { assessment: { status: N } },
        { assessment: { status: NA } },
        { assessment: null },
      ],
    },
    { id: "ID", name: "IDENTIFY", categories: [{ assessment: null }] },
  ];

  it("scores each group independently", () => {
    const [gv] = coverageByGroup(groups);
    expect(gv.percent).toBe(50); // 1 of 2 scored; N/A out, unassessed out
  });

  it("counts assessed separately from scored", () => {
    const [gv] = coverageByGroup(groups);
    expect(gv.assessed).toBe(3); // includes the N/A
    expect(gv.scored).toBe(2); // excludes it
    expect(gv.total).toBe(4); // includes the unassessed one
  });

  it("reports a group with nothing assessed as null rather than 0%", () => {
    const [, id] = coverageByGroup(groups);
    expect(id.percent).toBeNull();
    expect(id.assessed).toBe(0);
  });
});
