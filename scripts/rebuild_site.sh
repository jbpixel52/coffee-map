#!/usr/bin/env bash
# Export every city, merge them into the one file the map ships, then build and smoke it.
#
# This is the step after any data change (a scrape, a hand-added shop, a fix to merge
# rules): the per-city exports are stale until they are re-run, and the merged geojson is
# stale until merge_cities.py has seen them.
#
# Usage: bash scripts/rebuild_site.sh [--no-smoke]
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/data/home/.local/bin:$PATH"
unset COFFEEMAP_CITY COFFEEMAP_DB COFFEEMAP_ARCHIVE COFFEEMAP_OUT

for slug in tj sd la cdmx-n cdmx-s gdl ens nyc-n nyc-s aus sea sfo oak; do
  case "$slug" in
    tj) cfg=config/city.toml; db=data/coffeemap.db; archive=data/archive ;;
    sd) cfg=config/city.san-diego.toml; db=data/coffeemap-sd.db; archive=data/archive-sd ;;
    *)  cfg="config/city.$slug.toml"; db="data/coffeemap-$slug.db"; archive="data/archive-$slug" ;;
  esac
  COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$archive" \
    COFFEEMAP_OUT="data/export/$slug" uv run coffeemap export >/dev/null || echo "FAILED export $slug"
done

uv run python scripts/merge_cities.py || exit 1

cd web-astro
npx vitest run 2>&1 | tail -3
npm run build 2>&1 | tail -1
cd ..

# Smoke against a preview of the build, not the live site: the point is to catch a broken
# build before it ships.
port=${SMOKE_PORT:-4391}
(cd web-astro && npx astro preview --port "$port" >/tmp/preview-$port.log 2>&1 &)
sleep 9
if [ "${1:-}" != "--no-smoke" ]; then
  uv run python web-astro/tests/smoke.py "http://localhost:$port/coffee-map/" | tail -1
fi
ps -eo pid,args | grep "[a]stro preview --port $port" | awk '{print $1}' | while read -r pid; do
  kill "$pid" 2>/dev/null
done
