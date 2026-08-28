import { AssessWorkspace } from "./assess-workspace";
import { loadCatalog } from "@/lib/catalog";

export const metadata = { title: "Assessment — Baseline" };

// Answers change constantly while this screen is open; nothing here is worth
// caching between requests.
export const dynamic = "force-dynamic";

export default async function AssessPage() {
  const functions = await loadCatalog();
  return <AssessWorkspace functions={functions} />;
}
