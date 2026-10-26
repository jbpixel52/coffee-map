#!/usr/bin/env bash
# OSM-only chain per city (fetch -> parse -> merge -> export). Google Maps and the
# IG/classifier steps need the browser/model host; this runs without either.
# Usage: bash scripts/fetch_osm_cities.sh la cdmx gdl ens nyc aus sea sfo oak
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/data/home/.local/bin:$PATH"

for slug in "$@"; do
  case "$slug" in
    tj) cfg=config/city.toml; db=data/coffeemap.db; archive=data/archive ;;
    sd) cfg=config/city.san-diego.toml; db=data/coffeemap-sd.db; archive=data/archive-sd ;;
    *)  cfg="config/city.$slug.toml"; db="data/coffeemap-$slug.db"; archive="data/archive-$slug" ;;
  esac
  echo "== $slug ($cfg)"
  run() { COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$archive" "$@"; }

  # Overpass answers 504 under load; the fetch is the only step worth retrying.
  ok=0
  for attempt in 1 2 3; do
    if run uv run coffeemap osm-fetch; then ok=1; break; fi
    echo "  fetch attempt $attempt failed; retrying in 60s"
    sleep 60
  done
  if [ "$ok" = 1 ] && run uv run coffeemap osm-parse && run uv run coffeemap merge; then
    COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$archive" \
      COFFEEMAP_OUT="data/export/$slug" uv run coffeemap export || echo "FAILED $slug export"
  else
    echo "FAILED $slug"
  fi
  sleep 15
done
