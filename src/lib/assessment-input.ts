import { z } from "zod";
import { AssessmentStatus } from "@/generated/prisma/enums";

/**
 * Validation for an assessment write, kept separate from the Server Action that
 * performs it so it can be tested without a database or a request.
 *
 * Everything reaching here came from a browser. SQLite stores the status as
 * plain TEXT with no CHECK constraint — Prisma enforces enums at the client
 * layer, not in the file — so this schema is the only thing standing between a
 * crafted request and a row with a nonsense status in it.
 */
const schema = z.object({
  categoryId: z.string().regex(/^[A-Z]{2}\.[A-Z]{2}$/, "Not a category ID"),
  status: z.enum(AssessmentStatus),
  notes: z.string().max(4000, "Notes are limited to 4000 characters").nullish(),
});

export type ValidAssessment = {
  categoryId: string;
  status: AssessmentStatus;
  notes: string | null;
};

export type ValidationResult =
  | { ok: true; value: ValidAssessment }
  | { ok: false; error: string };

export const NOT_APPLICABLE_NEEDS_NOTE =
  "Marking a category not applicable requires a justification.";

export function validateAssessment(raw: unknown): ValidationResult {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Empty and whitespace-only notes are the same thing: no note.
  const notes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;

  // Scoping a control out is a real assessment decision and has to be
  // defensible to whoever reads the dashboard, so it cannot be recorded
  // silently. Enforced here rather than only in the UI, because the UI is not
  // a control.
  if (parsed.data.status === "NOT_APPLICABLE" && !notes) {
    return { ok: false, error: NOT_APPLICABLE_NEEDS_NOTE };
  }

  return {
    ok: true,
    value: { categoryId: parsed.data.categoryId, status: parsed.data.status, notes },
  };
}
