/** The ficha: a paper slip pinned to the sign board — the one place you decide. */
import React from "react";
import {
  gmapsSearchUrl,
  instagramEmbedUrl,
  tiktokSearchUrl,
  tiktokTagSlug,
} from "../lib/popup";
import { foldName } from "../lib/filter";
import type { ShopDetails } from "../lib/details";
import { Close, Out } from "./Icons";

interface Props {
  details: ShopDetails | null;
  onClose: () => void;
}

export default function Ficha({ details, onClose }: Props) {
  if (!details) return null;
  const { name, handle, followers, code, fullName, lat, lon } = details;
  const embed = instagramEmbedUrl(code);
  const tag = tiktokTagSlug(name);
  const showFullName = Boolean(fullName) && foldName(fullName!) !== foldName(name);

  return (
    <div className="slip">
        <div className="slip-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{name}</h3>
            {showFullName && <div className="handle muted">{fullName}</div>}
            {handle ? (
              <div className="handle">@{handle}</div>
            ) : (
              <div className="handle muted">sin Instagram conocido</div>
            )}
          </div>
          <button type="button" className="icon-btn ghost" onClick={onClose} aria-label="Cerrar ficha">
            <Close />
          </button>
        </div>

        <div className="figs">
          <div>
            <b>{followers ? followers.toLocaleString("es-MX") : "—"}</b>
            <span>Seguidores</span>
          </div>
          <div>
            <b>{lat != null && lon != null ? `${lat.toFixed(3)}, ${lon.toFixed(3)}` : "—"}</b>
            <span>Coordenadas</span>
          </div>
        </div>

        {embed ? (
          <iframe
            className="embed"
            src={embed}
            loading="lazy"
            allowFullScreen
            scrolling="no"
            title={`Último post de ${name} en Instagram`}
          />
        ) : (
          <p className="no-ig">
            {handle
              ? "Este café no tiene un post reciente archivado. Abre su perfil para ver qué publica."
              : "Este café salió del censo de OpenStreetMap o Google Maps; no tiene Instagram vinculado."}
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
              Instagram <Out />
            </a>
          )}
          <a href={gmapsSearchUrl(name, lat, lon)} target="_blank" rel="noopener">
            Google Maps <Out />
          </a>
          <a href={tiktokSearchUrl(name)} target="_blank" rel="noopener" title={`#${tag} en TikTok`}>
            TikTok #{tag}
          </a>
        </div>

        <div className="credit">© OpenStreetMap ODbL · Google Maps · Instagram</div>
    </div>
  );
}
