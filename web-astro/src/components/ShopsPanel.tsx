/** The shops tab: search, the Instagram filter, the count, and the stacked list. */
import React, { useMemo } from "react";
import { Close, Search } from "./Icons";
import StackedList, { type ListShop } from "./StackedList";
import { shopMatches } from "../lib/filter";
import { format, localeFor, t, type Lang } from "../lib/i18n";

/** Rendering every row of eleven cities janks the list; the map still holds them all. */
const LIST_CAP = 200;

interface Props {
  shops: ListShop[];
  cities: string[];
  city: string | null;
  onCity: (city: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
  onlyIg: boolean;
  onOnlyIg: () => void;
  shown: number;
  total: number;
  selected: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  lang: Lang;
}

export default function ShopsPanel({
  shops,
  cities,
  city,
  onCity,
  query,
  onQuery,
  onlyIg,
  onOnlyIg,
  shown,
  total,
  selected,
  onSelect,
  onClose,
  lang,
}: Props) {
  const locale = localeFor(lang);
  // One rule for the map and the list: each row is fed to shopMatches as the
  // same shape the GeoJSON features use.
  const rows = useMemo(
    () =>
      shops
        .filter((s) =>
          shopMatches(
            { name: s.name, instagram: s.handle, ig_followers: s.followers, city: s.city },
            query,
            onlyIg,
            city,
          ),
        )
        .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1)),
    [shops, query, onlyIg, city],
  );

  return (
    <section className="panel" id="panel-shops" role="tabpanel" aria-labelledby="tab-shops">
      <header className="panel-head">
        <h2>{t(lang, "shopsTab")}</h2>
        <span className="panel-count">
          {shown.toLocaleString(locale)} / {total.toLocaleString(locale)}
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

      <div className="panel-tools">
        <label className="field">
          <span className="field-icon" aria-hidden="true">
            <Search />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t(lang, "searchPlaceholder")}
            aria-label={t(lang, "searchAria")}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="chip"
          aria-pressed={onlyIg}
          onClick={onOnlyIg}
          title={t(lang, "withInstagramTitle")}
        >
          {t(lang, "withInstagram")}
        </button>
      </div>

      {cities.length > 1 && (
        <div className="panel-cities" role="group" aria-label={t(lang, "cityAria")}>
          <button type="button" className="chip" aria-pressed={city === null} onClick={() => onCity(null)}>
            {t(lang, "allCities")}
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={city === c}
              onClick={() => onCity(city === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="panel-body">
        <StackedList
          shops={rows.slice(0, LIST_CAP)}
          selected={selected}
          onSelect={onSelect}
          lang={lang}
          emptyNote={format(t(lang, "emptySearch"), { query })}
        />
        {rows.length > LIST_CAP && (
          <p className="list-note">
            {format(t(lang, "listCapNote"), {
              cap: LIST_CAP.toLocaleString(locale),
              n: rows.length.toLocaleString(locale),
            })}
          </p>
        )}
      </div>
    </section>
  );
}
