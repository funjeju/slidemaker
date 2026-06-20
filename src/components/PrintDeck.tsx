"use client";
import React from "react";
import type { Deck } from "@/engine/types";
import { RATIO_SIZES } from "@/engine/types";
import type { Theme } from "@/engine/themes";
import { resolveLayout } from "@/engine/layoutMap";
import { LAYOUTS } from "@/layouts";

// Off-screen render of every slide at native pixel size. Hidden on screen
// (.print-root) and revealed only for printing, where each .print-slide maps
// 1:1 to a page (see @media print in globals.css). One slide per page, exact
// ratio — "Save as PDF" in the browser print dialog produces the PDF.
export default function PrintDeck({ deck, theme }: { deck: Deck; theme: Theme }) {
  const size = RATIO_SIZES[deck.ratio] ?? RATIO_SIZES["16:9"];
  return (
    <div className="print-root" aria-hidden>
      {deck.slides.map((s, i) => {
        const type = resolveLayout(s);
        const Layout = LAYOUTS[type] ?? LAYOUTS.keyMessage;
        const showFooter = !["cover", "section", "fullBleed"].includes(type);
        return (
          <div className="print-slide" key={s.id} style={{ width: size.w, height: size.h, position: "relative" }}>
            <Layout slide={s} theme={theme} size={size} />
            {showFooter && (
              <div style={{ position: "absolute", right: 64, bottom: 34, fontSize: 18, letterSpacing: 1, color: theme.textMuted, fontFamily: theme.fontBody }}>
                {i + 1} / {deck.slides.length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Inject an @page rule matching the slide size, then open the print dialog.
export function printDeck(deck: Deck) {
  const size = RATIO_SIZES[deck.ratio] ?? RATIO_SIZES["16:9"];
  const STYLE_ID = "deck-print-page-size";
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = `@page { size: ${size.w}px ${size.h}px; margin: 0; }`;
  window.print();
}
