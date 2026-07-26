import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev and across serverless
// invocations to avoid exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neon (and most serverless Postgres) expose a *pooled* connection through
// PgBouncer. Prisma must run in "pgbouncer" mode against such endpoints or it
// throws `prepared statement "sN" already exists` under load. Normalise the URL
// so the deployed app works whether Vercel injected a pooled or direct string.
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  const isPooled = url.includes("-pooler.") || /[?&]pgbouncer=/.test(url);
  if (isPooled && !/[?&]pgbouncer=true/.test(url)) {
    return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  return url;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
