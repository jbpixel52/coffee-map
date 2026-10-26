/** Settings tab: night mode and the heatmap, as switch rows. */
import React from "react";
import { Close, Moon } from "./Icons";

interface Props {
  night: boolean;
  onNight: () => void;
  heat: boolean;
  onHeat: () => void;
  onClose: () => void;
  generated: string;
}

function Switch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? " on" : ""}`}
      onClick={onChange}
    >
      <span className="knob" />
    </button>
  );
}

export default function SettingsPanel({ night, onNight, heat, onHeat, onClose, generated }: Props) {
  return (
    <section className="panel" id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
      <header className="panel-head">
        <h2>Ajustes</h2>
        <span className="panel-count">{generated ? `datos · ${generated}` : ""}</span>
        <button type="button" className="icon-btn ghost" onClick={onClose} aria-label="Cerrar ajustes">
          <Close />
        </button>
      </header>

      <div className="panel-body">
        <div className="setting">
          <span className="setting-icon night" aria-hidden="true">
            <Moon />
          </span>
          <span className="setting-text">
            <b>Modo noche</b>
            <span>Hoja y paneles invertidos</span>
          </span>
          <Switch id="set-night" checked={night} onChange={onNight} label="Modo noche" />
        </div>

        <div className="setting">
          <span className="setting-icon heat" aria-hidden="true">
            🔥
          </span>
          <span className="setting-text">
            <b>Mapa de calor</b>
            <span>Densidad por seguidores de Instagram</span>
          </span>
          <Switch id="set-heat" checked={heat} onChange={onHeat} label="Mapa de calor" />
        </div>

        <p className="setting-note">
          Los cafés sin Instagram se ven en gris; los que sí, en verde agua. Filtrar los atenúa, nunca
          los esconde.
        </p>
      </div>
    </section>
  );
}
