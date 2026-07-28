import { formatCompact, formatNumber } from "@/lib/utils";

export type SubdivisionRow = {
  slug: string;
  name: string;
  kind: string;
  population: number | null;
  year: number | null;
  areaKm2: number | null;
  sourceNote: string | null;
  sourceUrl: string | null;
};

const KIND_LABEL: Record<string, string> = {
  ward: "Wards",
  borough: "Boroughs",
  district: "Districts",
  arrondissement: "Arrondissements",
  municipality: "Municipalities",
};

export function CitySubdivisionsTable({
  cityName,
  rows,
}: {
  cityName: string;
  rows: SubdivisionRow[];
}) {
  if (rows.length === 0) return null;
  const kind = rows[0]?.kind ?? "district";
  const title = KIND_LABEL[kind] ?? "Neighborhoods";
  const source = rows[0]?.sourceNote;
  const sourceUrl = rows[0]?.sourceUrl;
  const total = rows.reduce((s, r) => s + (r.population ?? 0), 0);
  const year = rows[0]?.year;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {title} of {cityName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {kind}
            {rows.length === 1 ? "" : "s"}
            {year ? ` · census / register ${year}` : ""}
            {total > 0 ? ` · sum ${formatCompact(total)}` : ""}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium text-right">Population</th>
              <th className="px-3 py-2 font-medium text-right">Share</th>
              <th className="hidden px-3 py-2 font-medium text-right sm:table-cell">
                Area
              </th>
              <th className="hidden px-3 py-2 font-medium text-right md:table-cell">
                Density
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const share =
                r.population != null && total > 0
                  ? (r.population / total) * 100
                  : null;
              const density =
                r.population != null && r.areaKm2 && r.areaKm2 > 0
                  ? r.population / r.areaKm2
                  : null;
              return (
                <tr
                  key={r.slug}
                  className="border-b last:border-0 even:bg-muted/20"
                >
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.population != null
                      ? formatNumber(r.population, 0)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {share != null ? `${share.toFixed(1)}%` : "—"}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {r.areaKm2 != null ? `${formatNumber(r.areaKm2, 1)} km²` : "—"}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground md:table-cell">
                    {density != null
                      ? `${formatNumber(Math.round(density), 0)}/km²`
                      : "—"}
                  </td>
                </tr>
              );
            })}
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
          . Administrative units may not sum to the UN urban-agglomeration total
          above (different geographic definitions).
        </p>
      )}
    </section>
  );
}
