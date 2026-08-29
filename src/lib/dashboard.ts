import { prisma } from "@/lib/db";
import { calculateCoverage, coverageByGroup, type Coverage, type GroupCoverage } from "@/lib/coverage";
import { RISK_BANDS, calculateScore, getBand, type RiskBandName } from "@/lib/risk";
import type { AssessmentStatus } from "@/generated/prisma/enums";

export type OpenGap = {
  categoryId: string;
  categoryName: string;
  plainLanguage: string | null;
  status: AssessmentStatus;
  likelihood: number | null;
  impact: number | null;
  owner: string | null;
  /** Null when the gap has not been scored yet. */
  score: number | null;
  band: RiskBandName | null;
};

/** One cell of the 5x5 matrix. Only occupied cells appear. */
export type HeatMapCell = { likelihood: number; impact: number; count: number };

export type DashboardData = {
  coverage: Coverage;
  byFunction: GroupCoverage[];
  assessed: number;
  totalCategories: number;
  gaps: OpenGap[];
  heatMap: HeatMapCell[];
  bandCounts: { band: RiskBandName; count: number }[];
  unscoredGaps: number;
};

export async function loadDashboard(): Promise<DashboardData> {
  const functions = await prisma.function.findMany({
    orderBy: { order: "asc" },
    include: {
      categories: {
        orderBy: { id: "asc" },
        include: { assessment: { select: { status: true, likelihood: true, impact: true, owner: true } } },
      },
    },
  });

  const categories = functions.flatMap((fn) => fn.categories);
  const statuses = categories
    .map((category) => category.assessment?.status)
    .filter((status): status is AssessmentStatus => status !== undefined);

  const gaps = categories
    .filter(
      (category) =>
        category.assessment?.status === "NOT_IMPLEMENTED" ||
        category.assessment?.status === "PARTIAL",
    )
    .map((category) => {
      const { status, likelihood, impact, owner } = category.assessment!;
      // Both or neither, enforced by the validator, so one check covers it.
      const score = likelihood !== null && impact !== null ? calculateScore(likelihood, impact) : null;
      return {
        categoryId: category.id,
        categoryName: category.name,
        plainLanguage: category.plainLanguage,
        status,
        likelihood,
        impact,
        owner,
        score,
        band: score === null ? null : getBand(score).name,
      };
    })
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId));

  const scored = gaps.filter((gap) => gap.score !== null);

  // Only occupied cells are returned. An empty cell renders empty rather than
  // as a zero, so the eye lands on where the risk actually is.
  const counts = new Map<string, HeatMapCell>();
  for (const gap of scored) {
    const key = `${gap.likelihood}:${gap.impact}`;
    const cell = counts.get(key) ?? { likelihood: gap.likelihood!, impact: gap.impact!, count: 0 };
    cell.count += 1;
    counts.set(key, cell);
  }

  const bandCounts = RISK_BANDS.map((band) => ({
    band: band.name,
    count: scored.filter((gap) => gap.band === band.name).length,
  }));

  return {
    coverage: calculateCoverage(statuses),
    byFunction: coverageByGroup(functions),
    assessed: statuses.length,
    totalCategories: categories.length,
    gaps,
    heatMap: [...counts.values()],
    bandCounts,
    unscoredGaps: gaps.length - scored.length,
  };
}
