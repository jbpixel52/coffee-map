#!/usr/bin/env bash
# Keep enriching Instagram profiles for every city, forever.
#
# Each pass walks the city DBs, asks ig-recon for the handles it has not fetched
# yet (--limit keeps one city bounded when Instagram is slow), then re-exports and
# re-merges so web-astro/public/data reflects whatever landed. Between passes it
# sleeps; a pass that adds nothing doubles the pause up to a ceiling, and any
# pass that adds profiles resets it. Nothing here needs the local model host —
# followers, display name and the latest post come from the public profile page.
#
#   bash scripts/recon_loop.sh            # run in the foreground
#   (started by Hermes as a persisted background process in normal use)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/data/home/.local/bin:$PATH"

LOG="data/logs/recon.log"
mkdir -p data/logs
say() { printf '%s %s\n' "$(date -Is)" "$*" | tee -a "$LOG"; }

# slug:config:db:archive — the same mapping fetch_osm_cities.sh uses.
CITIES=(
  "tj:config/city.toml:data/coffeemap.db:data/archive"
  "sd:config/city.san-diego.toml:data/coffeemap-sd.db:data/archive-sd"
  "la-n:config/city.la-n.toml:data/coffeemap-la-n.db:data/archive-la-n"
  "la-s:config/city.la-s.toml:data/coffeemap-la-s.db:data/archive-la-s"
  "nyc-n:config/city.nyc-n.toml:data/coffeemap-nyc-n.db:data/archive-nyc-n"
  "nyc-s:config/city.nyc-s.toml:data/coffeemap-nyc-s.db:data/archive-nyc-s"
  "cdmx-n:config/city.cdmx-n.toml:data/coffeemap-cdmx-n.db:data/archive-cdmx-n"
  "cdmx-s:config/city.cdmx-s.toml:data/coffeemap-cdmx-s.db:data/archive-cdmx-s"
  "sfo:config/city.sfo.toml:data/coffeemap-sfo.db:data/archive-sfo"
  "sea:config/city.sea.toml:data/coffeemap-sea.db:data/archive-sea"
  "oak:config/city.oak.toml:data/coffeemap-oak.db:data/archive-oak"
  "aus:config/city.aus.toml:data/coffeemap-aus.db:data/archive-aus"
  "gdl:config/city.gdl.toml:data/coffeemap-gdl.db:data/archive-gdl"
  "ens:config/city.ens.toml:data/coffeemap-ens.db:data/archive-ens"
)

LIMIT=40
SLEEP_MIN=900      # 15 min between passes
SLEEP_MAX=7200     # back off to 2 h when Instagram stops answering
pause=$SLEEP_MIN
pass=0

profiles_total() {
  local n=0
  for entry in "${CITIES[@]}"; do
    IFS=: read -r _slug _cfg db _arch <<<"$entry"
    [ -f "$db" ] || continue
    n=$((n + $(python3 - "$db" <<'PY'
import sqlite3, sys
try:
    print(sqlite3.connect(sys.argv[1]).execute(
        "SELECT COUNT(*) FROM ig_profiles WHERE capture_state='public'").fetchone()[0])
except Exception:
    print(0)
PY
    )))
  done
  echo "$n"
}

say "recon loop start (limit=$LIMIT, pause=${pause}s)"
while true; do
  pass=$((pass + 1))
  before=$(profiles_total)
  say "pass $pass — public profiles before: $before"

  for entry in "${CITIES[@]}"; do
    IFS=: read -r slug cfg db arch <<<"$entry"
    [ -f "$db" ] || { say "  $slug: no db, skip"; continue; }
    out=$(COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$arch" \
          uv run coffeemap ig-recon --limit "$LIMIT" 2>&1)
    rc=$?
    # one line per city: the last meaningful line of ig-recon's own output
    say "  $slug (rc=$rc): $(printf '%s' "$out" | tail -n 2 | tr '\n' ' ' | cut -c1-160)"
    sleep 5
  done

  # refresh what the site reads, city by city, then stitch
  for entry in "${CITIES[@]}"; do
    IFS=: read -r slug cfg db arch <<<"$entry"
    [ -f "$db" ] || continue
    COFFEEMAP_CITY="$cfg" COFFEEMAP_DB="$db" COFFEEMAP_ARCHIVE="$arch" \
      COFFEEMAP_OUT="data/export/$slug" uv run coffeemap export >/dev/null 2>&1
  done
  uv run python scripts/merge_cities.py >>"$LOG" 2>&1

  after=$(profiles_total)
  gained=$((after - before))
  say "pass $pass done — public profiles after: $after (+$gained)"
  if [ "$gained" -le 0 ]; then
    pause=$(( pause * 2 )); [ "$pause" -gt "$SLEEP_MAX" ] && pause=$SLEEP_MAX
    say "  nothing new; backing off to ${pause}s"
  else
    pause=$SLEEP_MIN
  fi
  sleep "$pause"
done
