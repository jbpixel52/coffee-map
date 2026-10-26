/**
 * Expandable tabs (21st.dev anatomy, no framer-motion): icons at rest, the open
 * tab grows to show its label, a click outside collapses the bar.
 */
import React, { useEffect, useRef } from "react";

export interface TabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** badge shown next to the label when the tab is open */
  meta?: string;
}

interface Props {
  tabs: TabDef[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  ariaLabel: string;
}

export default function ExpandableTabs({ tabs, openId, onOpen, ariaLabel }: Props) {
  const root = useRef<HTMLDivElement | null>(null);

  // Collapse on an outside click. Attach on the next tick: the click that
  // opened the tab is still bubbling when this effect runs.
  useEffect(() => {
    if (!openId) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      // a click inside a panel is work, not dismissal
      if (t?.closest(".tabs, .panel")) return;
      onOpen(null);
    };
    const id = window.setTimeout(() => document.addEventListener("click", onDocClick), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", onDocClick);
    };
  }, [openId, onOpen]);

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} ref={root}>
      {tabs.map((tab) => {
        const open = tab.id === openId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={open}
            aria-expanded={open}
            aria-controls={`panel-${tab.id}`}
            className={`tab${open ? " open" : ""}`}
            onClick={() => onOpen(open ? null : tab.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const i = tabs.findIndex((t) => t.id === tab.id);
                const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
                onOpen(next.id);
                const el = root.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`);
                el?.focus();
              }
            }}
            id={`tab-${tab.id}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.meta && <span className="tab-meta">{tab.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
