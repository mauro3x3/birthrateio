# Map tiles (`*.pmtiles`)

## Europe population change (`europe-popchange.pmtiles`)

Shipped in-repo (~36 MB, zoom 2–9) so `/population/europe-change` works on
production without object storage. Rebuild:

```bash
# 1. Download + unzip GHS-POP 2000/2025 30ss WGS84 into data/ghsl/
#    (see scripts/build-europe-popchange-pmtiles.py for URLs)
# 2.
npm run build:europe-popchange-pmtiles
```

Optional override (CDN / R2 / S3 with CORS + HTTP range):

```bash
NEXT_PUBLIC_EU_POPCHANGE_PMTILES_URL=https://…/europe-popchange.pmtiles
```

## India population dots (`india-population.pmtiles`)

Gitignored (~160 MB). Build locally, host on object storage, then set:

```bash
npm run build:india-population-pmtiles
NEXT_PUBLIC_INDIA_POP_PMTILES_URL=https://…/india-population.pmtiles
```

The browser streams archives via the `pmtiles://` protocol (range requests).
