/** The ficha: a paper slip pinned to the sign board — the one place you decide. */
import React from "react";
import {
  gmapsSearchUrl,
  instagramEmbedUrl,
  tiktokSearchUrl,
  tiktokTagSlug,
} from "../lib/popup";
import { foldName } from "../lib/filter";
import { format, localeFor, t, type Lang } from "../lib/i18n";
import type { ShopDetails } from "../lib/details";
import { Close, Instagram, Out, Pin, TikTok } from "./Icons";

interface Props {
  details: ShopDetails | null;
  onClose: () => void;
  lang: Lang;
}

export default function Ficha({ details, onClose, lang }: Props) {
  if (!details) return null;
  const { name, handle, followers, code, fullName, lat, lon, address, city } = details;
  const embed = instagramEmbedUrl(code);
  const tag = tiktokTagSlug(name);
  const showFullName = Boolean(fullName) && foldName(fullName!) !== foldName(name);
  const addressLine = address || [t(lang, "noAddress"), city].filter(Boolean).join(" · ");

  return (
    <div className="slip">
        <div className="slip-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{name}</h3>
            {showFullName && <div className="handle muted">{fullName}</div>}
            {handle ? (
              <div className="handle">@{handle}</div>
            ) : (
              <div className="handle muted">{t(lang, "instagramUnknown")}</div>
            )}
          </div>
          <button
            type="button"
            className="icon-btn ghost"
            onClick={onClose}
            aria-label={t(lang, "closeCardAria")}
          >
            <Close />
          </button>
        </div>

        <div className="figs">
          <div>
            <b>{followers ? followers.toLocaleString(localeFor(lang)) : "—"}</b>
            <span>{t(lang, "followers")}</span>
          </div>
          <div>
            <b className="addr">
              <a
                href={gmapsSearchUrl(name, lat, lon)}
                target="_blank"
                rel="noopener"
                aria-label={`${t(lang, "googleMaps")}: ${addressLine}`}
              >
                <Pin size={13} />
                <span className="addr-text">{addressLine}</span>
              </a>
            </b>
            <span>{t(lang, "address")}</span>
          </div>
        </div>

        {embed ? (
          <iframe
            className="embed"
            src={embed}
            loading="lazy"
            allowFullScreen
            scrolling="no"
            title={format(t(lang, "latestPostTitle"), { name })}
          />
        ) : (
          <p className="no-ig">
            {handle ? t(lang, "noRecentPost") : t(lang, "noInstagramLinked")}
          </p>
        )}

        <div className="actions">
          {handle && (
            <a
              className="pri"
              href={`https://www.instagram.com/${encodeURIComponent(handle)}/`}
              target="_blank"
              rel="noopener"
            >
              <Instagram /> <span className="lbl">{t(lang, "instagram")}</span>
            </a>
          )}
          <a href={gmapsSearchUrl(name, lat, lon)} target="_blank" rel="noopener">
            <span className="lbl">{t(lang, "googleMaps")}</span> <Out />
          </a>
          <a
            href={tiktokSearchUrl(name)}
            target="_blank"
            rel="noopener"
            title={format(t(lang, "tiktokTitle"), { tag })}
          >
            <TikTok /> <span className="lbl">TikTok #{tag}</span>
          </a>
        </div>

        <div className="credit">© OpenStreetMap ODbL · Google Maps · Instagram</div>
    </div>
  );
}
