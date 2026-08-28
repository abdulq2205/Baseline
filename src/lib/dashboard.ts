import { prisma } from "@/lib/db";
import { calculateCoverage, coverageByGroup, type Coverage, type GroupCoverage } from "@/lib/coverage";
import type { AssessmentStatus, Priority } from "@/generated/prisma/enums";

export type OpenGap = {
  categoryId: string;
  categoryName: string;
  plainLanguage: string | null;
  status: AssessmentStatus;
  priority: Priority | null;
  owner: string | null;
};

export type DashboardData = {
  coverage: Coverage;
  byFunction: GroupCoverage[];
  assessed: number;
  totalCategories: number;
  gaps: OpenGap[];
};

/** Most urgent first. An unset priority sorts last — it is not "low", it is unset. */
const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const rank = (priority: Priority | null) => (priority === null ? 3 : PRIORITY_RANK[priority]);

export async function loadDashboard(): Promise<DashboardData> {
  const functions = await prisma.function.findMany({
    orderBy: { order: "asc" },
    include: {
      categories: {
        orderBy: { id: "asc" },
        include: { assessment: { select: { status: true, priority: true, owner: true } } },
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
      priority: category.assessment!.priority,
      owner: category.assessment!.owner,
    }))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || a.categoryId.localeCompare(b.categoryId));

  return {
    coverage: calculateCoverage(statuses),
    byFunction: coverageByGroup(functions),
    assessed: statuses.length,
    totalCategories: categories.length,
    gaps,
  };
}
