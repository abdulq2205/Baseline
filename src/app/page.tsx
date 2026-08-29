import Link from "next/link";
import { loadDashboard } from "@/lib/dashboard";
import { CoverageInfo } from "./coverage-info";
import { statusMeta } from "@/lib/status";
import { RISK_BANDS } from "@/lib/risk";
import { HeatMap } from "./heat-map";

export const metadata = { title: "Dashboard — Baseline" };
export const dynamic = "force-dynamic";

function Metric({
  label,
  value,
  sub,
  info,
}: {
  label: string;
  value: string;
  sub: string;
  info?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {info}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { coverage, byFunction, assessed, totalCategories, gaps, heatMap, bandCounts, unscoredGaps } =
    await loadDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Where this organization stands against NIST CSF 2.0.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Coverage"
          // Null is not zero. Nothing assessed means there is no basis for a
          // percentage, and showing 0% would read as "nothing is in place".
          value={coverage.percent === null ? "—" : `${coverage.percent}%`}
          sub={
            coverage.percent === null
              ? "Nothing assessed yet"
              : `${coverage.earned} of ${coverage.scored} categories in place`
          }
          info={<CoverageInfo />}
        />
        <Metric
          label="Assessed"
          value={`${assessed}/${totalCategories}`}
          sub={
            coverage.notApplicable > 0
              ? `${coverage.notApplicable} scoped out as not applicable`
              : "Categories with a recorded status"
          }
        />
        <Metric
          label="Open gaps"
          value={String(gaps.length)}
          sub={gaps.length === 1 ? "Category needs work" : "Categories need work"}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Coverage by function</h2>
        <ul className="mt-4 space-y-3">
          {byFunction.map((fn) => (
            <li key={fn.id} className="flex items-center gap-4">
              <span className="w-28 shrink-0">
                <span className="font-mono text-xs font-semibold text-slate-500">{fn.id}</span>
                <span className="ml-2 text-sm capitalize text-slate-700">
                  {fn.name.toLowerCase()}
                </span>
              </span>

              {/* Styled divs, not a chart library — six bars do not justify a
                  dependency, and this way the bar is also a real progressbar. */}
              <span
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={fn.percent ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${fn.name} coverage`}
              >
                <span
                  className="block h-full rounded-full bg-slate-900"
                  style={{ width: `${fn.percent ?? 0}%` }}
                />
              </span>

              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-slate-600">
                {fn.percent === null ? (
                  <span className="text-slate-400">not assessed</span>
                ) : (
                  <>
                    {fn.percent}%
                    <span className="ml-1.5 text-xs text-slate-400">
                      {fn.assessed}/{fn.total}
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Risk of open gaps</h2>
        <p className="mt-1 text-sm text-slate-500">
          Likelihood x impact, 1 to 25.
          {unscoredGaps > 0 && ` ${unscoredGaps} gap${unscoredGaps === 1 ? "" : "s"} not scored yet.`}
        </p>

        <div className="mt-4 flex flex-wrap items-start gap-x-10 gap-y-6">
          <HeatMap cells={heatMap} />

          <ul className="space-y-2">
            {bandCounts.map(({ band, count }) => {
              const meta = RISK_BANDS.find((candidate) => candidate.name === band)!;
              return (
                <li key={band} className="flex items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${meta.cellClassName}`} />
                  <span className="w-16 text-sm text-slate-600">{band}</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{count}</span>
                  <span className="text-xs text-slate-400">
                    {meta.min}&ndash;{meta.max}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Open gaps</h2>
          <Link href="/assess" className="text-sm text-slate-500 underline hover:text-slate-900">
            Go to assessment
          </Link>
        </div>

        {gaps.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {assessed === 0
              ? "Nothing assessed yet."
              : "No gaps recorded — every assessed category is implemented or scoped out."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">What is missing</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gaps.map((gap) => (
                  <tr key={gap.categoryId} className="align-top">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {gap.categoryId}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-900">
                        {gap.categoryName}
                      </span>
                    </td>
                    <td className="max-w-md px-5 py-3 text-sm text-slate-600">
                      {gap.plainLanguage}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {statusMeta(gap.status).label}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {gap.owner ?? <span className="text-slate-400">Unassigned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
