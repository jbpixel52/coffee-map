/** Drawn icon set — one stroke weight, one box, no glyphs borrowed from fonts. */
import React from "react";

interface Props {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function Cup({ size = 22 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 8h12v6a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 4v2M12 3v3" />
      <path d="M3 22h14" />
    </svg>
  );
}

export function Search({ size = 16 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  );
}

export function Sun({ size = 17 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  );
}

export function Flame({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 22a6 6 0 0 0 6-6c0-4-3-5-3-9 0 0-4 2-4 6 0 0-2-1-2-3 0 0-3 3-3 6a6 6 0 0 0 6 6Z" />
    </svg>
  );
}

export function Close({ size = 17 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function Back({ size = 17 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function Out({ size = 13 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M8 16 16 8M9 8h7v7" />
    </svg>
  );
}

export function Moon({ size = 17 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function Gear({ size = 17 }: Props) {
  // A cog: toothed outline plus a bore. A circle with radial spokes reads as a sun.
  return (
    <svg {...base(size)}>
      <path d="M12 2.6l1.9 2.1 2.8-.6.6 2.8 2.1 1.9-1.3 2.5 1.3 2.5-2.1 1.9-.6 2.8-2.8-.6L12 20.4l-1.9-2.1-2.8.6-.6-2.8-2.1-1.9 1.3-2.5-1.3-2.5 2.1-1.9.6-2.8 2.8.6z" />
      <circle cx="12" cy="11.5" r="2.9" />
    </svg>
  );
}

export function Chevron({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function Rows({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Instagram({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTok({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M14 3v10.5a3.5 3.5 0 1 1-3-3.46" />
      <path d="M14 5.5c1 1.6 2.4 2.4 4.5 2.5" />
    </svg>
  );
}

export function Pin({ size = 15 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 21s6-6.2 6-11a6 6 0 1 0-12 0c0 4.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}
