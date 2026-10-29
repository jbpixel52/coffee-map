#!/usr/bin/env bash
# Offline Instagram discovery for every city: mine archived profile pages for handles
# co-mentioned by cafés, then attach the ones whose name matches a place.
#
# Neither step needs the local model: ig-discover reads archived HTML, ig-attach matches
# names. Handles the model already judged not_cafe stay skipped, so this cannot undo a
# classification — it only fills the gap the model host's absence leaves.
#
# Usage: bash scripts/discover_all_cities.sh
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/data/home/.local/bin:$PATH"

for slug in tj sd la-n la-s cdmx-n cdmx-s gdl ens nyc-n nyc-s aus sea sfo oak; do
  case "$slug" in
    tj) cfg=config/city.toml; db=data/coffeemap.db; archive=data/archive ;;
    sd) cfg=config/city.san-diego.toml; db=data/coffeemap-sd.db; archive=data/archive-sd ;;
    *)  cfg="config/city.$slug.toml"; db="data/coffeemap-$slug.db"; archive="data/archive-$slug" ;;
  esac
  echo "== $slug"
  run() { COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$archive" "$@"; }
  run uv run coffeemap ig-discover --limit 600 2>&1 | tail -1
  run uv run coffeemap ig-attach 2>&1 | tail -1
  run uv run python - <<'PY'
import os, sqlite3
c = sqlite3.connect(os.environ["COFFEEMAP_DB"])
n = c.execute("SELECT COUNT(*) FROM places WHERE instagram IS NOT NULL").fetchone()[0]
print(f"   places with Instagram: {n}")
PY
done
# ig-attach matches loosely and only ever adds links, so a category- or
# neighbourhood-word match would stay forever: re-check what it just did.
uv run python scripts/revalidate_attachments.py | tail -1
echo "discover-all done"
