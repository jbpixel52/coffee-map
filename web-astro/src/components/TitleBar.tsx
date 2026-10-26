/** Transparent title bar: the city in view, as plain static type. */
import React from "react";
import { format, localeFor, t, type Lang } from "../lib/i18n";

interface Props {
  city: string;
  count: number;
  cityTotal: number;
  status: "loading" | "ready" | "error";
  lang: Lang;
}

export default function TitleBar({ city, count, cityTotal, status, lang }: Props) {
  const locale = localeFor(lang);
  return (
    <header className="titlebar">
      <span className="city">{city}</span>
      <p className="titlebar-sub">
        {status === "ready" ? (
          format(t(lang, "subtitle"), {
            n: count.toLocaleString(locale),
            city,
            m: cityTotal.toLocaleString(locale),
          })
        ) : status === "error" ? (
          t(lang, "titleNoData")
        ) : (
          t(lang, "loadingBody")
        )}
      </p>
    </header>
  );
}
