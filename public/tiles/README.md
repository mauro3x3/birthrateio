# Generated PMTiles live here (gitignored).

# Build India population dots:
#   npm run build:india-population-pmtiles
#
# Build Europe GHSL population-change (green/pink):
#   1. Download + unzip GHS-POP 2000/2025 30ss WGS84 into data/ghsl/
#      (see scripts/build-europe-popchange-pmtiles.py for URLs)
#   2. npm run build:europe-popchange-pmtiles
#      (node extract → tippecanoe → public/tiles/europe-popchange.pmtiles)
#
# For production, host the .pmtiles on object storage (R2/S3) with CORS +
# range requests, then set NEXT_PUBLIC_INDIA_POP_PMTILES_URL or
# NEXT_PUBLIC_EU_POPCHANGE_PMTILES_URL.
