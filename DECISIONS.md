# Decisions

A running log, in the order the decisions were made. Each entry records what was
chosen, what it was chosen over, and what would change the answer.

---

## 0001 — Next.js (App Router) + SQLite + Prisma

**Phase:** 1

**Decision.** One Next.js App Router repo in TypeScript, backed by a single SQLite file
through Prisma.

**Why Next.js.** The tool is two screens that are almost entirely reads, with a handful
of writes. React Server Components let each screen query the database directly and
render on the server, and Server Actions cover the writes. That removes the whole API
layer — no REST routes, no client fetch state, no serialization contract to keep in
sync — and leaves one language and one deployable.

**Why SQLite.** The workload is one organization answering 22 questions. The entire
dataset is well under a hundred rows and is never concurrent: one person fills it in.
SQLite is a file, so there is no server to run and no connection string to manage, and
`npm install && npx prisma migrate dev && npm run seed` gives a reviewer a working
database from a clean clone.

**When SQLite stops being right.** It serializes writes at the database level, so it
stops being appropriate as soon as there are concurrent writers — which here means the
moment this goes multi-tenant. It also lives on one filesystem, so it does not survive
a horizontally scaled or serverless deployment where instances do not share a disk.
Postgres is the migration target; because Prisma owns the schema, that is a provider
change and a regenerated migration rather than a rewrite.

**Why Prisma.** The schema is the most interesting artifact in this project and has to
be readable by someone reviewing it. Prisma states the three models and their relations
in one page, generates the TypeScript types, and emits migrations as committed SQL that
can be read and diffed.

**Rejected.** A separate API service (a second deployable for two screens of CRUD).
Postgres (a server to stand up for a single-user tool). Raw SQL (no generated types,
and the seed is exactly the bulk insert where a typed client pays for itself).

---

## 0002 — Pinned Prisma, and the one dependency outside the stack list

**Phase:** 1

**Decision.** `prisma` and `@prisma/client` are pinned to exactly `7.10.0`, and
`@prisma/adapter-better-sqlite3` is installed even though it is not in the PRD's
Section 3.

**Why pinned.** Installing `prisma` at the default `latest` tag resolved to an
`8.0.0-rc`, while `@prisma/client` resolved to `7.10.0`. Mismatched majors between the
CLI and the runtime client is broken on its own, and the RC tree carried several
high-severity advisories. Pinning both to the stable 7.10 line cleared them;
`npm audit` reports zero vulnerabilities.

**Why the adapter is not really an extra.** Prisma 7 removed the bundled query engines
and made driver adapters mandatory — `new PrismaClient({ datasourceUrl })` no longer
type-checks. The adapter is the connector for the database the PRD already chose, not
a new capability. The alternative was pinning to Prisma 6 to avoid a package Prisma
itself now requires.

**Explicitly not installed.** No chart library — the six coverage bars are styled divs,
as the PRD requires. No date library. No UI kit, no state manager, no auth.

---

## 0003 — Assessment happens at the category level, not the subcategory level

**Phase:** 1

**Decision.** The assessable unit is the CSF 2.0 **category** — 22 rows. The 106
subcategories beneath them are not modelled at all.

**Why.** 106 questions is more than a small organization with no security staff will
finish, and an assessment nobody finishes produces no coverage number. The 22
categories still span the entire framework: every function and every part of it is
represented, at lower resolution. Finishing a coarse assessment beats abandoning a
fine one.

**What it costs.** Coverage is blunter. A category marked PARTIAL does not say which of
its subcategories are missing, so the tool can tell you access control is incomplete
but not that it is specifically MFA. Anyone needing that detail needs the subcategory
level, which is a bigger schema and a much longer sitting.

**What it would take to change.** A `Subcategory` model between `Category` and
`Assessment`, the seed reading one level deeper (the source file already contains it),
and category coverage rolling up from its children instead of being answered directly.

---

## 0004 — One assessment row per category, and no separate Risk table

**Phase:** 1

**Decision.** `Assessment.categoryId` is `@unique`, and a gap is an assessment with
`priority` and `owner` set rather than a row in a `Risk` table.

**Why one row per category.** The assessment is point-in-time and autosaving. If it
appended, "the current answer" would become a sort-and-limit on every read, and
"categories assessed" would climb past 22 and stop meaning anything.

**Why no Risk table.** A risk here would always be one-to-one with the gap it came
from, and a table whose rows are always one-to-one with another table's rows is a join
that buys nothing. Putting `priority` and `owner` on the assessment keeps the whole
state of a category in one row.

**What both cost.** There is no history, so the tool cannot show improvement over time
or answer "what did we say in March"; `updatedAt` records only when the current answer
was last set. And a category can carry exactly one gap, so two genuinely distinct
problems under the same category share one priority and one owner. Both are acceptable
at one-organization scale and both are schema changes, not rewrites, if they stop being
acceptable.

---

## 0005 — Assessment state lives in one map, not in each row

**Phase:** 4

**Decision.** `AssessWorkspace` owns a `Record<categoryId, AnswerState>`; rows are
controlled and hold nothing but local UI state (whether the NIST description is open).

**Why.** The per-function progress counts ("3 of 4 assessed") need to read every
answer at once. With state inside each row that would need lifting or a subscription;
one map keyed by ID keeps it a plain read.

**Autosave details worth defending.** Status and priority clicks save immediately —
a click is deliberate and final. Notes and owner debounce at 800ms, keyed per category
so typing in one row never cancels another row's pending write. When a response
arrives it is applied only if the row still holds the exact draft that was sent;
otherwise a slow response from an earlier edit would overwrite a newer one. With no
submit button, the failure mode to design against is a silent lost write.

---

## 0006 — Not-applicable is checked in two places on purpose

**Phase:** 4

**Decision.** The justification requirement lives in `validateAssessment` (the Server
Action's input parser) and again in the client before a request is sent.

**Why both.** The client check exists so the user gets the message next to the field
that fixes it instead of watching a request fail. The server check exists because the
client is not a control — it is code the user's browser runs and can skip. Removing
the server check would make the requirement cosmetic; removing the client check would
only make it ruder.

---

## 0007 — Leaving gap status clears priority and owner

**Phase:** 4

**Decision.** When a status changes to anything that is not `NOT_IMPLEMENTED` or
`PARTIAL`, `validateAssessment` sets `priority` and `owner` to null rather than
passing through whatever the client sent.

**Why.** Otherwise fixing a category — moving it from PARTIAL to IMPLEMENTED — leaves
an orphaned "HIGH, owned by Sam" attached to a row that is no longer a gap. Since the
dashboard's open-gaps table is driven by these fields, that stale data would keep
showing up as outstanding work that has actually been done.

**Why in the validator and not just the UI.** The UI clears them too, so the screen
matches what was stored, but the validator is the thing that guarantees it. A write
that arrives from anywhere else still cannot create the inconsistent state.
