import Link from "next/link";

// Placeholder. The dashboard — coverage, per-function bars, open gaps — is
// Phase 5. This exists so the shell has a landing page.
export default function DashboardPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-600">Not built yet.</p>
      <Link
        href="/assess"
        className="inline-block rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
      >
        Go to the assessment
      </Link>
    </div>
  );
}
