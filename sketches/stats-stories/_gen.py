#!/usr/bin/env python3
"""Generate 12 concept sketches for telling the coffee-map stats as stories.

Each variant is one self-contained HTML page at 1200x760 that opens by double
click: the project's :root token block is inlined verbatim, then a small mock.
Numbers are the real census snapshot in _data.json (8,681 shops, 11 cities).

    python3 _gen.py            # writes NN-slug/index.html + index.html gallery
"""
from __future__ import annotations

import json
import pathlib

HERE = pathlib.Path(__file__).parent
TOKENS = (HERE / "_tokens.css").read_text()
DATA = json.loads((HERE / "_data.json").read_text())
CITIES = DATA["cities"]
TOTAL = DATA["total"]

BASE = """
*{box-sizing:border-box}
html,body{margin:0;height:100%}
@font-face{font-family:"Hanken Grotesk";src:url("../assets/hanken-grotesk-latin.woff2") format("woff2");
  font-weight:100 900;font-style:normal;font-display:swap}
body{font-family:"Hanken Grotesk",ui-sans-serif,system-ui,sans-serif;
  background:var(--antique-white);color:var(--blue-indigo);-webkit-font-smoothing:antialiased}
.wrap{height:100%;display:flex;flex-direction:column;padding:22px 26px;gap:14px;overflow:hidden}
.top{display:flex;align-items:center;gap:12px;flex:0 0 auto}
.top h1{font-size:19px;margin:0;letter-spacing:-.01em;white-space:nowrap}
.stance{margin-left:auto;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap;
  color:var(--chili-pepper);border:1px solid var(--accent-soft);border-radius:999px;padding:4px 9px}
.stamp{font-size:9.5px;letter-spacing:.08em;color:var(--fg-muted);text-transform:uppercase;white-space:nowrap}
.canvas{flex:1;min-height:0;position:relative;overflow:hidden}
.note{flex:0 0 auto;font-size:11px;line-height:1.45;color:var(--fg-muted);
  border-top:1px solid var(--border);padding-top:8px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg)}
"""


def page(title: str, stance: str, css: str, body: str, note: str, js: str = "") -> str:
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{title} — coffee-map stats sketch</title>
<style>{TOKENS}{BASE}{css}</style></head>
<body><div class="wrap">
  <div class="top"><h1>{title}</h1><span class="stance">{stance}</span>
    <span class="stamp">real census · {TOTAL:,} shops</span></div>
  <div class="canvas">{body}</div>
  <div class="note">{note}</div>
</div>{f"<script>{js}</script>" if js else ""}</body></html>"""


def rows(key, reverse=True):
    return sorted(CITIES, key=lambda c: (c[key] is None, -(c[key] or 0)) if reverse else (c[key] is None, c[key] or 0))


# ── 01 league table ───────────────────────────────────────────────────────────
def league():
    top = max(c["shops"] for c in CITIES)
    trs = []
    for i, c in enumerate(rows("shops"), 1):
        medal = "🥇" if i == 1 else ""
        trs.append(
            f"""<tr><td class="rk">{i}{medal}</td><td class="nm">{c['name']}</td>
            <td class="num">{c['shops']:,}</td>
            <td class="bar"><i style="width:{100 * c['shops'] / top:.0f}%"></i></td>
            <td class="num muted">{c['share']}%</td>
            <td class="num">{c['per_sq_mi']}</td>
            <td class="num">{c['per_100k']}</td>
            <td class="num">{c['ig_pct']}%</td></tr>"""
        )
    body = f"""<div class="card tbl"><table>
      <thead><tr><th></th><th>City</th><th class="num">Shops</th><th></th>
      <th class="num">Share</th><th class="num">/sq mi</th><th class="num">/100k</th><th class="num">IG</th></tr></thead>
      <tbody>{''.join(trs)}</tbody></table></div>"""
    css = """
    .tbl{position:absolute;inset:0;overflow:hidden;padding:0 4px}
    table{width:100%;border-collapse:collapse;font-size:13px;height:100%}
    th{text-align:left;font-size:10px;letter-spacing:.06em;
      text-transform:uppercase;color:var(--fg-muted);padding:6px 8px;border-bottom:1px solid var(--border)}
    td{padding:4px 8px;border-bottom:1px solid color-mix(in srgb,var(--border) 45%,transparent)}
    .rk{width:46px;color:var(--fg-muted);font-variant-numeric:tabular-nums}
    .nm{font-weight:600}
    .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    .muted{color:var(--fg-muted)}
    .bar i{display:block;height:7px;border-radius:999px;background:var(--waterfall);min-width:2px}
    tbody tr:hover{background:var(--surface-2)}
    """
    return page("Café capital scoreboard", "operate · compare", css, body,
                "Sortable league table: one row per city, inline bars, a medal on the leader. Pro: reads instantly, scales to more cities. Con: a table, not a story.",
                js="")


# ── 02 dot ribbon ─────────────────────────────────────────────────────────────
def ribbon():
    top = max(c["per_sq_mi"] for c in CITIES)
    lanes = []
    for c in rows("per_sq_mi"):
        n = max(1, round(c["per_sq_mi"] / top * 34))
        dots = "".join("<i></i>" for _ in range(n))
        lanes.append(
            f"""<div class="lane"><span class="lname">{c['name']}</span>
            <span class="dots" style="--hue:{c['per_sq_mi'] / top:.2f}">{dots}</span>
            <span class="lval">{c['per_sq_mi']} <em>/sq mi</em></span>
            <span class="walk">café every {c['nearest_m'] or '—'} m</span></div>"""
        )
    body = f"<div class='ribbons'>{''.join(lanes)}</div>"
    css = """
    .ribbons{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:9px}
    .lane{display:grid;grid-template-columns:150px 1fr 118px 132px;align-items:center;gap:12px}
    .lname{font-size:13px;font-weight:600;text-align:right}
    .dots{display:flex;gap:4px;align-items:center}
    .dots i{width:9px;height:9px;border-radius:50%;
      background:color-mix(in srgb,var(--princess-blue) calc(30% + var(--hue)*70%),var(--antique-white));
      box-shadow:0 0 0 1px color-mix(in srgb,var(--blue-indigo) 18%,transparent)}
    .lval{font-size:13px;font-variant-numeric:tabular-nums;font-weight:600}
    .lval em{font-style:normal;font-weight:400;color:var(--fg-muted);font-size:11px}
    .walk{font-size:11px;color:var(--fg-muted)}
    """
    return page("Density ribbon", "compare · physical", css, body,
                "One dot per unit of cafés-per-sq-mile, with the average walk between cafés beside it. Pro: density becomes a picture. Con: needs a scale caption to be honest.")


# ── 03 zip atlas ──────────────────────────────────────────────────────────────
def atlas():
    tiles = []
    for c in rows("shops"):
        zc = c["top_zip"][1] if c["top_zip"] else 0
        heat = min(1, zc / 73)
        tiles.append(
            f"""<figure class="zip"><div class="grid" style="--heat:{heat:.2f}">
              <b>{c['zips']}</b><span>ZIPs</span></div>
              <figcaption><strong>{c['name']}</strong>
              <span>{c['shops_per_zip'] or '—'} cafés/ZIP · busiest {c['top_zip'][0] if c['top_zip'] else '—'} ×{zc}</span></figcaption>
            </figure>"""
        )
    body = f"<div class='atlas'>{''.join(tiles)}</div>"
    css = """
    .atlas{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:10px}
    .zip{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);
      padding:10px;display:flex;flex-direction:column;gap:8px}
    .grid{flex:1;min-height:0;border-radius:var(--radius-md);display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:2px;
      background:
        linear-gradient(color-mix(in srgb,var(--arrowwood) calc(var(--heat)*60%),var(--anise-flower)),
                        color-mix(in srgb,var(--langoustino) calc(var(--heat)*70%),var(--anise-flower)));
      border:1px solid color-mix(in srgb,var(--arrowwood) 30%,transparent)}
    .grid b{font-size:26px;font-variant-numeric:tabular-nums}
    .grid span{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
    figcaption{display:flex;flex-direction:column;gap:1px;margin:0}
    figcaption strong{font-size:12.5px}
    figcaption span{font-size:10px;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    """
    return page("ZIP atlas", "map-first", css, body,
                "A card per city with its ZIP count and busiest postal code, heat-tinted. Pro: makes 'cafés per ZIP' tangible and points at a real place. Con: a card is not a map — the honest version is a real ZIP choropleth.")


# ── 04 walk strip ─────────────────────────────────────────────────────────────
def walk():
    top = max(c["nearest_m"] or 0 for c in CITIES)
    bars = []
    for c in rows("nearest_m", reverse=False):
        w = 100 * (c["nearest_m"] or 0) / top
        bars.append(
            f"""<div class="step"><span class="who">{c['name']}</span>
            <div class="track"><i style="width:{w:.0f}%"></i>
              <span class="foot" style="left:{w:.0f}%">🚶</span></div>
            <span class="m">{c['nearest_m'] or '—'} m</span></div>"""
        )
    body = f"<div class='walks'>{''.join(bars)}</div>"
    css = """
    .walks{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:6px}
    .step{display:grid;grid-template-columns:150px 1fr 64px;align-items:center;gap:14px}
    .who{font-size:13px;font-weight:600;text-align:right}
    .track{position:relative;height:10px;border-radius:999px;background:var(--surface-2);
      border:1px solid var(--border)}
    .track i{display:block;height:100%;border-radius:999px;
      background:linear-gradient(90deg,var(--waterfall),var(--tarragon))}
    .foot{position:absolute;top:-11px;transform:translateX(-50%);font-size:12px}
    .m{font-size:12.5px;font-variant-numeric:tabular-nums;font-weight:600}
    """
    return page("Walk to the next café", "physical · one axis", css, body,
                "Mean distance to the nearest café, drawn as a walk. Pro: an emotional, instantly graspable number ('a café every 116 m'). Con: needs the sampling caveat in the footnote.")


# ── 05 story cards ────────────────────────────────────────────────────────────
def cards():
    tj = next(c for c in CITIES if c["name"] == "Tijuana")
    sf = next(c for c in CITIES if c["name"] == "San Francisco")
    ny = next(c for c in CITIES if c["name"] == "New York City")
    items = [
        ("📸", "Tijuana runs on Instagram", f"{tj['ig_pct']}% of its {tj['shops']} cafés have a handle — triple the map average.", "var(--waterfall)"),
        ("🚶", "San Francisco is a 2-minute city", f"A café every {sf['nearest_m']} m. You are never far from an espresso.", "var(--princess-blue)"),
        ("🏙️", "New York is the census, not the density", f"{ny['shops']:,} cafés — the most anywhere — but only {ny['per_sq_mi']}/sq mi.", "var(--lavender-oil)"),
        ("🥐", "The chains are everywhere", "Starbucks is the most repeated name in 10 of 11 cities.", "var(--langoustino)"),
    ]
    deck = "".join(
        f"""<article class="story" style="--c:{c}"><span class="emo">{e}</span>
        <h3>{t}</h3><p>{p}</p><footer>swipe →</footer></article>"""
        for e, t, p, c in items
    )
    body = f"<div class='deck'>{deck}</div>"
    css = """
    .deck{position:absolute;inset:0;display:flex;gap:14px;align-items:center}
    .story{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);
      padding:18px;display:flex;flex-direction:column;gap:8px;min-height:330px;
      box-shadow:var(--shadow)}
    .emo{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;
      background:color-mix(in srgb,var(--c) 20%,transparent);border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}
    .story h3{margin:0;font-size:15px;letter-spacing:-.01em}
    .story p{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
    .story footer{margin-top:auto;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--c)}
    """
    return page("Insight cards", "narrative", css, body,
                "Auto-written cards, one claim each, with a coloured emoji chip and a swipe affordance. Pro: the stats become sentences a person repeats. Con: every card needs a threshold rule or it becomes horoscope copy.")


# ── 06 scatter quadrant ───────────────────────────────────────────────────────
def scatter():
    W, H = 940, 470
    xmax, ymax = 18, 20
    pts = []
    for c in CITIES:
        x = 40 + (c["per_sq_mi"] / xmax) * W
        y = (H - 30) - ((c["ig_pct"] or 0) / ymax) * (H - 30 - 60)
        pts.append((round(x), round(y), c))
    # labels: alternate above/below and clamp inside the plot so none is lost
    marks = []
    for x, y, c in sorted(pts, key=lambda t: t[1]):
        above = y > 70
        ly = y - 15 if above else y + 22
        marks.append(
            f"""<g><circle cx="{x}" cy="{y}" r="{6 + c['shops'] / 400:.0f}"
              fill="var(--waterfall)" fill-opacity=".55" stroke="var(--blue-indigo)" stroke-opacity=".5"/>
              <text x="{x}" y="{ly}" text-anchor="middle" class="lbl">{c['name']}</text></g>"""
        )
    body = f"""<div class="sc"><svg viewBox="0 0 1020 560">
      <line x1="40" y1="{H - 30}" x2="{40 + W}" y2="{H - 30}" stroke="var(--border)"/>
      <line x1="40" y1="{H - 30}" x2="40" y2="56" stroke="var(--border)"/>
      <text x="52" y="44" class="axis">social scene ↑</text>
      <text x="{40 + W - 10}" y="{H - 8}" class="axis" text-anchor="end">dense →</text>
      <rect x="{40 + W / 2}" y="56" width="{W / 2}" height="{H / 2 - 56}" fill="var(--chili-pepper)" opacity=".04"/>
      <text x="{40 + W / 2 + 14}" y="76" class="quad">dense &amp; online</text>
      {''.join(marks)}</svg></div>"""
    css = """
    .sc{position:absolute;inset:0;display:grid;place-items:center}
    svg{width:100%;height:100%}
    .lbl{font-size:11px;fill:var(--blue-indigo);font-weight:600}
    .axis{font-size:10px;letter-spacing:.08em;text-transform:uppercase;fill:var(--fg-muted)}
    .quad{font-size:10.5px;fill:var(--chili-pepper);letter-spacing:.06em;text-transform:uppercase}
    """
    return page("Density vs social", "insight · two axes", css, body,
                "Physical density against Instagram share, bubble size = shop count. Pro: two stats become one argument (Tijuana is unusual: sparse but highly online). Con: eleven dots is near the limit of readability.")


# ── 07 fingerprint ────────────────────────────────────────────────────────────
def fingerprint():
    axes = ["per_sq_mi", "per_100k", "ig_pct", "addr_pct", "shops"]
    maxes = {k: max((c[k] or 0) for c in CITIES) or 1 for k in axes}
    picks = [next(c for c in CITIES if c["name"] == n) for n in ("Tijuana", "San Francisco")]

    def poly(c):
        import math
        pts = []
        for i, k in enumerate(axes):
            a = -math.pi / 2 + i * 2 * math.pi / len(axes)
            r = 20 + 90 * ((c[k] or 0) / maxes[k])
            pts.append(f"{120 + r * math.cos(a):.1f},{120 + r * math.sin(a):.1f}")
        return " ".join(pts)

    cards = []
    for c, col in zip(picks, ("var(--chili-pepper)", "var(--princess-blue)")):
        cards.append(
            f"""<figure><svg viewBox="0 0 240 240">
            <polygon points="{poly(c)}" fill="{col}" fill-opacity=".22" stroke="{col}" stroke-width="2"/>
            <circle cx="120" cy="120" r="92" fill="none" stroke="var(--border)"/>
            </svg><figcaption>{c['name']}</figcaption></figure>"""
        )
    body = f"<div class='fps'>{''.join(cards)}<div class='legend'>{''.join(f'<span>{a.replace("_"," ")}</span>' for a in axes)}</div></div>"
    css = """
    .fps{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:40px}
    figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
    svg{width:230px;height:230px}
    figcaption{font-size:13px;font-weight:600}
    .legend{display:flex;flex-direction:column;gap:8px;font-size:11px;color:var(--fg-muted);
      border-left:1px solid var(--border);padding-left:16px}
    """
    return page("City fingerprint", "identity", css, body,
                "A radar per city over five normalised stats, two cities side by side. Pro: a shape people recognise and argue with. Con: radar areas exaggerate; never label it a score.")


# ── 08 brand treemap ──────────────────────────────────────────────────────────
def treemap():
    cells = []
    for c in rows("shops")[:6]:
        b = c["brand"]
        share = (b[1] / c["shops"] * 100) if b else 0
        cells.append(
            f"""<div class="tm" style="--chain:{share / 40:.2f}">
              <b>{c['name']}</b>
              <span class="big">{b[0] if b else '—'} ×{b[1] if b else 0}</span>
              <span class="pct">{share:.1f}% of the city is one name</span>
              <div class="mini"><i style="width:{min(100, share * 2.5):.0f}%"></i></div>
            </div>"""
        )
    body = f"<div class='map'>{''.join(cells)}</div>"
    css = """
    .map{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .tm{background:color-mix(in srgb,var(--langoustino) calc(10% + var(--chain)*30%),var(--surface));
      border:1px solid color-mix(in srgb,var(--langoustino) 40%,var(--border));
      border-radius:var(--radius-lg);padding:14px;display:flex;flex-direction:column;gap:6px}
    .tm b{font-size:13px}
    .big{font-size:17px;font-weight:700}
    .pct{font-size:10.5px;color:var(--fg-muted)}
    .mini{margin-top:auto;height:6px;border-radius:999px;background:var(--surface-2)}
    .mini i{display:block;height:100%;border-radius:999px;background:var(--chili-pepper)}
    """
    return page("Who owns the block", "business", css, body,
                "The most repeated name per city and its share, tinted by concentration. Pro: a real local-business story. Con: name-prefix matching over-counts (two unrelated 'Café …' do not merge, Starbucks does).")


# ── 09 linked brushing ────────────────────────────────────────────────────────
def brushing():
    chips = "".join(
        f"<button class='br{' on' if c['name'] == 'Tijuana' else ''}'>{c['name']}</button>" for c in CITIES[:6]
    )
    body = f"""<div class="brush">
      <aside class="side">
        <h4>Metric</h4>
        <label><input type="radio" checked> Cafés per sq mi</label>
        <label><input type="radio"> Instagram share</label>
        <label><input type="radio"> Cafés per 100k</label>
        <h4>City</h4><div class="chips">{chips}</div>
        <div class="readout">
          <span class="ro-name">Tijuana</span>
          <dl><dt>per sq mi</dt><dd>1.31</dd><dt>on Instagram</dt><dd>18.7%</dd>
              <dt>ZIPs</dt><dd>64</dd><dt>walk to next</dt><dd>229 m</dd></dl>
        </div>
      </aside>
      <div class="mapmock">
        <div class="dot" style="left:32%;top:44%"></div><div class="dot on" style="left:52%;top:58%"></div>
        <div class="dot" style="left:70%;top:36%"></div><div class="dot" style="left:44%;top:26%"></div>
        <div class="hint">the map dims to the selected metric;<br>a city chip re-frames the view</div>
      </div></div>"""
    css = """
    .brush{position:absolute;inset:0;display:grid;grid-template-columns:260px 1fr;gap:12px}
    .side{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;
      display:flex;flex-direction:column;gap:7px;font-size:12px}
    .side h4{margin:6px 0 2px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-muted)}
    .side label{display:flex;gap:7px;align-items:center;color:var(--fg)}
    .chips{display:flex;flex-wrap:wrap;gap:5px}
    .br{font:inherit;font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--border-input);
      background:var(--background);color:var(--fg);cursor:pointer}
    .br.on{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
    .readout{margin-top:auto;border-top:1px solid var(--border);padding-top:10px}
    .ro-name{font-size:13px;font-weight:600}
    .readout dl{display:grid;grid-template-columns:1fr auto;gap:3px 10px;margin:8px 0 0;font-size:11.5px}
    .readout dt{color:var(--fg-muted)}
    .readout dd{margin:0;font-variant-numeric:tabular-nums;font-weight:600;text-align:right}
    .mapmock{position:relative;border-radius:var(--radius-lg);border:1px solid var(--border);
      background:linear-gradient(0deg,var(--surface-2),var(--surface));overflow:hidden}
    .dot{position:absolute;width:13px;height:13px;border-radius:50%;background:var(--dolphin);opacity:.5;transform:translate(-50%,-50%)}
    .dot.on{width:19px;height:19px;background:var(--chili-pepper);opacity:1;box-shadow:0 0 0 6px color-mix(in srgb,var(--chili-pepper) 18%,transparent)}
    .hint{position:absolute;left:16px;bottom:14px;font-size:11px;color:var(--fg-muted);line-height:1.5}
    """
    return page("Stats that drive the map", "interactive · linked", css, body,
                "The stats panel becomes the map's control surface: choose a metric, the dots re-encode; choose a city, the view re-frames. Pro: keeps the map the product. Con: more state than a sketch can show — needs a real prototype.")


# ── 10 postcards ──────────────────────────────────────────────────────────────
def postcards():
    cards = []
    for c in rows("shops")[:4]:
        cards.append(
            f"""<article class="pc"><div class="stampbox">☕</div>
            <h3>{c['name']}</h3>
            <p class="hero">{c['shops']:,}</p><p class="sub">coffee shops</p>
            <ul><li>{c['per_sq_mi']} per sq mi</li><li>{c['ig_pct']}% on Instagram</li>
            <li>busiest ZIP {c['top_zip'][0] if c['top_zip'] else '—'}</li></ul></article>"""
        )
    body = f"<div class='deck'>{''.join(cards)}</div>"
    css = """
    .deck{position:absolute;inset:0;display:flex;gap:14px;align-items:center}
    .pc{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;
      display:flex;flex-direction:column;gap:2px;position:relative;box-shadow:var(--shadow);
      background-image:repeating-linear-gradient(135deg,color-mix(in srgb,var(--dolphin) 14%,transparent) 0 2px,transparent 2px 9px)}
    .stampbox{position:absolute;right:12px;top:12px;width:40px;height:46px;border:2px dashed color-mix(in srgb,var(--chili-pepper) 55%,transparent);
      border-radius:4px;display:grid;place-items:center;font-size:16px;background:var(--surface)}
    .pc h3{margin:0;font-size:13px}
    .hero{margin:8px 0 0;font-size:40px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
    .sub{margin:0 0 8px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-muted)}
    .pc ul{list-style:none;margin:6px 0 0;padding:10px 0 0;font-size:11px;color:var(--fg-muted);
      display:flex;flex-direction:column;gap:4px;border-top:1px dashed color-mix(in srgb,var(--dolphin) 45%,transparent)}
    """
    return page("Postcards", "collectible", css, body,
                "A postcard per city: one hero number, a stamp, three small facts. Pro: shareable, delightful, works offline. Con: hides comparison — pair it with the table.")


# ── 11 slope of ranks ─────────────────────────────────────────────────────────
def slope():
    import math
    score = {c["name"]: i for i, c in enumerate(rows("shops"))}
    dens = {c["name"]: i for i, c in enumerate(rows("per_sq_mi"))}
    lines = []
    for c in CITIES:
        n = c["name"]
        y1 = 34 + score[n] * 34
        y2 = 34 + dens[n] * 34
        col = "var(--chili-pepper)" if score[n] < dens[n] else "var(--waterfall)"
        lines.append(
            f"""<line x1="120" y1="{y1}" x2="420" y2="{y2}" stroke="{col}" stroke-opacity=".55" stroke-width="2"/>
            <text x="112" y="{y1 + 4}" text-anchor="end" class="sl">{n}</text>
            <text x="428" y="{y2 + 4}" class="sl">{n}</text>"""
        )
    body = f"""<div class="slopewrap"><svg viewBox="0 0 560 420">
      <text x="120" y="20" text-anchor="end" class="hd">by shops</text>
      <text x="428" y="20" class="hd">by density</text>
      {''.join(lines)}</svg></div>"""
    css = """
    .slopewrap{position:absolute;inset:0;display:grid;place-items:center}
    svg{height:100%}
    .sl{font-size:10.5px;fill:var(--blue-indigo)}
    .hd{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;fill:var(--fg-muted)}
    """
    return page("Same city, different rank", "analytical", css, body,
                "Slope chart of a city's rank by total shops versus by density. Pro: exposes how the leaderboard flips (New York falls, San Francisco climbs). Con: eleven labels per side is crowded — cap it at the movers.")


# ── 12 ambient ticker ─────────────────────────────────────────────────────────
def ticker():
    body = """<div class="amb">
      <div class="line">🚶 San Francisco: a café every 116 m · ☕ 786 in the city</div>
      <div class="line dim">📸 Tijuana: 18.7% on Instagram, the highest on the map</div>
      <div class="line dim2">🥐 Starbucks is the most repeated name in 10 of 11 cities</div>
      <div class="spark"><i style="height:38%"></i><i style="height:64%"></i><i style="height:52%"></i>
        <i style="height:88%"></i><i style="height:71%"></i><i style="height:96%"></i></div>
      <p class="cap">an ambient line in the map corner: one insight at a time, tap to keep it</p>
    </div>"""
    css = """
    .amb{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:14px;
      background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:26px}
    .line{font-size:19px;font-weight:600;letter-spacing:-.01em}
    .dim{opacity:.42}.dim2{opacity:.18}
    .spark{display:flex;align-items:flex-end;gap:6px;height:70px;margin-top:8px}
    .spark i{width:26px;border-radius:4px 4px 0 0;background:linear-gradient(var(--waterfall),var(--princess-blue))}
    .cap{font-size:11px;color:var(--fg-muted);margin:0}
    """
    return page("Coffee wire", "ambient", css, body,
                "A one-line insight ticker that lives in the map corner and rotates. Pro: zero clicks, always-on storytelling. Con: must be dismissible and never cover the map.")


VARIANTS = [
    ("01-league-table", "Café capital scoreboard", league),
    ("02-dot-ribbon", "Density ribbon", ribbon),
    ("03-zip-atlas", "ZIP atlas", atlas),
    ("04-walk-strip", "Walk to the next café", walk),
    ("05-story-cards", "Insight cards", cards),
    ("06-scatter-quadrant", "Density vs social", scatter),
    ("07-fingerprint", "City fingerprint", fingerprint),
    ("08-brand-treemap", "Who owns the block", treemap),
    ("09-linked-brush", "Stats that drive the map", brushing),
    ("10-postcards", "Postcards", postcards),
    ("11-slope-rank", "Same city, different rank", slope),
    ("12-ambient-ticker", "Coffee wire", ticker),
]


def main() -> None:
    for slug, title, fn in VARIANTS:
        d = HERE / slug
        d.mkdir(exist_ok=True)
        (d / "index.html").write_text(fn(), encoding="utf-8")
    cells = "\n".join(
        f"""<figure><iframe src="{slug}/index.html" title="{title}" loading="lazy"></iframe>
        <figcaption><b>{slug.split('-')[0]}</b> {title}</figcaption></figure>"""
        for slug, title, _ in VARIANTS
    )
    (HERE / "index.html").write_text(
        f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>coffee-map · 12 ways to tell the stats</title><style>{TOKENS}
body{{margin:0;background:var(--antique-white);font-family:"Hanken Grotesk",system-ui,sans-serif;color:var(--blue-indigo)}}
header{{padding:28px 32px 8px}}h1{{margin:0;font-size:24px;letter-spacing:-.02em}}
p{{margin:6px 0 0;font-size:13px;color:var(--fg-muted);max-width:70ch}}
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;padding:20px 32px 40px}}
figure{{margin:0}}iframe{{width:100%;aspect-ratio:1200/760;border:1px solid var(--border);border-radius:12px;background:var(--surface)}}
figcaption{{font-size:12px;padding-top:6px;color:var(--fg-muted)}}figcaption b{{color:var(--chili-pepper);margin-right:6px}}
</style></head><body>
<header><h1>12 ways to tell the coffee-map stats</h1>
<p>Concept sketches at 1200×760, all drawn with the project's own Pantone SS27 tokens and the real
census snapshot ({TOTAL:,} shops, 11 cities). Open any card directly for a full-size page.</p></header>
<div class="grid">{cells}</div></body></html>""",
        encoding="utf-8",
    )
    print(f"wrote {len(VARIANTS)} sketches + gallery")


if __name__ == "__main__":
    main()
