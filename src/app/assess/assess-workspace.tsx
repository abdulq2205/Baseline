"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryRow } from "./category-row";
import { saveAssessment } from "./actions";
import { NOT_APPLICABLE_NEEDS_NOTE } from "@/lib/assessment-input";
import { isGap } from "@/lib/status";
import type { AssessmentStatus } from "@/generated/prisma/enums";
import type { FunctionNode } from "@/lib/catalog";

/** How long to wait after the last keystroke before writing notes. */
const NOTES_DEBOUNCE_MS = 800;
/** How long "Saved" stays on screen. It is a confirmation, not a state. */
const SAVED_VISIBLE_MS = 2000;

export type AnswerState = {
  status: AssessmentStatus | null;
  notes: string;
  likelihood: number | null;
  impact: number | null;
  owner: string;
  sync: "idle" | "saving" | "saved" | "error";
  error?: string;
};

/** The fields a write actually carries — everything but the sync bookkeeping. */
type Draft = Pick<AnswerState, "status" | "notes" | "likelihood" | "impact" | "owner">;

const draftOf = (answer: AnswerState): Draft => ({
  status: answer.status,
  notes: answer.notes,
  likelihood: answer.likelihood,
  impact: answer.impact,
  owner: answer.owner,
});

const sameDraft = (a: Draft, b: Draft) =>
  a.status === b.status &&
  a.notes === b.notes &&
  a.likelihood === b.likelihood &&
  a.impact === b.impact &&
  a.owner === b.owner;

export function AssessWorkspace({ functions }: { functions: FunctionNode[] }) {
  const categories = useMemo(
    () => functions.flatMap((fn) => fn.categories),
    [functions],
  );

  // One map keyed by category ID rather than state inside each row, because the
  // per-function progress counts need to read every answer at once.
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(
      categories.map((category) => [
        category.id,
        {
          status: category.assessment?.status ?? null,
          notes: category.assessment?.notes ?? "",
          likelihood: category.assessment?.likelihood ?? null,
          impact: category.assessment?.impact ?? null,
          owner: category.assessment?.owner ?? "",
          sync: "idle" as const,
        },
      ]),
    ),
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // One pending timer per category, so typing in one row never cancels
  // another row's queued write.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const persist = useCallback(async (id: string, draft: Draft) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], sync: "saving" } }));

    const result = await saveAssessment({ categoryId: id, ...draft });

    setAnswers((prev) => {
      const current = prev[id];
      // The row moved on while the request was in flight; that newer edit owns
      // the state and has its own save.
      if (!sameDraft(draftOf(current), draft)) return prev;
      return {
        ...prev,
        [id]: result.ok
          ? { ...current, sync: "saved" }
          : { ...current, sync: "error", error: result.error },
      };
    });

    // Clear the confirmation again, but only if nothing has happened to the row
    // since — a later save or an error owns the indicator by then.
    if (result.ok) {
      setTimeout(() => {
        setAnswers((prev) =>
          prev[id].sync === "saved"
            ? { ...prev, [id]: { ...prev[id], sync: "idle" } }
            : prev,
        );
      }, SAVED_VISIBLE_MS);
    }
  }, []);

  /** Queue a save, replacing any save already queued for this row. */
  const schedule = useCallback(
    (id: string, draft: Draft, delay: number) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => void persist(id, draft), delay);
    },
    [persist],
  );

  const onStatusChange = useCallback(
    (id: string, status: AssessmentStatus) => {
      setAnswers((prev) => {
        // Leaving gap status drops priority and owner, matching what the server
        // stores. Keeping them in the UI would show a priority on a category
        // that is no longer a gap.
        const gap = isGap(status);
        const next: AnswerState = {
          ...prev[id],
          status,
          likelihood: gap ? prev[id].likelihood : null,
          impact: gap ? prev[id].impact : null,
          owner: gap ? prev[id].owner : "",
        };

        // Refused by the Server Action too. Catching it here means the user
        // gets the message next to the field that fixes it rather than
        // watching a request fail.
        if (status === "NOT_APPLICABLE" && !next.notes.trim()) {
          clearTimeout(timers.current[id]);
          return {
            ...prev,
            [id]: { ...next, sync: "error", error: NOT_APPLICABLE_NEEDS_NOTE },
          };
        }

        // A status click is deliberate and final, so it saves immediately
        // rather than waiting out the notes debounce.
        schedule(id, draftOf(next), 0);
        return { ...prev, [id]: { ...next, sync: "saving" } };
      });
    },
    [schedule],
  );

  const onNotesChange = useCallback(
    (id: string, notes: string) => {
      setAnswers((prev) => {
        const status = prev[id].status;
        // Notes with no status would be a row with nothing to record.
        if (status === null) return { ...prev, [id]: { ...prev[id], notes } };

        if (status === "NOT_APPLICABLE" && !notes.trim()) {
          clearTimeout(timers.current[id]);
          return {
            ...prev,
            [id]: { ...prev[id], notes, sync: "error", error: NOT_APPLICABLE_NEEDS_NOTE },
          };
        }

        const next = { ...prev[id], notes };
        schedule(id, draftOf(next), NOTES_DEBOUNCE_MS);
        return { ...prev, [id]: { ...next, sync: "saving" } };
      });
    },
    [schedule],
  );

  const onOwnerChange = useCallback(
    (id: string, owner: string) => {
      setAnswers((prev) => {
        if (prev[id].status === null) return { ...prev, [id]: { ...prev[id], owner } };
        const next = { ...prev[id], owner };
        schedule(id, draftOf(next), NOTES_DEBOUNCE_MS);
        return { ...prev, [id]: { ...next, sync: "saving" } };
      });
    },
    [schedule],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Assessment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Where the organization stands on each of the 22 NIST CSF 2.0 categories.
        </p>
      </div>

      {functions.map((fn) => {
        const open = !collapsed[fn.id];
        const assessed = fn.categories.filter((c) => answers[c.id].status !== null).length;

        return (
          <section
            key={fn.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [fn.id]: open }))}
              aria-expanded={open}
              className="flex w-full items-baseline gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-6"
            >
              <span className="font-mono text-xs font-semibold text-slate-500">{fn.id}</span>
              <span className="font-semibold tracking-tight text-slate-900 capitalize">
                {fn.name.toLowerCase()}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {assessed} of {fn.categories.length} assessed
              </span>
            </button>

            {open && (
              <ul className="divide-y divide-slate-100 border-t border-slate-200">
                {fn.categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    answer={answers[category.id]}
                    onStatusChange={(status) => onStatusChange(category.id, status)}
                    onNotesChange={(notes) => onNotesChange(category.id, notes)}
                    onOwnerChange={(owner) => onOwnerChange(category.id, owner)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
