"use client";
import React, { useRef, useState, useEffect } from "react";
import type { SlideIR, Ratio } from "@/engine/types";
import { RATIO_SIZES } from "@/engine/types";
import type { Theme } from "@/engine/themes";
import { resolveLayout } from "@/engine/layoutMap";
import { LAYOUTS } from "@/layouts";

// Renders a single slide. `respectType` (default false) lets the editor force a
// user-chosen layout without the auto fallback. `ratio` picks the canvas size.
export default function SlideRenderer({
  slide,
  theme,
  ratio = "16:9",
  respectType = false,
}: {
  slide: SlideIR;
  theme: Theme;
  ratio?: Ratio;
  respectType?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const size = RATIO_SIZES[ratio] ?? RATIO_SIZES["16:9"];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / size.w);
    });
    ro.observe(el);
    setScale(el.clientWidth / size.w);
    return () => ro.disconnect();
  }, [size.w]);

  const type = respectType ? slide.type : resolveLayout(slide);
  const Layout = LAYOUTS[type] ?? LAYOUTS.keyMessage;

  return (
    <div
      ref={wrapRef}
      style={{ width: "100%", aspectRatio: `${size.w} / ${size.h}`, position: "relative" }}
    >
      <div
        style={{
          width: size.w,
          height: size.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <Layout slide={slide} theme={theme} size={size} />
      </div>
    </div>
  );
}
