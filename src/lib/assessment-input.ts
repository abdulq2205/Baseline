import { z } from "zod";
import { AssessmentStatus } from "@/generated/prisma/enums";
import { isGap } from "@/lib/status";
import { SCALE_MAX, SCALE_MIN } from "@/lib/risk";

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
  // z.coerce is deliberate: these arrive from the browser and may be strings.
  // .int() rejects 2.5, and the bounds reject 0, 6 and negatives.
  likelihood: z.coerce
    .number()
    .int("Likelihood must be a whole number")
    .min(SCALE_MIN, `Likelihood must be ${SCALE_MIN}-${SCALE_MAX}`)
    .max(SCALE_MAX, `Likelihood must be ${SCALE_MIN}-${SCALE_MAX}`)
    .nullish(),
  impact: z.coerce
    .number()
    .int("Impact must be a whole number")
    .min(SCALE_MIN, `Impact must be ${SCALE_MIN}-${SCALE_MAX}`)
    .max(SCALE_MAX, `Impact must be ${SCALE_MIN}-${SCALE_MAX}`)
    .nullish(),
  owner: z.string().max(120, "Owner is limited to 120 characters").nullish(),
});

export type ValidAssessment = {
  categoryId: string;
  status: AssessmentStatus;
  notes: string | null;
  likelihood: number | null;
  impact: number | null;
  owner: string | null;
};

export type ValidationResult =
  | { ok: true; value: ValidAssessment }
  | { ok: false; error: string };

export const NOT_APPLICABLE_NEEDS_NOTE =
  "Marking a category not applicable requires a justification.";

export const INCOMPLETE_RISK_SCORE =
  "A gap needs both likelihood and impact, or neither. A score with one half missing cannot be ranked.";

/** Empty and whitespace-only text are the same thing: absent. */
const clean = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

export function validateAssessment(raw: unknown): ValidationResult {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { categoryId, status } = parsed.data;
  const notes = clean(parsed.data.notes);

  // Scoping a control out is a real assessment decision and has to be
  // defensible to whoever reads the dashboard, so it cannot be recorded
  // silently. Enforced here rather than only in the UI, because the UI is not
  // a control.
  if (status === "NOT_APPLICABLE" && !notes) {
    return { ok: false, error: NOT_APPLICABLE_NEEDS_NOTE };
  }

  // Risk scoring and owner only mean anything on a gap. Clearing them here rather
  // than ignoring them means that fixing a category — moving it from PARTIAL to
  // IMPLEMENTED — does not leave an orphaned score and owner hanging off a row
  // that is no longer a gap, which would then show up on the dashboard.
  const gap = isGap(status);

  const likelihood = gap ? (parsed.data.likelihood ?? null) : null;
  const impact = gap ? (parsed.data.impact ?? null) : null;

  // Half a score is worse than none. It cannot be ranked, but it looks scored,
  // so it would sit in the gaps table implying someone had judged it.
  if ((likelihood === null) !== (impact === null)) {
    return { ok: false, error: INCOMPLETE_RISK_SCORE };
  }

  return {
    ok: true,
    value: {
      categoryId,
      status,
      notes,
      likelihood,
      impact,
      owner: gap ? clean(parsed.data.owner) : null,
    },
  };
}
