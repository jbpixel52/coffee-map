/** Dropdown menu listing every café, filterable; select flies to + opens the card.
 *
 * Plain HTML on purpose: this overlay is positioned by `global.css`
 * (`.shop-dd`, fixed top-right). A Tamagui `YStack` here injects inline
 * `display`/`position` styles that override the stylesheet, which left the
 * panel visible and clipped off-screen when "closed".
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { filterShopNames } from "../lib/filter";

interface Props {
  open: boolean;
  names: string[];
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function ShopMenu({ open, names, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current && t && !rootRef.current.contains(t)) onClose();
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, onClose]);

  const shown = useMemo(() => filterShopNames(names, filter), [names, filter]);

  if (!open) return null;

  return (
    <div ref={rootRef} className="shop-dd">
      <input
        className="shop-dd-search"
        type="search"
        placeholder="Filtrar lista…"
        autoComplete="off"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filtrar lista"
      />
      <ul id="shop-dd-list">
        {shown.map((name) => (
          <li key={name} className="shop-dd-item" onClick={() => onSelect(name)}>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
