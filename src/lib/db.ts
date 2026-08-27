import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/** Where the SQLite file lives. Overridable, but defaulted so a clean clone runs. */
export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

// Next.js dev mode hot-reloads modules on every edit. Without caching the client
// on globalThis, each reload constructs a new PrismaClient and opens another
// SQLite connection, and the process eventually runs out of them. In production
// the module is evaluated once, so the cache is skipped.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
