# birthrate.io

**The world's demographic data platform** — a Statista-style product focused on
fertility, population, migration and economic trends for every country on Earth.

Built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma,
Recharts and Leaflet. Data is ingested from the **World Bank**, **UN Population
Division**, **OECD** and **IMF** into Postgres, so the app **never** hits an
external API at request time.

---

## ✨ Features

| Area | What's included |
| --- | --- |
| **Homepage** | Animated global fertility map, latest fertility movers (largest declines/increases), population-growth & most-populous rankings, upcoming releases, global search (`⌘K`) |
| **Country pages** (`/country/japan`) | Population, fertility, GDP, GDP/capita, net migration & life expectancy time series; population pyramid; projections to 2100; key stats; CSV + PNG download on every chart; dynamic SEO + JSON-LD |
| **Compare** (`/compare`) | Overlay up to 8 countries on any metric, shareable URL, ranking table |
| **Fertility** (`/fertility`) | Diverging fertility map (replacement = 2.1) with time slider/animation, rankings with region filters, biggest movers |
| **Population** (`/population`) | Growth map, rankings, population-growth calculator |
| **Migration** (`/migration`) | Net-migration map, top immigration/emigration, rankings |
| **GDP** (`/gdp`) | GDP per-capita map, GDP / per-capita / growth rankings |
| **Cities** (`/cities`, `/city/tokyo`) | 50 major metros with population + country context + location map |
| **Simulator** (`/simulator`) | Interactive cohort-component projection: starting population, TFR presets (1.0/1.5/2.1/3.0/5.0) + custom, mortality (life expectancy), migration, horizon → population curve + animated age pyramid + median age / dependency ratio |
| **Calendar** (`/calendar`) | Upcoming data releases grouped by month |
| **SEO** | Dynamic metadata, Open Graph image, JSON-LD structured data, dynamic `sitemap.xml`, `robots.txt`, country-specific URLs |
| **UX** | Dark mode, fully responsive, accessible shadcn/ui components |

---

## 🏗️ Project structure

```
birthrateio/
├── prisma/
│   ├── schema.prisma          # Full database schema (see "Database design")
│   └── seed.ts                # Seeds data sources + indicator catalogue
├── scripts/
│   └── ingest.ts              # CLI: fetch World Bank data → Postgres → derived data
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout, theme provider, header/footer
│   │   ├── page.tsx           # Homepage dashboard
│   │   ├── country/[slug]/    # Country pages
│   │   ├── city/[slug]/       # City pages
│   │   ├── fertility|population|migration|gdp/  # Explorers
│   │   ├── compare/           # Compare tool
│   │   ├── simulator/         # Demographic simulator
│   │   ├── calendar/          # Release calendar
│   │   ├── cities/            # Cities database
│   │   ├── api/
│   │   │   ├── search/        # Global search endpoint
│   │   │   ├── compare/       # Compare series endpoint
│   │   │   └── cron/ingest/   # Scheduled ingestion (Vercel cron)
│   │   ├── sitemap.ts, robots.ts, opengraph-image.tsx, not-found.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── charts/            # Recharts: time-series, multi-series, pyramid, ChartCard (CSV/PNG)
│   │   ├── maps/              # Leaflet choropleth + point maps, MapCard (time slider)
│   │   └── ...                # header, footer, search, tables, simulator, etc.
│   └── lib/
│       ├── prisma.ts          # Prisma singleton
│       ├── queries.ts         # All DB reads (cached with unstable_cache)
│       ├── demography.ts      # Cohort-component projection engine
│       ├── indicators.ts      # Indicator catalogue (drives ingestion + UI)
│       ├── color-scale.ts     # Choropleth colour scales
│       └── sources/           # World Bank adapter, reference data, derived data, cities
└── vercel.json                # Weekly ingestion cron
```

---

## 🗄️ Database design

A **generic fact table** (`IndicatorValue`) stores every time series (fertility,
population, GDP, migration, …) so new indicators need **zero schema changes** —
just add a row to `src/lib/indicators.ts`. Specialised tables exist only where
the shape differs:

- `Country`, `Region`, `City` — geography (ISO codes are the join keys)
- `Indicator` + `IndicatorValue` — generic, indexed for both country time series and cross-country rankings/maps; scales to tens of millions of rows
- `PopulationProjection` — population by year × scenario (low/medium/high)
- `PopulationByAge` — age/sex structure for pyramids
- `MigrationFlow` — origin→destination corridors
- `GroupComposition` — **future-proofing** for ethnic/religious/language composition & group fertility (no migration needed later)
- `DataRelease` — release calendar
- `DataSource`, `IngestionRun` — provenance & observability

`IndicatorValue` also has optional `dimension`/`dimensionValue` columns, so future
breakdowns (sex, age band, urban/rural, ethnicity, religion, education) plug in
without new tables.

---

## 🚀 Getting started (local)

### 1. Prerequisites
- Node.js 20+ and npm
- **No database server required for local dev** — it uses SQLite (a file at
  `prisma/dev.db`) out of the box. PostgreSQL is only needed for production
  (see "Deploy to Vercel").

### 2. Install & configure
```bash
npm install
cp .env.example .env       # default DATABASE_URL="file:./dev.db" works as-is
```

### 3. Create the schema
```bash
npm run db:push            # creates prisma/dev.db with all tables
```

### 4. Load data
```bash
npm run db:seed            # data sources + indicator catalogue
npm run ingest             # fetch World Bank data, then build pyramids/projections/cities/releases
```
`npm run ingest` fetches ~12 indicators for ~265 countries/aggregates from
1960→present (a few minutes) and is **idempotent** — re-run any time.

### 5. Run
```bash
npm run dev                # http://localhost:3000
```

### Useful scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:push` / `db:migrate` / `db:studio` | Prisma schema sync / migrations / GUI |
| `npm run db:seed` | Seed reference data |
| `npm run ingest` | Full ingestion (World Bank + derived) |
| `npm run ingest -- --derived` | Regenerate only pyramids/projections/releases |
| `npm run typecheck` / `lint` | TypeScript / ESLint |

---

## ☁️ Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel.
2. **Switch the datasource to Postgres** in `prisma/schema.prisma` (change
   `provider = "sqlite"` → `"postgresql"` and re-add `directUrl = env("DIRECT_URL")`;
   the commented block in the schema shows the exact snippet). Then add a Postgres
   database (Vercel Postgres, Neon or Supabase) and set env vars:
   - `DATABASE_URL`, `DIRECT_URL` (for migrations)
   - `NEXT_PUBLIC_SITE_URL` = your production URL
   - `CRON_SECRET` = a random string (protects the ingestion endpoint)
3. Vercel runs `npm run build` (which runs `prisma generate`).
4. **Initialise the database once** from your machine, pointed at the prod DB:
   ```bash
   DATABASE_URL=... npm run db:push
   DATABASE_URL=... npm run db:seed
   DATABASE_URL=... npm run ingest
   ```
5. Scheduled refresh: `vercel.json` registers a weekly cron hitting
   `/api/cron/ingest` (Mondays 04:00 UTC). A full ingest is long-running — on
   Vercel this needs a plan that allows extended function duration. For free
   tiers, run ingestion from a **GitHub Action** instead (cron → `npm run ingest`
   with `DATABASE_URL` secret), which then revalidates the site automatically on
   next request.

---

## 📊 Data sources & provenance

- **World Bank Open Data** — primary source (no API key). Fertility, birth rate,
  population, growth, life expectancy, age shares, urbanisation, net migration,
  GDP, GDP/capita, GDP growth.
- **UN / OECD / IMF** — modelled in the schema and release calendar; adapters are
  stubbed in `src/lib/sources/` for incremental addition.
- **Modelled data** — population pyramids and projections are produced by the
  cohort-component engine (`src/lib/demography.ts`) from real World Bank
  population, fertility and life-expectancy inputs, and are stored under the
  `MODEL` data source. They are clearly labelled **"modeled"** in the UI and are
  estimates, not official forecasts. Swapping in official **UN WPP** pyramids &
  projections later requires no schema change.

---

## 🧭 Step-by-step implementation plan (MVP → scale)

**Phase 0 — Foundation (done)**
1. Next.js 15 + TS + Tailwind + shadcn/ui scaffold, dark mode, responsive shell.
2. Prisma schema + generic indicator fact table designed for scale & expansion.
3. World Bank ingestion → Postgres; idempotent CLI; derived pyramids/projections.
4. Data-access layer with caching; resilient empty states.

**Phase 1 — Core product (done)**
5. Homepage dashboard, country pages, four explorers, compare, cities, simulator, calendar.
6. Recharts charts with CSV/PNG export; Leaflet choropleth with time slider.
7. SEO: metadata, OG image, JSON-LD, sitemap, robots.

**Phase 2 — Launch hardening (next)**
8. Add UN WPP official projections & pyramids adapter (replace modelled ones).
9. Add OECD/IMF adapters for richer economic series.
10. Per-country OG images; FAQ/About; analytics; error monitoring (Sentry).
11. GitHub Action for scheduled ingestion; Prisma migrations in CI.
12. Full-text search (Postgres `tsvector`) and `/region/[slug]` aggregate pages.

**Phase 3 — Advanced modules (schema already supports)**
13. Ethnic & religious composition + group-specific fertility (`GroupComposition`).
14. Origin-destination migration flow maps (`MigrationFlow`).
15. Election, housing, education datasets via new `Indicator` categories.
16. AI-generated demographic country reports.

---

## 📝 Notes
- The app reads **only** from Postgres; ingestion is the single point of external
  API contact. This keeps pages fast and resilient.
- All aggregate reads are cached (`unstable_cache`) and revalidated hourly, or on
  demand after ingestion via cache tags.
- Point maps (cities, city location) use **OpenFreeMap** dark tiles by default —
  no API key required. Optional `NEXT_PUBLIC_CARTO_API_KEY` switches them to CARTO.
  Choropleth maps use free GeoJSON coastlines only (no tile server).
