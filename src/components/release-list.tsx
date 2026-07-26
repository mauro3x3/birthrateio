import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ReleaseItem {
  id: number;
  title: string;
  dataset: string;
  region: string | null;
  category: string;
  releaseDate: Date;
  sourceName: string | null;
  url: string | null;
  source?: { name: string } | null;
}

const categoryColor: Record<string, string> = {
  FERTILITY: "bg-rose-500/15 text-rose-600",
  POPULATION: "bg-blue-500/15 text-blue-600",
  MIGRATION: "bg-violet-500/15 text-violet-600",
  ECONOMY: "bg-emerald-500/15 text-emerald-600",
};

export function ReleaseList({ items }: { items: ReleaseItem[] }) {
  return (
    <ul className="divide-y">
      {items.map((r) => {
        const date = new Date(r.releaseDate);
        return (
          <li key={r.id} className="flex items-start gap-3 py-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {date.toLocaleString("en-US", { month: "short" })}
              </span>
              <span className="text-sm font-bold leading-none">
                {date.getDate()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={r.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium leading-tight hover:text-primary"
              >
                {r.title}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{r.source?.name ?? r.sourceName}</span>
                {r.region && <span>· {r.region}</span>}
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    categoryColor[r.category] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.category.toLowerCase()}
                </span>
              </div>
            </div>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> No upcoming releases scheduled.
        </li>
      )}
    </ul>
  );
}
