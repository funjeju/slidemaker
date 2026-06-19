"use client";
import React, { useRef, useState, useEffect } from "react";
import type { SlideIR } from "@/engine/types";
import type { Theme } from "@/engine/themes";
import { resolveLayout } from "@/engine/layoutMap";
import { LAYOUTS } from "@/layouts";

const BASE_W = 1280;
const BASE_H = 720;

// Renders a single slide. `respectType` (default false) lets the editor force a
// user-chosen layout without the auto fallback.
export default function SlideRenderer({
  slide,
  theme,
  respectType = false,
}: {
  slide: SlideIR;
  theme: Theme;
  respectType?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / BASE_W);
    });
    ro.observe(el);
    setScale(el.clientWidth / BASE_W);
    return () => ro.disconnect();
  }, []);

  const type = respectType ? slide.type : resolveLayout(slide);
  const Layout = LAYOUTS[type] ?? LAYOUTS.keyMessage;

  return (
    <div
      ref={wrapRef}
      style={{ width: "100%", aspectRatio: `${BASE_W} / ${BASE_H}`, position: "relative" }}
    >
      <div
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <Layout slide={slide} theme={theme} />
      </div>
    </div>
  );
}
