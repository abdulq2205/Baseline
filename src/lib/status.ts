import type { AssessmentStatus } from "@/generated/prisma/enums";

/**
 * Presentation and semantics for the four statuses, in one place.
 *
 * `weight` is the part that matters beyond styling: it is what the coverage
 * formula reads. IMPLEMENTED counts as a full point, PARTIAL a half,
 * NOT_IMPLEMENTED nothing, and NOT_APPLICABLE is null — meaning it leaves the
 * calculation entirely rather than scoring zero. Scoping a control out should
 * neither penalise nor inflate the score.
 *
 * Order matches the PRD's button order: best case first.
 */
export const ASSESSMENT_STATUSES = [
  {
    value: "IMPLEMENTED",
    label: "Implemented",
    hint: "This is in place today.",
    weight: 1,
    selectedClassName: "bg-emerald-600 text-white ring-emerald-600",
  },
  {
    value: "PARTIAL",
    label: "Partial",
    hint: "Some of this exists, but not all of it.",
    weight: 0.5,
    selectedClassName: "bg-amber-500 text-white ring-amber-500",
  },
  {
    value: "NOT_IMPLEMENTED",
    label: "Not implemented",
    hint: "Nothing covers this yet.",
    weight: 0,
    selectedClassName: "bg-rose-600 text-white ring-rose-600",
  },
  {
    value: "NOT_APPLICABLE",
    label: "N/A",
    hint: "Out of scope for this organization. Requires a justification.",
    weight: null,
    selectedClassName: "bg-slate-600 text-white ring-slate-600",
  },
] as const satisfies ReadonlyArray<{
  value: AssessmentStatus;
  label: string;
  hint: string;
  weight: number | null;
  selectedClassName: string;
}>;

export type StatusMeta = (typeof ASSESSMENT_STATUSES)[number];

const BY_VALUE = new Map<AssessmentStatus, StatusMeta>(
  ASSESSMENT_STATUSES.map((status) => [status.value, status]),
);

export function statusMeta(value: AssessmentStatus): StatusMeta {
  const meta = BY_VALUE.get(value);
  // Unreachable through the type system; reachable if a row were written to the
  // database outside the app, which SQLite permits.
  if (!meta) throw new Error(`Unknown assessment status: ${value}`);
  return meta;
}

/** A gap is a category the organization has not covered, or has only partly covered. */
export const isGap = (status: AssessmentStatus | null | undefined): boolean =>
  status === "NOT_IMPLEMENTED" || status === "PARTIAL";

