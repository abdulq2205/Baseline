import { IMPACT_SCALE, LIKELIHOOD_SCALE, getBand } from "@/lib/risk";
import type { HeatMapCell } from "@/lib/dashboard";

/**
 * The 5x5 matrix, impact across, likelihood up.
 *
 * Likelihood runs bottom to top so the worst corner is top-right, which is the
 * convention people expect from a risk matrix. Cells with nothing in them stay
 * blank rather than showing a zero: 25 zeros would be 25 things to read past
 * before finding the two that matter.
 */
export function HeatMap({ cells }: { cells: HeatMapCell[] }) {
  const at = (likelihood: number, impact: number) =>
    cells.find((cell) => cell.likelihood === likelihood && cell.impact === impact)?.count ?? 0;

  const rows = [...LIKELIHOOD_SCALE].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-sm">
        <caption className="sr-only">
          Open gaps by likelihood and impact. Impact across, likelihood up.
        </caption>
        <thead>
          <tr>
            <th className="w-32" />
            {IMPACT_SCALE.map((impact) => (
              <th
                key={impact.value}
                scope="col"
                className="w-16 pb-1 text-center text-xs font-medium text-slate-500"
              >
                {impact.value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((likelihood) => (
            <tr key={likelihood.value}>
              <th
                scope="row"
                className="pr-2 text-right text-xs font-normal text-slate-500"
              >
                <span className="font-medium text-slate-600">{likelihood.value}</span>{" "}
                {likelihood.label}
              </th>
              {IMPACT_SCALE.map((impact) => {
                const count = at(likelihood.value, impact.value);
                const band = getBand(likelihood.value * impact.value);
                return (
                  <td
                    key={impact.value}
                    title={`${likelihood.label} x ${impact.label} = ${likelihood.value * impact.value} (${band.name})`}
                    className={`h-10 rounded text-center align-middle tabular-nums ${
                      count > 0
                        ? `${band.cellClassName} font-semibold`
                        : "bg-slate-50 text-transparent"
                    }`}
                  >
                    {count > 0 ? count : ""}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            <td colSpan={IMPACT_SCALE.length} className="pt-1 text-center text-xs text-slate-500">
              Impact
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
