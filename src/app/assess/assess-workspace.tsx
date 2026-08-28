"use client";

import { useCallback, useMemo, useState } from "react";
import { CategoryRow } from "./category-row";
import { saveAssessment } from "./actions";
import { NOT_APPLICABLE_NEEDS_NOTE } from "@/lib/assessment-input";
import type { AssessmentStatus } from "@/generated/prisma/enums";
import type { FunctionNode } from "@/lib/catalog";

export type AnswerState = {
  status: AssessmentStatus | null;
  notes: string;
  sync: "idle" | "saving" | "saved" | "error";
  error?: string;
};

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
          sync: "idle" as const,
        },
      ]),
    ),
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const persist = useCallback(
    async (id: string, status: AssessmentStatus, notes: string) => {
      setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], sync: "saving" } }));

      const result = await saveAssessment({ categoryId: id, status, notes });

      setAnswers((prev) => {
        const current = prev[id];
        // The row moved on while the request was in flight; that newer edit
        // owns the state and has its own save.
        if (current.status !== status || current.notes !== notes) return prev;
        return {
          ...prev,
          [id]: result.ok
            ? { ...current, sync: "saved" }
            : { ...current, sync: "error", error: result.error },
        };
      });
    },
    [],
  );

  const onStatusChange = useCallback(
    (id: string, status: AssessmentStatus) => {
      setAnswers((prev) => {
        const notes = prev[id].notes;

        // Refused by the Server Action too. Catching it here means the user
        // gets the message next to the field that fixes it rather than
        // watching a request fail.
        if (status === "NOT_APPLICABLE" && !notes.trim()) {
          return {
            ...prev,
            [id]: { ...prev[id], status, sync: "error", error: NOT_APPLICABLE_NEEDS_NOTE },
          };
        }

        void persist(id, status, notes);
        return { ...prev, [id]: { ...prev[id], status, sync: "saving" } };
      });
    },
    [persist],
  );

  const onNotesChange = useCallback((id: string, notes: string) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], notes } }));
  }, []);

  /** Notes save when the field loses focus; typing does not write on every key. */
  const onNotesBlur = useCallback(
    (id: string) => {
      setAnswers((prev) => {
        const { status, notes } = prev[id];
        if (status === null) return prev;
        if (status === "NOT_APPLICABLE" && !notes.trim()) {
          return {
            ...prev,
            [id]: { ...prev[id], sync: "error", error: NOT_APPLICABLE_NEEDS_NOTE },
          };
        }
        void persist(id, status, notes);
        return prev;
      });
    },
    [persist],
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
                    onNotesBlur={() => onNotesBlur(category.id)}
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
