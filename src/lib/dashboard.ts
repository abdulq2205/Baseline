import { prisma } from "@/lib/db";
import { calculateCoverage, coverageByGroup, type Coverage, type GroupCoverage } from "@/lib/coverage";
import type { AssessmentStatus } from "@/generated/prisma/enums";

export type OpenGap = {
  categoryId: string;
  categoryName: string;
  plainLanguage: string | null;
  status: AssessmentStatus;
  likelihood: number | null;
  impact: number | null;
  owner: string | null;
};

export type DashboardData = {
  coverage: Coverage;
  byFunction: GroupCoverage[];
  assessed: number;
  totalCategories: number;
  gaps: OpenGap[];
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
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      plainLanguage: category.plainLanguage,
      status: category.assessment!.status,
      likelihood: category.assessment!.likelihood,
      impact: category.assessment!.impact,
      owner: category.assessment!.owner,
    }))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId));

  return {
    coverage: calculateCoverage(statuses),
    byFunction: coverageByGroup(functions),
    assessed: statuses.length,
    totalCategories: categories.length,
    gaps,
  };
}
