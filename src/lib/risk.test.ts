import { describe, expect, it } from "vitest";
import {
  IMPACT_SCALE,
  LIKELIHOOD_SCALE,
  RISK_BANDS,
  SCALE_MAX,
  SCALE_MIN,
  calculateScore,
  getBand,
  impactLabel,
  likelihoodLabel,
  scoreBand,
} from "./risk";

describe("calculateScore", () => {
  it.each([
    [1, 1, 1],
    [3, 3, 9],
    [5, 5, 25],
    [4, 2, 8],
    [2, 4, 8],
  ])("scores %i x %i as %i", (likelihood, impact, expected) => {
    expect(calculateScore(likelihood, impact)).toBe(expected);
  });

  it("is symmetric", () => {
    expect(calculateScore(2, 5)).toBe(calculateScore(5, 2));
  });

  it.each([
    ["zero", 0],
    ["above the scale", 6],
    ["negative", -1],
    ["fractional", 2.5],
    ["NaN", Number.NaN],
  ])("rejects %s", (_label, bad) => {
    expect(() => calculateScore(bad, 3)).toThrow(RangeError);
    expect(() => calculateScore(3, bad)).toThrow(RangeError);
  });

  it("accepts both ends of the scale", () => {
    expect(() => calculateScore(SCALE_MIN, SCALE_MAX)).not.toThrow();
  });
});

describe("getBand", () => {
  it.each([
    [1, "Low"],
    [4, "Low"],
    [5, "Medium"],
    [9, "Medium"],
    [10, "High"],
    [14, "High"],
    [15, "Critical"],
    [25, "Critical"],
  ])("puts %i in %s", (score, expected) => {
    expect(getBand(score).name).toBe(expected);
  });

  it("covers every score from 1 to 25 with no gaps", () => {
    for (let score = 1; score <= 25; score += 1) {
      expect(() => getBand(score)).not.toThrow();
    }
  });

  it("has bands that are contiguous and do not overlap", () => {
    RISK_BANDS.forEach((band, index) => {
      if (index === 0) return;
      expect(band.min).toBe(RISK_BANDS[index - 1].max + 1);
    });
  });

  it.each([0, 26, -1])("rejects %i as outside 1-25", (score) => {
    expect(() => getBand(score)).toThrow(RangeError);
  });
});

describe("band boundaries hold the design intent", () => {
  it("does not let one elevated dimension alone reach Critical", () => {
    // Catastrophic but almost impossible is not the same problem as
    // catastrophic and already happening.
    expect(scoreBand(5, 1).name).toBe("Medium");
    expect(scoreBand(1, 5).name).toBe("Medium");
    expect(scoreBand(5, 2).name).toBe("High");
    expect(scoreBand(2, 5).name).toBe("High");
  });

  it("requires both dimensions elevated to reach Critical", () => {
    expect(scoreBand(4, 4).name).toBe("Critical");
    expect(scoreBand(3, 5).name).toBe("Critical");
  });

  it("puts the middle of the scale in Medium", () => {
    expect(scoreBand(3, 3).name).toBe("Medium");
  });
});

describe("scale labels", () => {
  it("labels every likelihood value", () => {
    expect(LIKELIHOOD_SCALE.map((step) => likelihoodLabel(step.value))).toEqual([
      "Rare",
      "Unlikely",
      "Possible",
      "Likely",
      "Almost certain",
    ]);
  });

  it("labels every impact value", () => {
    expect(IMPACT_SCALE.map((step) => impactLabel(step.value))).toEqual([
      "Negligible",
      "Minor",
      "Moderate",
      "Major",
      "Severe",
    ]);
  });

  it("falls back to the number for a value off the scale", () => {
    // Reachable only from data written outside the app, which SQLite permits.
    expect(likelihoodLabel(9)).toBe("9");
    expect(impactLabel(0)).toBe("0");
  });

  it("keeps both scales at five steps", () => {
    expect(LIKELIHOOD_SCALE).toHaveLength(5);
    expect(IMPACT_SCALE).toHaveLength(5);
  });
});
