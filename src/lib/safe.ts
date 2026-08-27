import { unstable_noStore as noStore } from "next/cache";

// Wrap a data-access promise so pages still render (with empty state) when the
// database is unreachable or not yet seeded — e.g. immediately after deploy,
// before the first ingestion run.
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    console.error("[data] query failed:", err);
    // ISR would otherwise cache the empty fallback as a successful page and
    // keep serving "No data" after the database comes back.
    try {
      noStore();
    } catch {
      // noStore is a no-op outside a Next.js request (scripts, tests).
    }
    return fallback;
  }
}
