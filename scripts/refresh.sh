#!/usr/bin/env bash
# Refresh the coffee map end-to-end, then commit the data. Run from the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
uv run coffeemap osm-fetch
uv run coffeemap osm-parse
uv run coffeemap gmaps-fetch --max-scrolls 6
uv run coffeemap gmaps-parse
uv run coffeemap ig-recon --limit 60 || echo "ig-recon: partial — see output above"
uv run coffeemap merge
uv run coffeemap export
uv run coffeemap status
echo "Next: git add web/public/data && git commit -m 'data: refresh' && git push"
