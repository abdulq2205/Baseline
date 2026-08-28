"use client";

import { useState } from "react";
import { COVERAGE_FORMULA } from "@/lib/coverage";

/**
 * The formula, one click from the number.
 *
 * The PRD requires the formula to be visible rather than just the percentage,
 * and that is not decoration: a coverage number with no stated definition is
 * exactly the kind of figure that gets quoted in a board pack and then cannot
 * be reproduced by anyone.
 */
export function CoverageInfo() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="How coverage is calculated"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 hover:border-slate-500 hover:text-slate-900"
      >
        i
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-10 block w-72 rounded-md border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg">
          <span className="block font-mono text-[11px] text-slate-900">{COVERAGE_FORMULA}</span>
          <span className="mt-2 block">
            Partial counts as a half. Not applicable is left out of both sides — scoping a
            control out should neither raise nor lower the score. Categories you have not
            assessed yet are not counted either.
          </span>
        </span>
      )}
    </span>
  );
}
