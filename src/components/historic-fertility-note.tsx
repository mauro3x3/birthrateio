import Link from "next/link";

export const HISTORIC_FERTILITY_SOURCE =
  "HFD / UN WPP / Gapminder (pre-1960) · World Bank (from 1960)";

/** Shared caveat under long-run TFR charts. */
export function HistoricFertilityNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs leading-relaxed text-muted-foreground"}>
      Pre-1960 fertility blends three sources, best available first: the{" "}
      <Link
        href="https://www.humanfertility.org"
        className="underline underline-offset-2"
        target="_blank"
        rel="noreferrer"
      >
        Human Fertility Database
      </Link>{" "}
      (official birth-registration reconstructions, coverage starting anywhere
      from 1891 to 1950 depending on the country), UN World Population Prospects
      for 1950–1959, and{" "}
      <Link
        href="https://www.gapminder.org/data/documentation/gd008/"
        className="underline underline-offset-2"
        target="_blank"
        rel="noreferrer"
      >
        Gapminder
      </Link>
      &apos;s historic estimate for earlier gaps. For many countries the
      nineteenth-century figures are reconstructions, not vital registration —
      they can look flatter than they really were. It is a period rate, a
      snapshot of that year&apos;s age-specific birth rates, not the number of
      children women born in a given year went on to have. From 1960,
      birthrate.io switches to World Bank WDI.
    </p>
  );
}
