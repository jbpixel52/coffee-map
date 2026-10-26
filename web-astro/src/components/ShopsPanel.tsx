/** The shops tab: search, the Instagram filter, the count, and the stacked list. */
import React, { useMemo } from "react";
import { Close, Search } from "./Icons";
import StackedList, { type ListShop } from "./StackedList";
import { filterShopNames } from "../lib/filter";

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
  selected: string | null;
  onSelect: (name: string) => void;
  onClose: () => void;
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
}: Props) {
  const rows = useMemo(() => {
    let pool = city ? shops.filter((s) => s.city === city) : shops;
    if (onlyIg) pool = pool.filter((s) => s.handle);
    const keep = new Set(filterShopNames(pool.map((s) => s.name), query));
    return pool
      .filter((s) => keep.has(s.name))
      .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
  }, [shops, query, onlyIg, city]);

  return (
    <section className="panel" id="panel-shops" role="tabpanel" aria-labelledby="tab-shops">
      <header className="panel-head">
        <h2>Cafés</h2>
        <span className="panel-count">
          {shown.toLocaleString("es-MX")} / {total.toLocaleString("es-MX")}
        </span>
        <button type="button" className="icon-btn ghost" onClick={onClose} aria-label="Cerrar lista">
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
            placeholder="Nombre o @handle"
            aria-label="Buscar café"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="chip"
          aria-pressed={onlyIg}
          onClick={onOnlyIg}
          title="Sólo cafés con Instagram conocido"
        >
          Con Instagram
        </button>
      </div>

      {cities.length > 1 && (
        <div className="panel-cities" role="group" aria-label="Ciudad">
          <button type="button" className="chip" aria-pressed={city === null} onClick={() => onCity(null)}>
            Todas
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
          shops={rows}
          selected={selected}
          onSelect={onSelect}
          emptyNote={
            <>
              Ningún café coincide con «{query}». Prueba otra palabra o quita el filtro de Instagram.
            </>
          }
        />
      </div>
    </section>
  );
}
