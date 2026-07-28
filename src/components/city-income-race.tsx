import { formatNumber } from "@/lib/utils";

export type ZipRow = {
  zip: string;
  population: number | null;
  medianHouseholdIncome: number | null;
  year: number;
  sourceNote: string | null;
  sourceUrl: string | null;
};

export function CityZipIncomeTable({
  cityName,
  rows,
}: {
  cityName: string;
  rows: ZipRow[];
}) {
  if (rows.length === 0) return null;
  const year = rows[0]?.year;
  const source = rows[0]?.sourceNote;
  const sourceUrl = rows[0]?.sourceUrl;
  const withIncome = rows.filter((r) => r.medianHouseholdIncome != null);
  const sorted = [...withIncome].sort(
    (a, b) => (b.medianHouseholdIncome ?? 0) - (a.medianHouseholdIncome ?? 0),
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Median household income by ZIP code
        </h2>
        <p className="text-sm text-muted-foreground">
          {cityName}
          {year ? ` · ACS ${year}` : ""} · {sorted.length} ZCTAs shown (sorted
          high → low)
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">ZIP</th>
              <th className="px-3 py-2 font-medium text-right">Median income</th>
              <th className="px-3 py-2 font-medium text-right">Population</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.zip}
                className="border-b last:border-0 even:bg-muted/20"
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">{r.zip}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.medianHouseholdIncome != null
                    ? `$${formatNumber(r.medianHouseholdIncome, 0)}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {r.population != null ? formatNumber(r.population, 0) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {source && (
        <p className="text-xs text-muted-foreground">
          Source:{" "}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {source}
            </a>
          ) : (
            source
          )}
          . ZIP Code Tabulation Areas (ZCTAs) approximate USPS ZIP codes;
          park-only ZIPs may be omitted.
        </p>
      )}
    </section>
  );
}

export type BoroughRaceRow = {
  name: string;
  population: number | null;
  groups: Record<string, number>;
  medianHouseholdIncome?: number | null;
};

export function BoroughRaceTable({
  rows,
  groupOrder,
  year,
  sourceNote,
  sourceUrl,
}: {
  rows: BoroughRaceRow[];
  groupOrder: string[];
  year: number;
  sourceNote?: string | null;
  sourceUrl?: string | null;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Race / ethnicity by borough
        </h2>
        <p className="text-sm text-muted-foreground">
          {year} · shares sum to ~100% within each borough
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Borough</th>
              <th className="px-3 py-2 font-medium text-right">Population</th>
              {groupOrder.map((g) => (
                <th key={g} className="px-3 py-2 font-medium text-right">
                  {g.replace(" (non-Hispanic)", "")}
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-right">Med. income</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.name}
                className="border-b last:border-0 even:bg-muted/20"
              >
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.population != null ? formatNumber(r.population, 0) : "—"}
                </td>
                {groupOrder.map((g) => (
                  <td
                    key={g}
                    className="px-3 py-2 text-right tabular-nums text-muted-foreground"
                  >
                    {r.groups[g] != null ? `${r.groups[g].toFixed(1)}%` : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.medianHouseholdIncome != null
                    ? `$${formatNumber(r.medianHouseholdIncome, 0)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sourceNote && (
        <p className="text-xs text-muted-foreground">
          Source:{" "}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {sourceNote}
            </a>
          ) : (
            sourceNote
          )}
          .
        </p>
      )}
    </section>
  );
}
