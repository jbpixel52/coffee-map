/** Settings tab: night mode, the heatmap, and the language, as switch rows. */
import React from "react";
import { Close, Moon } from "./Icons";
import { t, type Lang } from "../lib/i18n";

interface Props {
  night: boolean;
  onNight: () => void;
  heat: boolean;
  onHeat: () => void;
  onClose: () => void;
  generated: string;
  lang: Lang;
  onLang: (lang: Lang) => void;
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

export default function SettingsPanel({
  night,
  onNight,
  heat,
  onHeat,
  onClose,
  generated,
  lang,
  onLang,
}: Props) {
  const languageName = t(lang, lang === "es" ? "languageDescSpanish" : "languageDescEnglish");
  return (
    <section className="panel" id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
      <header className="panel-head">
        <h2>{t(lang, "settingsTab")}</h2>
        <span className="panel-count">
          {generated ? `${t(lang, "dataShort")} · ${generated}` : ""}
        </span>
        <button
          type="button"
          className="icon-btn ghost"
          onClick={onClose}
          aria-label={t(lang, "closeSettingsAria")}
        >
          <Close />
        </button>
      </header>

      <div className="panel-body">
        <div className="setting">
          <span className="setting-icon night" aria-hidden="true">
            <Moon />
          </span>
          <span className="setting-text">
            <b>{t(lang, "nightMode")}</b>
            <span>{t(lang, "nightDesc")}</span>
          </span>
          <Switch id="set-night" checked={night} onChange={onNight} label={t(lang, "nightMode")} />
        </div>

        <div className="setting">
          <span className="setting-icon heat" aria-hidden="true">
            🔥
          </span>
          <span className="setting-text">
            <b>{t(lang, "heatmap")}</b>
            <span>{t(lang, "heatDesc")}</span>
          </span>
          <Switch id="set-heat" checked={heat} onChange={onHeat} label={t(lang, "heatmap")} />
        </div>

        <div className="setting">
          <span className="setting-icon" aria-hidden="true">
            {lang === "es" ? "ES" : "EN"}
          </span>
          <span className="setting-text">
            <b>{t(lang, "language")}</b>
            <span>{languageName}</span>
          </span>
          <Switch
            id="set-lang"
            checked={lang === "es"}
            onChange={() => onLang(lang === "es" ? "en" : "es")}
            label={t(lang, "language")}
          />
        </div>

        <p className="setting-note">{t(lang, "settingsNote")}</p>
      </div>
    </section>
  );
}
