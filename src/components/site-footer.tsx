import Link from "next/link";
import { mainNav, siteConfig } from "@/lib/site";

const dataLinks = [
  { title: "World Bank", href: "https://data.worldbank.org" },
  { title: "UN Population Division", href: "https://population.un.org/wpp/" },
  { title: "OECD", href: "https://data.oecd.org" },
  { title: "IMF", href: "https://www.imf.org/en/Data" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container grid gap-8 py-10 md:grid-cols-4">
        <div className="space-y-3">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-foreground"
          >
            birthrate.io
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {siteConfig.tagline}. Open demographic data for researchers,
            journalists, and the public.
          </p>
          <div className="flex gap-3 text-sm">
            <Link href="/support" className="text-primary hover:underline">
              Donate
            </Link>
            <Link href="/contribute" className="text-primary hover:underline">
              Contribute
            </Link>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explore
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {mainNav.slice(0, 5).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tools
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/simulator" className="hover:text-foreground">
                Demographic simulator
              </Link>
            </li>
            <li>
              <Link href="/compare" className="hover:text-foreground">
                Compare countries
              </Link>
            </li>
            <li>
              <Link href="/clock" className="hover:text-foreground">
                Fertility clock
              </Link>
            </li>
            <li>
              <Link href="/calendar" className="hover:text-foreground">
                Release calendar
              </Link>
            </li>
            <li>
              <Link href="/cities" className="hover:text-foreground">
                Cities database
              </Link>
            </li>
            <li>
              <Link href="/contribute" className="hover:text-foreground">
                Report new data
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Data sources
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {dataLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-5">
        <div className="container flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Data from World Bank,
            UN, OECD &amp; IMF.
          </p>
          <p>
            Projections labeled “modeled” are estimates, not official forecasts.
          </p>
        </div>
      </div>
    </footer>
  );
}
