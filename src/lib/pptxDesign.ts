import type { Theme } from "@/engine/themes";

// Design-system primitives shared by the PPTX exporter. Keeps color math,
// typographic scale and shape helpers in one place so the mappers in
// exportPptx.ts stay declarative. Follows pptxgenjs best practices:
//  - 6-char hex, never '#', never 8-char alpha (use transparency/opacity props)
//  - fresh option objects per call (the lib mutates them in place)

// ---- color ----
export function hex(c: string, fallback = "888888"): string {
  const m = c.match(/^#?([0-9a-fA-F]{6})$/);
  return m ? m[1].toUpperCase() : fallback;
}
function rgb(h: string): [number, number, number] {
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return (c(r) + c(g) + c(b)).toUpperCase();
}
// mix toward white (t>0) or black (t<0); t in [-1,1]
export function tint(h: string, t: number): string {
  const [r, g, b] = rgb(h);
  const target = t >= 0 ? 255 : 0;
  const a = Math.abs(t);
  return toHex(r + (target - r) * a, g + (target - g) * a, b + (target - b) * a);
}
// luminance-based readable foreground (black/white) over a fill
export function onColor(h: string): string {
  const [r, g, b] = rgb(h);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "1A1A1A" : "FFFFFF";
}

// First quoted family in a CSS stack, e.g. '"Pretendard", ...' -> Pretendard.
export function face(stack: string): string {
  const m = stack.match(/"([^"]+)"/);
  return m ? m[1] : "Malgun Gothic";
}

export interface Palette {
  bg: string;
  card: string; // surface for cards / panels
  ink: string; // primary text
  muted: string; // secondary text
  accent: string;
  accent2: string; // lighter accent (chart series, secondary)
  accent3: string;
  onAccent: string; // text over accent
  line: string; // hairline / grid color
  chart: string[]; // chart series palette
}

export function paletteFromTheme(t: Theme): Palette {
  const accent = hex(t.accent, "1D9E75");
  const ink = hex(t.text, "1C1C1A");
  const bg = hex(t.bg, "FFFFFF");
  return {
    bg,
    card: hex(t.surface, "F5F5F4"),
    ink,
    muted: hex(t.textMuted, "6B6A64"),
    accent,
    accent2: tint(accent, 0.34),
    accent3: tint(accent, 0.6),
    onAccent: hex(t.accentText, onColor(accent)),
    line: tint(ink, 0.82),
    chart: [accent, tint(accent, 0.34), tint(accent, 0.58), tint(accent, 0.74)],
  };
}

export interface Fonts {
  display: string;
  body: string;
}
export function fontsFromTheme(t: Theme): Fonts {
  return { display: face(t.fontDisplay), body: face(t.fontBody) };
}

// fresh shadow each call (never share — pptxgenjs mutates option objects)
export const softShadow = () => ({ type: "outer" as const, color: "000000", blur: 9, offset: 3, angle: 90, opacity: 0.12 });
export const tinyShadow = () => ({ type: "outer" as const, color: "000000", blur: 5, offset: 2, angle: 90, opacity: 0.1 });
