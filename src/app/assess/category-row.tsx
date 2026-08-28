"use client";

import { useId, useState } from "react";
import { ASSESSMENT_STATUSES } from "@/lib/status";
import type { AssessmentStatus } from "@/generated/prisma/enums";
import type { CategoryNode } from "@/lib/catalog";
import type { AnswerState } from "./assess-workspace";

export function CategoryRow({
  category,
  answer,
  onStatusChange,
  onNotesChange,
}: {
  category: CategoryNode;
  answer: AnswerState;
  onStatusChange: (status: AssessmentStatus) => void;
  onNotesChange: (notes: string) => void;
}) {
  const [showStatement, setShowStatement] = useState(false);
  const notesId = useId();
  const statementId = useId();

  // The justification for scoping something out is not optional, so the notes
  // field opens itself rather than waiting to be found.
  const notesRequired = answer.status === "NOT_APPLICABLE";
  const showNotes = answer.status !== null || answer.notes.length > 0;

  return (
    <li className="px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-xs font-semibold text-slate-500">{category.id}</span>

          {/* The plain-language line leads, because it is the one a
              non-specialist can act on. NIST's wording is a click away. */}
          <p className="mt-1 text-sm text-slate-900">
            {category.plainLanguage?.trim() || (
              <span className="text-slate-400 italic">No explanation written yet.</span>
            )}
          </p>

          <button
            type="button"
            onClick={() => setShowStatement((open) => !open)}
            aria-expanded={showStatement}
            aria-controls={statementId}
            className="mt-2 text-xs text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-900"
          >
            {showStatement ? "Hide" : "Show"} NIST description
          </button>
          {showStatement && (
            <blockquote
              id={statementId}
              className="mt-2 border-l-2 border-slate-300 py-0.5 pl-3 text-sm text-slate-600"
            >
              <span className="font-medium text-slate-700">{category.name}. </span>
              {category.statement}
            </blockquote>
          )}
        </div>

        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Status for {category.id}</legend>
          {ASSESSMENT_STATUSES.map((status) => {
            const selected = answer.status === status.value;
            return (
              <button
                key={status.value}
                type="button"
                title={status.hint}
                aria-pressed={selected}
                onClick={() => onStatusChange(status.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 transition-colors ${
                  selected
                    ? status.selectedClassName
                    : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {status.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      {showNotes && (
        <div className="mt-4">
          <label htmlFor={notesId} className="text-xs font-medium text-slate-600">
            {notesRequired ? "Justification (required)" : "What exists today"}
          </label>
          <textarea
            id={notesId}
            rows={2}
            value={answer.notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder={
              notesRequired
                ? "Why is this out of scope for your organization?"
                : "Optional. What is in place, and where does it fall short?"
            }
            aria-invalid={answer.sync === "error"}
            className={`mt-1 block w-full resize-y rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${
              answer.sync === "error" ? "border-rose-400" : "border-slate-200"
            }`}
          />
          <p className="mt-1 min-h-4 text-xs">
            {answer.sync === "saving" && <span className="text-slate-400">Saving…</span>}
            {answer.sync === "saved" && <span className="text-emerald-700">Saved</span>}
            {answer.sync === "error" && (
              <span role="alert" className="font-medium text-rose-700">
                {answer.error}
              </span>
            )}
          </p>
        </div>
      )}
    </li>
  );
}
