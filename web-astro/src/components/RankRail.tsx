/** The rail: a ranked board of the census, which hands over to the ficha. */
import React, { useMemo } from "react";
import { filterShopNames } from "../lib/filter";
import { Back, Close, Rows } from "./Icons";
import Ficha from "./Ficha";
import type { ShopDetails } from "../lib/details";

export interface RailShop {
  name: string;
  handle: string | null;
  followers: number | null;
}

interface Props {
  shops: RailShop[];
  query: string;
  onlyIg: boolean;
  selected: (ShopDetails & { lon: number; lat: number }) | null;
  open: boolean;
  onSelect: (name: string) => void;
  onCloseFicha: () => void;
  onCloseRail: () => void;
  total: number;
}

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-MX"));

export default function RankRail({
  shops,
  query,
  onlyIg,
  selected,
  open,
  onSelect,
  onCloseFicha,
  onCloseRail,
  total,
}: Props) {
  const rows = useMemo(() => {
    const filtered = shops.filter((s) => (onlyIg ? s.handle !== null : true));
    const names = filtered.map((s) => s.name);
    const keep = new Set(filterShopNames(names, query));
    const list = filtered.filter((s) => keep.has(s.name));
    return [...list].sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
  }, [shops, query, onlyIg]);

  const ficha = selected !== null;

  return (
    <aside className={`rail${open ? " open" : ""}`} aria-label="Lista y ficha del café">
      <div className="rail-head">
        {ficha ? (
          <>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 30, height: 30, flex: "0 0 30px", borderWidth: 0 }}
              onClick={onCloseFicha}
              aria-label="Volver a la lista"
            >
              <Back />
            </button>
            <h2>Ficha</h2>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 30, height: 30, flex: "0 0 30px", borderWidth: 0, marginLeft: "auto" }}
              onClick={onCloseFicha}
              aria-label="Cerrar ficha"
            >
              <Close />
            </button>
          </>
        ) : (
          <>
            <span style={{ display: "flex", color: "#4a3f18" }}>
              <Rows />
            </span>
            <h2>Más seguidos</h2>
            <span className="sub">
              {rows.length.toLocaleString("es-MX")} / {total.toLocaleString("es-MX")}
            </span>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 30, height: 30, flex: "0 0 30px", borderWidth: 0, marginLeft: 6 }}
              onClick={onCloseRail}
              aria-label="Cerrar lista"
              data-rail-close=""
            >
              <Close />
            </button>
          </>
        )}
      </div>

      {ficha ? (
        <Ficha details={selected} onClose={onCloseFicha} />
      ) : (
        <div className="rows">
          {rows.length === 0 ? (
            <p className="row-none">
              Ningún café coincide con «{query}». Prueba con otra palabra, o quita el filtro de
              Instagram.
            </p>
          ) : (
            rows.map((s) => (
              <button
                key={s.name}
                type="button"
                className="row"
                onClick={() => onSelect(s.name)}
                aria-label={`${s.name}, ${fmt(s.followers)} seguidores`}
              >
                <span className="nm">{s.name}</span>
                <span className="f">{s.followers == null ? "—" : fmt(s.followers)}</span>
                <span className="hd">{s.handle ? `@${s.handle}` : "sin Instagram"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
