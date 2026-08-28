"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validateAssessment } from "@/lib/assessment-input";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Record where the organization stands on one category. */
export async function saveAssessment(raw: unknown): Promise<SaveResult> {
  const validated = validateAssessment(raw);
  if (!validated.ok) return { ok: false, error: validated.error };

  const { categoryId, status, notes } = validated.value;

  try {
    await prisma.assessment.upsert({
      where: { categoryId },
      create: { categoryId, status, notes },
      update: { status, notes },
    });
  } catch {
    // Almost always a foreign key miss: an ID that is well-formed but not in
    // the seeded catalog.
    return { ok: false, error: `No category ${categoryId} in the catalog.` };
  }

  // A Server Action already refreshes the route it was called from, so /assess
  // is not listed. The dashboard reads the same rows and would otherwise keep
  // serving a page that predates this write.
  revalidatePath("/");

  return { ok: true };
}
