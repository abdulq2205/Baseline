import { statusMeta } from "@/lib/status";
import type { AssessmentStatus } from "@/generated/prisma/enums";

/**
 * Coverage.
 *
 *     (IMPLEMENTED + 0.5 x PARTIAL) / (total assessed, excluding NOT_APPLICABLE)
 *
 * Pure: no database, no clock, no I/O. It takes statuses and returns numbers,
 * which is what makes it testable and what makes it possible to show the working
 * in the UI rather than just the result.
 *
 * Three decisions are encoded here and all three are worth being able to defend:
 *
 * 1. PARTIAL counts as half. It is a blunt instrument — "we have some of this"
 *    is not really 50% of anything measurable — but the alternative is worse.
 *    Counting PARTIAL as zero tells an organization that starting work earns
 *    nothing, and counting it as one tells them a half-finished control is done.
 *    Half is the honest middle, and the number is for tracking direction rather
 *    than for grading.
 *
 * 2. NOT_APPLICABLE leaves the calculation entirely — it is in neither the
 *    numerator nor the denominator. Scoping a control out is a legitimate
 *    decision and should neither be punished (a zero) nor rewarded (a free
 *    point). A one-person nonprofit with no cloud infrastructure should not be
 *    scored down for a control about cloud infrastructure.
 *
 * 3. Unassessed categories are excluded too. Coverage answers "of what you have
 *    looked at, how much is in place" — not "how far through the assessment are
 *    you", which is what the assessed count is for. Reporting them together
 *    would conflate not knowing with not having.
 */

/** Shown in the UI next to the number, so the number is never bare. */
export const COVERAGE_FORMULA =
  "(implemented + 0.5 x partial) / categories assessed, excluding not applicable";

export type Coverage = {
  /** Weighted points earned. */
  earned: number;
  /** Categories in the denominator: assessed, minus not-applicable. */
  scored: number;
  /** 0-1, or null when nothing counts toward it yet. */
  ratio: number | null;
  /** Rounded whole percent, or null. Null is not zero — it means "no basis yet". */
  percent: number | null;
  /** Assessed but scoped out. Reported so the number can be explained. */
  notApplicable: number;
};

/**
 * @param statuses the statuses of *assessed* categories only. Categories with no
 *   assessment must not be passed in — see decision 3 above.
 */
export function calculateCoverage(statuses: readonly AssessmentStatus[]): Coverage {
  let earned = 0;
  let scored = 0;
  let notApplicable = 0;

  for (const status of statuses) {
    const { weight } = statusMeta(status);
    if (weight === null) {
      notApplicable += 1;
      continue;
    }
    earned += weight;
    scored += 1;
  }

  // Nothing assessed, or everything assessed was scoped out. Both mean there is
  // no basis for a percentage. Returning 0 here would be a lie — it reads as
  // "nothing is in place" when the truth is "we have not measured anything".
  if (scored === 0) {
    return { earned: 0, scored: 0, ratio: null, percent: null, notApplicable };
  }

  const ratio = earned / scored;
  return { earned, scored, ratio, percent: Math.round(ratio * 100), notApplicable };
}

/** Coverage for one group (a function), plus how far through it the user is. */
export type GroupCoverage = Coverage & {
  id: string;
  name: string;
  assessed: number;
  total: number;
};

export function coverageByGroup(
  groups: readonly {
    id: string;
    name: string;
    categories: readonly { assessment: { status: AssessmentStatus } | null }[];
  }[],
): GroupCoverage[] {
  return groups.map((group) => {
    const statuses = group.categories
      .map((category) => category.assessment?.status)
      .filter((status): status is AssessmentStatus => status !== undefined);

    return {
      id: group.id,
      name: group.name,
      assessed: statuses.length,
      total: group.categories.length,
      ...calculateCoverage(statuses),
    };
  });
}
