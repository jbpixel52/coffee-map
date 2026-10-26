/**
 * Stacked list (21st.dev anatomy): rows with a profile picture, name, handle and
 * a trailing figure; the stack lifts the selected row instead of adding borders.
 *
 * Avatars are drawn, not fetched: the pipeline archives handles and follower
 * counts, never profile pictures, and an Instagram CDN URL would expire.
 */
import React from "react";
import { Chevron } from "./Icons";

export interface ListShop {
  id: number;
  name: string;
  handle: string | null;
  followers: number | null;
}

interface Props {
  shops: ListShop[];
  selected: string | null;
  onSelect: (name: string) => void;
  emptyNote?: React.ReactNode;
}

/** Deterministic Pantone accent per shop, with a text colour that clears 4.5:1. */
const ACCENTS: Array<[string, string]> = [
  ["#3ab0a2", "#06231f"], // Waterfall
  ["#00539c", "#eaf2fb"], // Princess Blue
  ["#a4ae77", "#23260f"], // Tarragon
  ["#c3a6cd", "#2a1f33"], // Lavender Oil
  ["#bc8d1f", "#1e1704"], // Arrowwood
  ["#f37e9b", "#33101a"], // Rosy Future
  ["#9b1b30", "#fdeef0"], // Chili Pepper
  ["#c9d77e", "#232a10"], // Daiquiri Green
];

export function avatarFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-MX"));

export default function StackedList({ shops, selected, onSelect, emptyNote }: Props) {
  if (shops.length === 0) return <p className="list-empty">{emptyNote}</p>;
  return (
    <ul className="stack" role="list">
      {shops.map((s) => {
        const [bg, fg] = avatarFor(s.handle ?? s.name);
        const initial = (s.name.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
        return (
          <li key={s.id}>
            <button
              type="button"
              className={`stack-row${selected === s.name ? " on" : ""}`}
              onClick={() => onSelect(s.name)}
              aria-current={selected === s.name ? "true" : undefined}
            >
              <span className="avatar" style={{ background: bg, color: fg }} aria-hidden="true">
                {initial}
                {s.handle && (
                  <svg className="avatar-badge" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5.5" fill="currentColor" opacity="0.16" />
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
                  </svg>
                )}
              </span>
              <span className="stack-body">
                <span className="stack-name">{s.name}</span>
                <span className="stack-handle">{s.handle ? `@${s.handle}` : "sin Instagram"}</span>
              </span>
              <span className="stack-fig">{fmt(s.followers)}</span>
              <Chevron />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
