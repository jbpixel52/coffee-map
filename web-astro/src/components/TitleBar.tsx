/** Transparent title bar: the city name, gooey-morphed, over the map. */
import React from "react";
import GooeyText from "./GooeyText";

interface Props {
  cities: string[];
  shown: number;
  total: number;
  status: "loading" | "ready" | "error";
}

export default function TitleBar({ cities, shown, total, status }: Props) {
  return (
    <header className="titlebar">
      <GooeyText texts={cities} className="city" morphTime={0.7} cooldownTime={4.2} />
      <p className="titlebar-sub">
        {status === "ready" ? (
          <>
            <b>{shown.toLocaleString("es-MX")}</b> de {total.toLocaleString("es-MX")} cafés en el mapa
          </>
        ) : status === "error" ? (
          "sin datos"
        ) : (
          "cargando…"
        )}
      </p>
    </header>
  );
}
