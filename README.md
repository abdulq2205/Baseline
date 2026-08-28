# Baseline

It loads the NIST cybersecurity framework, lets you mark where you stand on each item,
and shows what's missing and who owns fixing it.

## The problem

Small organizations that handle sensitive data get asked to show that their security is
adequate — by a partner, a funder, or a customer. Most can't answer: they have some good
practices but nothing mapping them to a recognized standard and nothing showing what's
missing. Baseline walks a small organization through NIST CSF 2.0, records where they
actually stand on each of its 22 categories, and shows what's missing and who's fixing it.

## Screenshots

**Dashboard** — coverage, coverage by function, and every open gap with its priority and
owner. The formula sits behind the info icon next to the number.

![Dashboard](docs/dashboard.png)

**Assessment** — 22 categories grouped under collapsible functions. The plain-English
explanation leads; NIST's own wording is one click away. Autosaves.

![Assessment](docs/assessment.png)

## What this is not

**Not a commercial GRC platform.** [Vanta](https://www.vanta.com),
[Drata](https://drata.com), and [Secureframe](https://secureframe.com) do this and much
more — evidence collection, continuous control monitoring, auditor workflows, dozens of
frameworks. Open-source options like CISO Assistant and Eramba are also far more capable.
Baseline is a deliberately simplified, single-organization tool.

**Not continuous monitoring.** Nothing is scanned, polled, or integrated. Every status in
here was typed by a person, and it is only as current as the day they typed it.

**Not multi-tenant.** One organization per deployment. There is no authentication, no
user accounts, and no authorization — anyone who can reach the app can change any answer.
It is built to run locally or behind something that already handles access.

**Not a substitute for a real audit.** A self-assessment is a self-assessment. Nobody
independent checked these answers, and marking a box "implemented" is a claim, not
evidence.

**It assesses at the category level — 22 items, not the full 106 subcategories.** This is
the biggest scoping decision in the project and it is a real trade-off. NIST CSF 2.0 has
106 subcategories beneath these 22 categories. Assessing all 106 is more granular than a
small organization with no security staff will actually finish, and an assessment nobody
finishes produces no number at all. The 22 categories still span the whole framework —
every function and every part of it is represented, at lower resolution. What it costs is
precision: a category marked PARTIAL tells you access control is incomplete, but not that
multi-factor authentication specifically is the missing piece. Anyone who needs that
detail needs the subcategory level, and that is a bigger schema and a much longer sitting.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Next.js (App Router), TypeScript | Framework | Two screens, almost all reads. Server Components query the database directly and Server Actions cover the writes, which removes the entire API layer — no REST routes, no client fetch state. |
| SQLite | Database | The whole dataset is under a hundred rows and is never concurrent. It is a file: no server to run, and a reviewer gets a working database from a clean clone. |
| Prisma | ORM | The schema is the most interesting artifact here and needs to be readable. Three models on one page, generated types, and migrations committed as SQL you can diff. |
| Tailwind | Styling | No design system to learn. |
| Vitest | Tests | Fast, and the logic worth testing is pure functions. |

**No chart library.** The six coverage bars are styled `div`s with `role="progressbar"`.
Six horizontal bars do not justify a dependency, and this way they are accessible.

**When SQLite stops being right:** it serializes writes at the database level, so it fails
the moment there are concurrent writers — which here means the moment this goes
multi-tenant. It also lives on one filesystem, so it does not survive a horizontally scaled
or serverless deployment where instances do not share a disk. Postgres is the migration
target, and because Prisma owns the schema that is a provider change, not a rewrite.

Full reasoning for every decision, including the ones that were rejected, is in
[DECISIONS.md](./DECISIONS.md).

## Running it locally

```bash
npm install
npx prisma migrate dev    # creates prisma/dev.db and applies the schema
npm run seed              # loads the 22 categories from data/csf-2.0.json
npm run dev               # http://localhost:3000
```

Other commands:

```bash
npm run verify            # checks the seeded catalog against the NIST source file
npm test                  # 42 tests over the coverage math and input validation
npm run test:coverage
```

`npm run verify` is worth running once. It re-reads `data/csf-2.0.json` independently of
the seed and compares it to the database — counts, NIST's function ordering, identifier
formats, and all 22 descriptions compared verbatim — so "the catalog is really NIST's" is
a checkable claim rather than an assurance.

## Data source and attribution

Framework content is the **NIST Cybersecurity Framework 2.0**
([NIST.CSWP.29](https://doi.org/10.6028/NIST.CSWP.29), published 26 February 2024),
retrieved from NIST's [Cybersecurity and Privacy Reference
Tool](https://csrc.nist.gov/projects/cprt). It is a US Government work and in the public
domain.

The response is committed verbatim to `data/csf-2.0.json` and re-downloadable with
`./scripts/fetch-catalog.sh`. NIST's category descriptions are stored exactly as
published and are never paraphrased.

The plain-English explanations in `prisma/seed-plain-language.ts` are **not** NIST's
words. They were written for this project, and any clumsiness in them is mine, not NIST's.

NIST does not endorse this tool, and "NIST" and "NIST Cybersecurity Framework" are used
here only to identify the source of the framework content.
