/** The top sign band: where you are, what you're looking for, how much is left. */
import React from "react";
import { Cup, Flame, Search, Sun } from "./Icons";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onlyIg: boolean;
  onOnlyIg: () => void;
  heat: boolean;
  onHeat: () => void;
  night: boolean;
  onNight: () => void;
  shown: number;
  total: number;
  status: "loading" | "ready" | "error";
  onOpenRail: () => void;
}

export default function SignBand({
  query,
  onQuery,
  onlyIg,
  onOnlyIg,
  heat,
  onHeat,
  night,
  onNight,
  shown,
  total,
  status,
  onOpenRail,
}: Props) {
  const label =
    status === "ready" ? "CAFÉS EN EL MAPA" : status === "error" ? "SIN DATOS" : "CARGANDO";
  return (
    <header className="band band-top">
      <div className="pict" aria-hidden="true">
        <span style={{ color: "var(--sign)" }}>
          <Cup size={30} />
        </span>
      </div>

      <div className="wordmark">
        <b>Cafés de Tijuana</b>
        <span>mapa de la ciudad</span>
      </div>

      <label className="field">
        <span style={{ color: "#7d7561", display: "flex" }}>
          <Search />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Nombre, @handle o zona"
          aria-label="Buscar café"
          autoComplete="off"
        />
      </label>

      <div className="chips">
        <button
          type="button"
          className="chip"
          aria-pressed={onlyIg}
          onClick={onOnlyIg}
          title="Sólo cafés con Instagram conocido"
        >
          Instagram
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={heat}
          onClick={onHeat}
          title="Densidad por seguidores"
        >
          <Flame />
          Calor
        </button>
      </div>

      <button
        type="button"
        className="icon-btn"
        onClick={onNight}
        aria-pressed={night}
        aria-label={night ? "Modo día" : "Modo noche"}
        title={night ? "Modo día" : "Modo noche"}
      >
        <Sun />
      </button>

      <button
        type="button"
        className="icon-btn"
        onClick={onOpenRail}
        aria-label="Abrir lista y ficha"
        title="Lista y ficha"
        style={{ display: "none" }}
        data-rail-toggle=""
      >
        <Cup size={17} />
      </button>

      <div className="count">
        <b>{status === "ready" ? shown.toLocaleString("es-MX") : "—"}</b>
        <span>
          {status === "ready" && shown !== total ? `DE ${total.toLocaleString("es-MX")} ` : ""}
          {label}
        </span>
      </div>
    </header>
  );
}
