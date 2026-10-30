#!/usr/bin/env bash
# Fetch a list of Google Maps queries for one city, one at a time, retrying each twice.
#
# `coffeemap gmaps-fetch` walks the whole config list and dies on the first navigation
# timeout, losing every query after it. This reads a query list from a file, keeps going,
# and reports each outcome so a partial run is a usable run.
#
#   bash scripts/fetch_gmaps_batch.sh tj /tmp/tj-remaining.txt
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/data/home/.local/bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$PWD/.browsers}"

city="${1:?city slug (tj|sd)}"
list="${2:?file with one query per line}"
ok=0
fail=0
while IFS= read -r q; do
  [ -z "$q" ] && continue
  for attempt in 1 2; do
    if uv run python scripts/fetch_gmaps_queries.py "$city" "$q" --max-scrolls 3 2>&1 | grep -q "card links"; then
      ok=$((ok + 1))
      echo "OK   [$q]"
      break
    fi
    echo "retry [$q] attempt $attempt"
    [ "$attempt" = 2 ] && { fail=$((fail + 1)); echo "FAIL [$q]"; }
    sleep 20
  done
  sleep 6
done < "$list"
echo "summary: $ok ok, $fail failed"
