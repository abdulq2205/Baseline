import "dotenv/config";
import { defineConfig } from "prisma/config";

// The database is a single SQLite file committed nowhere and created by
// `prisma migrate dev`. Defaulting the URL here (rather than requiring a .env)
// is deliberate: the PRD's definition of done says a clean clone must run with
// no manual setup step. DATABASE_URL still overrides it when set.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./prisma/dev.db",
  },
});
