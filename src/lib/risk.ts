/**
 * Risk scoring: likelihood x impact, 1-25.
 *
 * Pure. No database, no clock, no I/O. This is the part of the tool that has to
 * be explainable, so it is also the part worth testing hardest.
 *
 * Why two dimensions instead of one label. A single HIGH/MEDIUM/LOW is a
 * judgement with nothing underneath it: two people can disagree and there is no
 * way to reconcile them, because there is no question they are both answering.
 * Splitting it into "how likely is this to bite us" and "how bad would it be"
 * gives two answerable questions, and the reasoning stays visible in the inputs
 * rather than being collapsed into the output.
 *
 * This is not more precise in any scientific sense. Multiplying two ordinal
 * scales does not produce a measurement — a 12 is not twice as bad as a 6, and
 * the inputs are opinions. What it is, is defensible and reproducible.
 */

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

/** 1-5, worst last. The UI shows the label; a bare number means nothing. */
export const LIKELIHOOD_SCALE = [
  { value: 1, label: "Rare", meaning: "Would require an unusual combination of circumstances" },
  { value: 2, label: "Unlikely", meaning: "Possible but no reason to expect it" },
  { value: 3, label: "Possible", meaning: "Could reasonably happen at some point" },
  { value: 4, label: "Likely", meaning: "Expected to happen unless something changes" },
  { value: 5, label: "Almost certain", meaning: "Happening now, or will happen imminently" },
] as const;

export const IMPACT_SCALE = [
  { value: 1, label: "Negligible", meaning: "Minor inconvenience, no lasting effect" },
  { value: 2, label: "Minor", meaning: "Some disruption, contained and recoverable" },
  { value: 3, label: "Moderate", meaning: "Meaningful disruption or limited data exposure" },
  { value: 4, label: "Major", meaning: "Serious harm to people, operations, or trust" },
  { value: 5, label: "Severe", meaning: "Catastrophic. Loss of sensitive data, or the organization cannot operate" },
] as const;

/**
 * Bands over the 1-25 score, low to critical.
 *
 * The bands are deliberately uneven. The 25 combinations do not spread evenly
 * across 1-25 — far more of them land in the middle than at either end — so
 * equal-width bands would put most gaps in one bucket and tell you nothing.
 *
 * The boundaries are also chosen so one elevated dimension alone cannot reach
 * Critical: 5 x 1 = 5 is Medium and 5 x 2 = 10 is only High. Something
 * catastrophic that will almost certainly never happen is not the same problem
 * as something catastrophic that is already happening, and the bands should say
 * so. Reaching Critical requires both dimensions to be elevated.
 */
export const RISK_BANDS = [
  { name: "Low", min: 1, max: 4, className: "bg-emerald-50 text-emerald-800 ring-emerald-600/30", cellClassName: "bg-emerald-100 text-emerald-900" },
  { name: "Medium", min: 5, max: 9, className: "bg-amber-50 text-amber-900 ring-amber-600/30", cellClassName: "bg-amber-100 text-amber-900" },
  { name: "High", min: 10, max: 14, className: "bg-orange-50 text-orange-900 ring-orange-600/30", cellClassName: "bg-orange-200 text-orange-900" },
  { name: "Critical", min: 15, max: 25, className: "bg-rose-50 text-rose-800 ring-rose-700/30", cellClassName: "bg-rose-300 text-rose-950" },
] as const;

export type RiskBand = (typeof RISK_BANDS)[number];
export type RiskBandName = RiskBand["name"];

export const RISK_BAND_NAMES = RISK_BANDS.map((band) => band.name) as readonly RiskBandName[];

const inScale = (value: number) =>
  Number.isInteger(value) && value >= SCALE_MIN && value <= SCALE_MAX;

/** likelihood x impact. Throws outside 1-5 rather than quietly clamping. */
export function calculateScore(likelihood: number, impact: number): number {
  if (!inScale(likelihood) || !inScale(impact)) {
    throw new RangeError(
      `Likelihood and impact must be integers ${SCALE_MIN}-${SCALE_MAX}, got ${likelihood} and ${impact}`,
    );
  }
  return likelihood * impact;
}

/** The band a score falls in. Throws outside 1-25 rather than guessing. */
export function getBand(score: number): RiskBand {
  const band = RISK_BANDS.find((candidate) => score >= candidate.min && score <= candidate.max);
  if (!band) throw new RangeError(`Risk score ${score} is outside 1-25`);
  return band;
}

/** Convenience for the common case of going straight from inputs to a band. */
export const scoreBand = (likelihood: number, impact: number): RiskBand =>
  getBand(calculateScore(likelihood, impact));

export const likelihoodLabel = (value: number) =>
  LIKELIHOOD_SCALE.find((step) => step.value === value)?.label ?? String(value);

export const impactLabel = (value: number) =>
  IMPACT_SCALE.find((step) => step.value === value)?.label ?? String(value);
