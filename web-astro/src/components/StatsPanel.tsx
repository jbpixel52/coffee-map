/**
 * Stats tab: one city at a time, each figure ranked against the rest of the map.
 * Numbers are precomputed in lib/stats.ts; this file only formats and colours.
 */
import React from "react";
import { Close } from "./Icons";
import { format, localeFor, t, type Lang } from "../lib/i18n";
import { ordinal, rankBy, type CityStats } from "../lib/stats";

interface Props {
  stats: CityStats[];
  city: string | null;
  onCity: (city: string | null) => void;
  lang: Lang;
  onClose: () => void;
}

const compact = (n: number, locale: string): string =>
  new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const num = (n: number, locale: string, digits = 1): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);

/** Each row owns a colour from the palette; the emoji chip carries it. */
interface RowProps {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
  colour: string;
  rank?: { place: number; of: number };
  rankLabel?: string;
}

function Row({ emoji, label, value, hint, colour, rank, rankLabel }: RowProps) {
  const medal = rank?.place === 1;
  return (
    <li className="stat-row" style={{ ["--stat" as string]: colour }}>
      <span className="stat-ico" aria-hidden="true">
        {emoji}
      </span>
      <span className="stat-text">
        <span className="stat-k">{label}</span>
        {hint ? <span className="stat-hint">{hint}</span> : null}
      </span>
      <span className="stat-value">
        <b>{value}</b>
        {rank ? (
          <span className={`stat-rank${medal ? " top" : ""}`} title={rankLabel}>
            {medal ? "🥇" : ordinal(rank.place)}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export default function StatsPanel({ stats, city, onCity, lang, onClose }: Props) {
  const locale = localeFor(lang);
  const names = stats.map((s) => s.name);
  const current = stats.find((s) => s.name === city) ?? stats[0];
  const totalShops = stats.reduce((a, s) => a + s.shops, 0);
  const totalCities = stats.length;

  const rank = (pick: (s: CityStats) => number | null, lower = false) => {
    const order = rankBy(stats, pick, lower);
    const place = order.indexOf(current.name) + 1;
    return place > 0 ? { place, of: order.length } : undefined;
  };
  const rankLabel = t(lang, "statRankAria");

  return (
    <section className="panel" id="panel-stats" role="tabpanel" aria-labelledby="tab-stats">
      <header className="panel-head">
        <h2>{t(lang, "statsTab")}</h2>
        <span className="panel-count">
          {totalShops.toLocaleString(locale)} · {totalCities}
        </span>
        <button
          type="button"
          className="icon-btn ghost"
          onClick={onClose}
          aria-label={t(lang, "closeListAria")}
        >
          <Close />
        </button>
      </header>

      <div className="panel-cities" role="group" aria-label={t(lang, "cityAria")}>
        {names.map((n) => (
          <button
            key={n}
            type="button"
            className="chip"
            aria-pressed={current.name === n}
            onClick={() => onCity(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="panel-body">
        <p className="stats-note">{t(lang, "statsNote")}</p>

        <p className="stats-headline">
          <b>{current.shops.toLocaleString(locale)}</b> ·{" "}
          {format(t(lang, "statShare"), { pct: num(current.sharePct, locale) })}
        </p>

        <ul className="stat-list" aria-label={t(lang, "statsAria")}>
          <Row
            emoji="☕"
            label={t(lang, "statShops")}
            value={current.shops.toLocaleString(locale)}
            hint={format(t(lang, "statShare"), { pct: num(current.sharePct, locale) })}
            colour="var(--chili-pepper)"
            rank={rank((s) => s.shops)}
            rankLabel={rankLabel}
          />
          <Row
            emoji="🏙️"
            label={t(lang, "statDensity")}
            value={current.perSqMi == null ? "—" : num(current.perSqMi, locale, 2)}
            colour="var(--princess-blue)"
            rank={rank((s) => s.perSqMi)}
            rankLabel={rankLabel}
          />
          <Row
            emoji="🧍"
            label={t(lang, "statPerCapita")}
            value={current.per100k == null ? "—" : num(current.per100k, locale)}
            colour="var(--lavender-oil)"
            rank={rank((s) => s.per100k)}
            rankLabel={rankLabel}
          />
          <Row
            emoji="📮"
            label={t(lang, "statPerZip")}
            value={current.shopsPerZip == null ? "—" : num(current.shopsPerZip, locale)}
            hint={
              current.topZip
                ? format(t(lang, "statZips"), {
                    n: String(current.zipCount),
                    zip: current.topZip.zip,
                    c: String(current.topZip.count),
                  })
                : undefined
            }
            colour="var(--tarragon)"
          />
          <Row
            emoji="📸"
            label={t(lang, "statInstagram")}
            value={`${current.igShops.toLocaleString(locale)} · ${num(current.igPct, locale)}%`}
            colour="var(--waterfall)"
            rank={rank((s) => s.igPct)}
            rankLabel={rankLabel}
          />
          <Row
            emoji="💞"
            label={t(lang, "statFollowers")}
            value={current.followers > 0 ? compact(current.followers, locale) : "—"}
            hint={
              current.medianFollowers
                ? format(t(lang, "statMedianFollowers"), {
                    n: current.medianFollowers.toLocaleString(locale),
                  })
                : undefined
            }
            colour="var(--arrowwood)"
            rank={rank((s) => (s.followers > 0 ? s.followers : null))}
            rankLabel={rankLabel}
          />
          <Row
            emoji="🏆"
            label={t(lang, "statTopShop")}
            value={
              current.topShop
                ? `${current.topShop.name} · ${compact(current.topShop.followers, locale)}`
                : "—"
            }
            colour="var(--rosy-future)"
          />
          <Row
            emoji="🚶"
            label={t(lang, "statWalk")}
            value={current.nearestM == null ? "—" : `${num(current.nearestM, locale, 0)} m`}
            colour="var(--daiquiri-green)"
            rank={rank((s) => s.nearestM, true)}
            rankLabel={rankLabel}
          />
          <Row
            emoji="🥐"
            label={t(lang, "statBrand")}
            value={current.brand ? `${current.brand.name} ×${current.brand.count}` : "—"}
            hint={
              current.brand
                ? format(t(lang, "statBrandShare"), { pct: num(current.brand.pct, locale) })
                : undefined
            }
            colour="var(--langoustino)"
          />
          <Row
            emoji="📍"
            label={t(lang, "statAddress")}
            value={`${num(current.addressPct, locale)}%`}
            colour="var(--dolphin)"
            rank={rank((s) => s.addressPct)}
            rankLabel={rankLabel}
          />
        </ul>
      </div>
    </section>
  );
}
