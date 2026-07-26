// Wrap a data-access promise so pages still render (with empty state) when the
// database is unreachable or not yet seeded — e.g. immediately after deploy,
// before the first ingestion run.
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[data] query failed:", err);
    }
    return fallback;
  }
}
