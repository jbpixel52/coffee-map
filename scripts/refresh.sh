#!/usr/bin/env bash
# Refresh the coffee map end-to-end, then commit the data. Run from the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
uv run coffeemap osm-fetch
uv run coffeemap osm-parse
uv run coffeemap gmaps-fetch --max-scrolls 8
uv run coffeemap gmaps-parse
uv run coffeemap web-search --limit 12
uv run coffeemap web-scrape --per-query 5
uv run coffeemap web-candidates
uv run coffeemap classify-validate
uv run coffeemap classify-candidates --kinds place,name
uv run coffeemap classify-places
uv run coffeemap candidates-apply
uv run coffeemap ig-recon --limit 60 || echo "ig-recon: partial — see output above"
uv run coffeemap ig-enrich
uv run coffeemap classify-candidates --kinds ig
uv run coffeemap ig-attach
uv run coffeemap merge
uv run coffeemap export
uv run coffeemap status
echo "Next: git add web/public/data && git commit -m 'data: refresh' && git push"
