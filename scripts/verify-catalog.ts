/**
 * Verify that the seeded catalog is actually NIST CSF 2.0.
 *
 * The seed asserts its own counts, but that only proves the seed agreed with
 * itself. This re-reads data/csf-2.0.json independently, compares it against
 * what is in the database, and fails on any drift. It is what makes "all 22
 * categories load from official NIST data" a claim rather than a hope.
 *
 * Run: npm run verify
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/db";

const EXPECTED_FUNCTIONS = ["GV", "ID", "PR", "DE", "RS", "RC"] as const;
const EXPECTED_CATEGORIES = 22;
/** e.g. PR.AA — two-letter function, dot, two-letter category. */
const CATEGORY_ID = /^[A-Z]{2}\.[A-Z]{2}$/;

type Node = {
  elementIdentifier: string;
  elementTypeIdentifier: string;
  text?: string;
  elements?: Node[];
};

const failures: string[] = [];
const check = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

/** Category ID -> NIST description, read straight from the source file. */
function statementsFromSource(): Map<string, string> {
  const path = join(__dirname, "..", "data", "csf-2.0.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    response: { elements: Node[] };
  };
  const withdrawn = (node: Node) =>
    (node.elements ?? []).some((c) => c.elementTypeIdentifier === "withdraw_reason");

  const statements = new Map<string, string>();
  for (const fn of parsed.response.elements) {
    for (const category of fn.elements ?? []) {
      if (category.elementTypeIdentifier !== "category" || withdrawn(category)) continue;
      statements.set(category.elementIdentifier, category.text ?? "");
    }
  }
  return statements;
}

async function main() {
  const functions = await prisma.function.findMany({
    orderBy: { order: "asc" },
    include: { categories: true },
  });

  // --- Shape --------------------------------------------------------------
  check(
    functions.length === EXPECTED_FUNCTIONS.length,
    `Expected ${EXPECTED_FUNCTIONS.length} functions, found ${functions.length}`,
  );
  const order = functions.map((fn) => fn.id);
  check(
    order.join(",") === EXPECTED_FUNCTIONS.join(","),
    `Functions are out of NIST's published order: got ${order.join(", ")}`,
  );

  const categories = functions.flatMap((fn) => fn.categories);
  check(
    categories.length === EXPECTED_CATEGORIES,
    `Expected ${EXPECTED_CATEGORIES} categories, found ${categories.length}`,
  );

  // --- Identifiers are internally consistent ------------------------------
  for (const category of categories) {
    check(CATEGORY_ID.test(category.id), `Category ID ${category.id} is not in NIST's format`);
    check(
      category.id.startsWith(`${category.functionId}.`),
      `Category ${category.id} is filed under function ${category.functionId}`,
    );
  }

  // --- Descriptions match the source file verbatim -------------------------
  const source = statementsFromSource();
  check(
    source.size === EXPECTED_CATEGORIES,
    `data/csf-2.0.json yields ${source.size} live categories, expected ${EXPECTED_CATEGORIES}`,
  );
  for (const category of categories) {
    const expected = source.get(category.id);
    if (expected === undefined) {
      failures.push(`${category.id} is in the database but not in data/csf-2.0.json`);
    } else if (expected !== category.statement) {
      failures.push(`${category.id}: stored statement does not match NIST's text verbatim`);
    }
  }

  // --- Plain language is project work, reported separately -----------------
  const missing = categories.filter((c) => !c.plainLanguage?.trim()).map((c) => c.id);

  console.log(`Catalog: ${functions.length} functions, ${categories.length} categories.`);
  console.log(
    `Plain-language coverage: ${categories.length - missing.length}/${categories.length}.`,
  );
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} verification failure(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nCatalog matches the NIST source data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
