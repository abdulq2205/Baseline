/**
 * Seed the NIST CSF 2.0 catalog.
 *
 * Source: data/csf-2.0.json — the verbatim response from NIST's Cybersecurity
 * and Privacy Reference Tool (see scripts/fetch-catalog.sh). NIST's category
 * descriptions are inserted exactly as published; nothing here paraphrases
 * framework content.
 *
 * Two things are worth reading carefully:
 *
 * 1. Withdrawn elements. The CPRT response is not "CSF 2.0" — it is the CSF
 *    element graph, which still contains the CSF 1.1 categories that 2.0
 *    withdrew (ID.BE, PR.AC, DE.DP, and so on). NIST marks each one by nesting
 *    a `withdraw_reason` child rather than by setting a status field. Without
 *    that filter you get 34 categories instead of 22.
 *
 * 2. The counts are asserted, not assumed. If NIST reshapes the feed this fails
 *    loudly rather than quietly seeding a catalog that is wrong in a way nobody
 *    would notice until an assessment was half done.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { prisma } from "../src/lib/db";

/** What CSF 2.0 actually contains. The seed refuses to finish on anything else. */
const EXPECTED = { functions: 6, categories: 22 } as const;

/**
 * CPRT returns one recursive node type. A node's children are heterogeneous —
 * a category's children include subcategories and the withdrawal marker — so
 * the schema stays loose and the code filters on `elementTypeIdentifier`.
 *
 * `title` and `text` are optional because NIST omits them on withdrawn
 * elements. Everything this seed actually inserts is checked by `required()`.
 */
type CprtElement = {
  elementIdentifier: string;
  elementTypeIdentifier: string;
  title?: string;
  text?: string;
  elements?: CprtElement[];
};

const cprtElement: z.ZodType<CprtElement> = z.lazy(() =>
  z.object({
    elementIdentifier: z.string(),
    elementTypeIdentifier: z.string(),
    title: z.string().optional(),
    text: z.string().optional(),
    elements: z.array(cprtElement).optional(),
  }),
);

const cprtResponse = z.object({
  response: z.object({ elements: z.array(cprtElement) }),
});

const childrenOfType = (node: CprtElement, type: string) =>
  (node.elements ?? []).filter((child) => child.elementTypeIdentifier === type);

/** NIST marks a withdrawal with a nested child, not a property. */
const isWithdrawn = (node: CprtElement) =>
  childrenOfType(node, "withdraw_reason").length > 0;

/**
 * Read a field that must exist on anything being seeded. Withdrawn elements
 * legitimately lack `text` and are filtered out before reaching here, so a miss
 * at this point means the feed changed shape.
 */
function required(node: CprtElement, field: "title" | "text"): string {
  const value = node[field];
  if (!value) {
    throw new Error(
      `${node.elementTypeIdentifier} ${node.elementIdentifier} has no ${field}. ` +
        `The NIST source data has changed shape.`,
    );
  }
  return value;
}

async function main() {
  const path = join(__dirname, "..", "data", "csf-2.0.json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      "data/csf-2.0.json is missing. Run ./scripts/fetch-catalog.sh to download it.",
    );
  }

  const parsed = cprtResponse.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`data/csf-2.0.json does not match its expected shape:\n${parsed.error}`);
  }

  const functions = parsed.data.response.elements.filter(
    (element) => element.elementTypeIdentifier === "function",
  );

  let categoryCount = 0;

  // Upsert rather than delete-and-insert: assessments reference categories with
  // ON DELETE CASCADE, so wiping the catalog to re-seed it would silently take
  // a user's work with it.
  for (const [index, fn] of functions.entries()) {
    // NIST's display name is stored verbatim ("GOVERN"). Casing is a
    // presentation choice and belongs in the UI, not in the catalog.
    const name = required(fn, "title");
    await prisma.function.upsert({
      where: { id: fn.elementIdentifier },
      create: { id: fn.elementIdentifier, name, order: index },
      update: { name, order: index },
    });

    for (const category of childrenOfType(fn, "category")) {
      if (isWithdrawn(category)) continue;
      categoryCount += 1;

      const fields = {
        functionId: fn.elementIdentifier,
        name: required(category, "title"),
        statement: required(category, "text"),
      };
      await prisma.category.upsert({
        where: { id: category.elementIdentifier },
        create: { id: category.elementIdentifier, ...fields },
        // plainLanguage is deliberately not touched here. It is written in
        // Phase 3 and a re-seed must not blank it out.
        update: fields,
      });
    }
  }

  const actual = { functions: functions.length, categories: categoryCount };
  for (const key of ["functions", "categories"] as const) {
    if (actual[key] !== EXPECTED[key]) {
      throw new Error(
        `Seeded ${actual[key]} ${key}, expected ${EXPECTED[key]}. The NIST source ` +
          `data has changed — inspect data/csf-2.0.json before trusting this catalog.`,
      );
    }
  }

  console.log(`Seeded ${actual.functions} functions and ${actual.categories} categories.`);

  const missing = await prisma.category.count({ where: { plainLanguage: null } });
  if (missing > 0) {
    console.log(`${missing} categories have no plain-language explanation yet (Phase 3).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
