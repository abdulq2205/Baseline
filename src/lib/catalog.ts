import { prisma } from "@/lib/db";
import type { AssessmentStatus } from "@/generated/prisma/enums";

/**
 * The whole catalog with each category's current answer attached.
 *
 * One query returning 22 rows. It is loaded whole because the assessment screen
 * shows everything at once — it is a checklist, and hiding two thirds of a
 * checklist behind pagination defeats the point — and because the dashboard
 * needs every row anyway to compute coverage.
 */
export type CategoryNode = {
  id: string;
  name: string;
  statement: string;
  plainLanguage: string | null;
  assessment: {
    status: AssessmentStatus;
    notes: string | null;
    likelihood: number | null;
    impact: number | null;
    owner: string | null;
  } | null;
};

export type FunctionNode = {
  id: string;
  name: string;
  categories: CategoryNode[];
};

export async function loadCatalog(): Promise<FunctionNode[]> {
  const functions = await prisma.function.findMany({
    orderBy: { order: "asc" },
    include: {
      categories: {
        orderBy: { id: "asc" },
        include: {
          assessment: {
            select: { status: true, notes: true, likelihood: true, impact: true, owner: true },
          },
        },
      },
    },
  });

  return functions.map((fn) => ({
    id: fn.id,
    name: fn.name,
    categories: fn.categories.map((category) => ({
      id: category.id,
      name: category.name,
      statement: category.statement,
      plainLanguage: category.plainLanguage,
      assessment: category.assessment,
    })),
  }));
}
