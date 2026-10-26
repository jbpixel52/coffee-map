/**
 * Gooey text morph — two stacked spans, one rAF loop: the outgoing layer blurs
 * out while the incoming one blurs in, so the pair reads as one fluid shape.
 *
 * The 21st.dev build applies an SVG alpha-threshold filter; that needs an opaque
 * ground (the threshold crushes anti-aliased alpha to nothing on a transparent
 * one, which is what a background-less title bar has). Blur does the same job
 * here and survives both grounds.
 */
import React, { useEffect, useRef, useState } from "react";

interface Props {
  texts: string[];
  /** seconds one morph takes */
  morphTime?: number;
  /** seconds held before the next morph */
  cooldownTime?: number;
  className?: string;
}

export default function GooeyText({ texts, morphTime = 1, cooldownTime = 1.6, className }: Props) {
  const [index, setIndex] = useState(0);
  const layerA = useRef<HTMLSpanElement | null>(null);
  const layerB = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const list = texts.length ? texts : [""];
  const current = list[index % list.length];
  const next = list[(index + 1) % list.length];

  useEffect(() => {
    if (list.length < 2) return;
    let raf = 0;
    let start = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      timer.current = window.setInterval(() => setIndex((i) => (i + 1) % list.length), 4000);
      return () => window.clearInterval(timer.current);
    }

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      // one morph, then a hold, then swap and start again
      const t = Math.min(1, Math.max(0, (elapsed % (morphTime + cooldownTime)) / morphTime));
      const eased = t * t * (3 - 2 * t);
      if (layerA.current) {
        layerA.current.style.opacity = String(1 - eased);
        layerA.current.style.filter = eased > 0.02 ? `blur(${(eased * 5).toFixed(2)}px)` : "none";
      }
      if (layerB.current) {
        layerB.current.style.opacity = String(eased);
        layerB.current.style.filter = eased < 0.98 ? `blur(${((1 - eased) * 5).toFixed(2)}px)` : "none";
      }
      if (elapsed >= morphTime + cooldownTime) {
        start = now;
        setIndex((i) => (i + 1) % list.length);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length, morphTime, cooldownTime]);

  return (
    <span className={`gooey ${className ?? ""}`}>
      <span className="gooey-track" aria-hidden="true">
        <span className="gooey-layer" ref={layerA}>
          {current}
        </span>
        <span className="gooey-layer" ref={layerB} style={{ opacity: 0 }}>
          {next}
        </span>
      </span>
      {/* the readable copy, for screen readers and search */}
      <span className="sr-only">{current}</span>
    </span>
  );
}
