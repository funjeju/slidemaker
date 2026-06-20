"use client";
import type PptxGenJS from "pptxgenjs";
import type { Deck, SlideIR, SemanticType } from "@/engine/types";
import type { Theme } from "@/engine/themes";
import { resolveLayout } from "@/engine/layoutMap";
import {
  paletteFromTheme,
  fontsFromTheme,
  softShadow,
  tinyShadow,
  type Palette,
  type Fonts,
} from "@/lib/pptxDesign";

// Native (editable) .pptx export. Each slide's IR + theme is re-mapped to
// PowerPoint primitives — shapes, text, charts — styled as infographics:
// cards with soft shadows, accent bars, numbered rows, ring stats, VS
// comparison cards, vertical timelines, styled column charts. No DOM capture,
// so everything stays editable in PowerPoint/Keynote.

type Pres = PptxGenJS;
type Slide = ReturnType<PptxGenJS["addSlide"]>;

const RATIO_DIMS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 13.333, h: 7.5 },
  "4:3": { w: 10, h: 7.5 },
  "9:16": { w: 7.5, h: 13.333 },
};

interface Ctx {
  W: number;
  H: number;
  M: number; // page margin (in)
  k: number; // hero type scale (relative to 16:9)
  cw: number; // content width
  bodyTop: number; // y where content begins (below header)
  bodyH: number; // content height (above footer)
  P: Palette;
  F: Fonts;
}

function imgProp(src?: string): { data: string } | { path: string } | null {
  if (!src) return null;
  // pptxgenjs wants base64 WITHOUT the leading "data:" scheme.
  return src.startsWith("data:") ? { data: src.slice(5) } : { path: src };
}
function contentMedia(s: SlideIR) {
  return s.media?.find((m) => (m.role ?? "content") === "content");
}
function bgMedia(s: SlideIR) {
  return s.media?.find((m) => m.role === "background") ?? contentMedia(s);
}

export async function exportPptx(deck: Deck, theme: Theme): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  const { w: W, h: H } = RATIO_DIMS[deck.ratio] ?? RATIO_DIMS["16:9"];
  pptx.defineLayout({ name: "DECK", width: W, height: H });
  pptx.layout = "DECK";
  pptx.author = "Slide Maker";
  pptx.title = deck.title || "Deck";

  const P = paletteFromTheme(theme);
  const F = fontsFromTheme(theme);
  const M = W * 0.066;
  const k = W / 13.333;
  const ctx: Ctx = {
    W, H, M, k,
    cw: W - M * 2,
    bodyTop: M + 1.15 * k,
    bodyH: H - (M + 1.15 * k) - M - 0.32,
    P, F,
  };

  const total = deck.slides.length;
  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: P.bg };
    addByType(pptx, slide, s, resolveLayout(s), ctx, deck, i, total);
  });

  await pptx.writeFile({
    fileName: `${(deck.title || "deck").replace(/[\\/:*?"<>|]/g, "_")}.pptx`,
  });
}

// ---------- shared building blocks ----------

function card(pptx: Pres, slide: Slide, x: number, y: number, w: number, h: number, P: Palette, opts: { accent?: boolean; fill?: string } = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: opts.fill ?? P.card },
    line: { type: "none" },
    shadow: softShadow(),
  } as Parameters<Slide["addShape"]>[1]);
  if (opts.accent) {
    slide.addShape(pptx.ShapeType.rect, { x, y: y + 0.12, w: 0.07, h: h - 0.24, fill: { color: P.accent }, line: { type: "none" } });
  }
}

function placeholder(pptx: Pres, slide: Slide, x: number, y: number, w: number, h: number, P: Palette, F: Fonts) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: P.line }, line: { type: "none" } } as Parameters<Slide["addShape"]>[1]);
  slide.addText("이미지", { x, y, w, h, align: "center", valign: "middle", color: P.muted, fontSize: 13, fontFace: F.body });
}

function image(pptx: Pres, slide: Slide, m: { src?: string } | undefined, x: number, y: number, w: number, h: number, P: Palette, F: Fonts, rounding = false) {
  const p = imgProp(m?.src);
  if (p) slide.addImage({ ...p, x, y, w, h, sizing: { type: "cover", w, h }, rounding } as Parameters<Slide["addImage"]>[0]);
  else placeholder(pptx, slide, x, y, w, h, P, F);
}

// kicker tab + title used by content layouts
function header(pptx: Pres, slide: Slide, s: SlideIR, c: Ctx, eyebrow?: string) {
  const { M, cw, P, F, k } = c;
  const top = M * 0.92;
  slide.addShape(pptx.ShapeType.rect, { x: M, y: top, w: 0.5 * k, h: 0.1, fill: { color: P.accent }, line: { type: "none" } });
  if (eyebrow) slide.addText(eyebrow.toUpperCase(), { x: M + 0.62 * k, y: top - 0.12, w: cw - 0.7, h: 0.32, fontSize: 11, color: P.muted, charSpacing: 2, fontFace: F.body, valign: "middle" });
  slide.addText(s.title ?? "", { x: M, y: top + 0.2, w: cw, h: 0.7 * k, fontSize: 26 * Math.max(0.8, k), bold: true, color: P.ink, fontFace: F.display, margin: 0 });
}

function footer(pptx: Pres, slide: Slide, idx: number, total: number, deck: Deck, c: Ctx) {
  const { M, W, H, P, F } = c;
  slide.addText(deck.title || "", { x: M, y: H - 0.42, w: W * 0.6, h: 0.3, fontSize: 9, color: P.muted, fontFace: F.body, valign: "middle" });
  slide.addText(`${idx + 1} / ${total}`, { x: W - M - 1.2, y: H - 0.42, w: 1.2, h: 0.3, fontSize: 9, color: P.muted, fontFace: F.body, align: "right", valign: "middle" });
}

// ---------- per-type mappers ----------

function addByType(pptx: Pres, slide: Slide, s: SlideIR, type: SemanticType, c: Ctx, deck: Deck, idx: number, total: number) {
  const { W, H, M, k, cw, bodyTop, bodyH, P, F } = c;
  const contentFooter = !["cover", "section", "fullBleed"].includes(type);

  switch (type) {
    case "cover": {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: P.accent }, line: { type: "none" } });
      slide.addShape(pptx.ShapeType.rect, { x: M, y: H * 0.34, w: 0.7, h: 0.12, fill: { color: P.accent }, line: { type: "none" } });
      slide.addText(s.title ?? "", { x: M, y: H * 0.38, w: cw, h: 1.9 * k, fontSize: 46 * k, bold: true, color: P.ink, fontFace: F.display, margin: 0, lineSpacingMultiple: 1.05 });
      if (s.subtitle) slide.addText(s.subtitle, { x: M, y: H * 0.62, w: cw, h: 1.0, fontSize: 19 * k, color: P.muted, fontFace: F.body, margin: 0 });
      slide.addText((deck.title || "").toUpperCase(), { x: M, y: H - 0.7, w: cw, h: 0.3, fontSize: 10, color: P.muted, charSpacing: 2, fontFace: F.body });
      break;
    }
    case "section": {
      slide.background = { color: P.accent };
      slide.addText(String(idx + 1).padStart(2, "0"), { x: M, y: H * 0.26, w: cw, h: 1.4 * k, fontSize: 64 * k, bold: true, color: P.onAccent, fontFace: F.display, margin: 0 });
      slide.addShape(pptx.ShapeType.rect, { x: M + 0.04, y: H * 0.52, w: 0.8, h: 0.1, fill: { color: P.onAccent }, line: { type: "none" } });
      slide.addText(s.title ?? "", { x: M, y: H * 0.56, w: cw, h: 1.4 * k, fontSize: 40 * k, bold: true, color: P.onAccent, fontFace: F.display, margin: 0 });
      if (s.subtitle) slide.addText(s.subtitle, { x: M, y: H * 0.74, w: cw, h: 0.9, fontSize: 18 * k, color: P.onAccent, fontFace: F.body, margin: 0 });
      break;
    }
    case "keyMessage": {
      if (s.title) {
        slide.addShape(pptx.ShapeType.rect, { x: M, y: H * 0.26, w: 0.5, h: 0.1, fill: { color: P.accent }, line: { type: "none" } });
        slide.addText(s.title.toUpperCase(), { x: M + 0.62, y: H * 0.24, w: cw - 0.7, h: 0.36, fontSize: 13, color: P.accent, charSpacing: 2, fontFace: F.body, valign: "middle" });
      }
      slide.addText(s.body ?? "", { x: M, y: H * 0.34, w: cw, h: H * 0.4, fontSize: 34 * k, bold: true, color: P.ink, fontFace: F.display, margin: 0, valign: "top", lineSpacingMultiple: 1.12 });
      break;
    }
    case "stat": {
      const cx = W / 2;
      const D = Math.min(3.3 * k, bodyH * 0.62);
      const ringX = cx - D / 2;
      const ringY = bodyTop + 0.1;
      const ringW = Math.max(0.22, D * 0.085);
      slide.addShape(pptx.ShapeType.ellipse, { x: ringX, y: ringY, w: D, h: D, fill: { color: P.accent }, line: { type: "none" } });
      slide.addShape(pptx.ShapeType.ellipse, { x: ringX + ringW, y: ringY + ringW, w: D - ringW * 2, h: D - ringW * 2, fill: { color: P.bg }, line: { type: "none" } });
      slide.addText(s.stat?.value ?? "", { x: ringX, y: ringY, w: D, h: D, align: "center", valign: "middle", fontSize: 46 * k, bold: true, color: P.accent, fontFace: F.display, margin: 0 });
      if (s.stat?.label) slide.addText(s.stat.label, { x: M, y: ringY + D + 0.18, w: cw, h: 0.6, align: "center", fontSize: 22 * k, bold: true, color: P.ink, fontFace: F.display });
      if (s.body) slide.addText(s.body, { x: cw * 0.12 + M, y: ringY + D + 0.85, w: cw * 0.76, h: 0.9, align: "center", fontSize: 14, color: P.muted, fontFace: F.body });
      break;
    }
    case "quote": {
      slide.addShape(pptx.ShapeType.rect, { x: M, y: bodyTop + 0.15, w: 0.1, h: bodyH * 0.62, fill: { color: P.accent }, line: { type: "none" } });
      slide.addText("“", { x: M + 0.25, y: bodyTop - 0.25, w: 2, h: 1.4, fontSize: 96 * k, bold: true, color: P.accent, fontFace: F.display, margin: 0 });
      slide.addText(s.quote?.text ?? "", { x: M + 0.35, y: bodyTop + 0.7, w: cw - 0.5, h: bodyH * 0.5, fontSize: 28 * k, italic: true, color: P.ink, fontFace: F.display, margin: 0, lineSpacingMultiple: 1.2 });
      if (s.quote?.attribution) slide.addText(`— ${s.quote.attribution}`, { x: M + 0.35, y: bodyTop + bodyH * 0.5 + 0.7, w: cw - 0.5, h: 0.5, fontSize: 16, color: P.muted, fontFace: F.body });
      break;
    }
    case "bulletList": {
      header(pptx, slide, s, c);
      const items = (s.bullets ?? []).slice(0, 6);
      const n = Math.max(1, items.length);
      const rowH = Math.min(1.0, bodyH / n);
      const usedH = rowH * n;
      let y = bodyTop + (bodyH - usedH) / 2;
      items.forEach((b, i) => {
        const cy = y + rowH / 2;
        const d = Math.min(0.46, rowH * 0.6);
        slide.addShape(pptx.ShapeType.ellipse, { x: M, y: cy - d / 2, w: d, h: d, fill: { color: P.accent }, line: { type: "none" } });
        slide.addText(String(i + 1), { x: M, y: cy - d / 2, w: d, h: d, align: "center", valign: "middle", fontSize: 13 * k, bold: true, color: P.onAccent, fontFace: F.display });
        slide.addText(b, { x: M + d + 0.28, y, w: cw - d - 0.3, h: rowH, valign: "middle", fontSize: 18, color: P.ink, fontFace: F.body, margin: 0 });
        if (i < items.length - 1) slide.addShape(pptx.ShapeType.line, { x: M + d + 0.28, y: y + rowH, w: cw - d - 0.3, h: 0, line: { color: P.line, width: 0.75 } });
        y += rowH;
      });
      break;
    }
    case "twoColumn": {
      header(pptx, slide, s, c);
      const colW = cw * 0.52 - 0.2;
      const imgX = M + cw * 0.54;
      const imgW = cw * 0.46;
      if (s.body) slide.addText(s.body, { x: M, y: bodyTop, w: colW, h: bodyH, fontSize: 18, color: P.ink, fontFace: F.body, valign: "top", margin: 0, lineSpacingMultiple: 1.3 });
      else if (s.bullets) slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022" }, color: P.ink, fontSize: 16, fontFace: F.body, paraSpaceAfter: 10, breakLine: true } })), { x: M, y: bodyTop, w: colW, h: bodyH, valign: "top" });
      const ih = Math.min(bodyH, imgW * 0.7);
      image(pptx, slide, contentMedia(s), imgX, bodyTop + (bodyH - ih) / 2, imgW, ih, P, F, true);
      break;
    }
    case "comparison": {
      header(pptx, slide, s, c);
      const gap = 0.4;
      const bw = (cw - gap) / 2;
      const by = bodyTop;
      const bh = bodyH;
      const drawSide = (sd: { title: string; points: string[] } | undefined, x: number) => {
        card(pptx, slide, x, by, bw, bh, P);
        slide.addShape(pptx.ShapeType.roundRect, { x, y: by, w: bw, h: 0.7, rectRadius: 0.09, fill: { color: P.accent }, line: { type: "none" } } as Parameters<Slide["addShape"]>[1]);
        slide.addShape(pptx.ShapeType.rect, { x, y: by + 0.35, w: bw, h: 0.35, fill: { color: P.accent }, line: { type: "none" } });
        slide.addText(sd?.title ?? "", { x: x + 0.3, y: by, w: bw - 0.6, h: 0.7, valign: "middle", fontSize: 18, bold: true, color: P.onAccent, fontFace: F.display, margin: 0 });
        slide.addText((sd?.points ?? []).map((p) => ({ text: p, options: { bullet: { code: "2022" }, fontSize: 15, color: P.ink, fontFace: F.body, paraSpaceAfter: 9, breakLine: true } })), { x: x + 0.34, y: by + 0.95, w: bw - 0.64, h: bh - 1.2, valign: "top" });
      };
      drawSide(s.comparison?.left, M);
      drawSide(s.comparison?.right, M + bw + gap);
      // VS badge
      const vd = 0.7;
      slide.addShape(pptx.ShapeType.ellipse, { x: W / 2 - vd / 2, y: by + bh / 2 - vd / 2, w: vd, h: vd, fill: { color: P.bg }, line: { color: P.accent, width: 2 }, shadow: tinyShadow() } as Parameters<Slide["addShape"]>[1]);
      slide.addText("VS", { x: W / 2 - vd / 2, y: by + bh / 2 - vd / 2, w: vd, h: vd, align: "center", valign: "middle", fontSize: 14, bold: true, color: P.accent, fontFace: F.display });
      break;
    }
    case "timeline": {
      header(pptx, slide, s, c);
      const items = (s.timeline ?? []).slice(0, 6);
      const n = Math.max(1, items.length);
      const lineX = M + 0.28;
      const rowH = bodyH / n;
      slide.addShape(pptx.ShapeType.line, { x: lineX, y: bodyTop + rowH * 0.5, w: 0, h: rowH * (n - 1), line: { color: P.line, width: 1.5 } });
      items.forEach((it, i) => {
        const cy = bodyTop + rowH * i + rowH * 0.5;
        const d = 0.34;
        slide.addShape(pptx.ShapeType.ellipse, { x: lineX - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: P.accent }, line: { color: P.bg, width: 2 } });
        slide.addText(it.time, { x: lineX + 0.5, y: cy - rowH * 0.42, w: cw - 0.6, h: 0.34, fontSize: 15 * k, bold: true, color: P.accent, fontFace: F.display, margin: 0, valign: "middle" });
        slide.addText(it.text, { x: lineX + 0.5, y: cy - 0.02, w: cw - 0.6, h: rowH * 0.42, fontSize: 15, color: P.ink, fontFace: F.body, margin: 0, valign: "top" });
      });
      break;
    }
    case "fullBleed": {
      image(pptx, slide, bgMedia(s), 0, 0, W, H, P, F, false);
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: H * 0.5, w: W, h: H * 0.5, fill: { color: "000000", transparency: 30 }, line: { type: "none" } });
      if (s.title) slide.addText(s.title, { x: M, y: H * 0.66, w: cw, h: 1.0 * k, fontSize: 34 * k, bold: true, color: "FFFFFF", fontFace: F.display, margin: 0 });
      if (s.body) slide.addText(s.body, { x: M, y: H * 0.82, w: cw, h: 0.9, fontSize: 17 * k, color: "FFFFFF", fontFace: F.body, margin: 0 });
      break;
    }
    case "chart": {
      header(pptx, slide, s, c);
      const data = s.chartData ?? [];
      slide.addChart(pptx.ChartType.bar, [{ name: s.title ?? "", labels: data.map((d) => d.label), values: data.map((d) => d.value) }], {
        x: M, y: bodyTop, w: cw, h: bodyH,
        barDir: "col", barGapWidthPct: 55,
        chartColors: [P.accent],
        valGridLine: { color: P.line, size: 0.5 },
        catGridLine: { style: "none" },
        catAxisLabelColor: P.muted, catAxisLabelFontFace: F.body, catAxisLabelFontSize: 12,
        valAxisLabelColor: P.muted, valAxisLabelFontFace: F.body, valAxisLabelFontSize: 11,
        valAxisHidden: false, valAxisLineShow: false, catAxisLineShow: true,
        showValue: true, dataLabelPosition: "outEnd", dataLabelColor: P.ink, dataLabelFontFace: F.body, dataLabelFontSize: 12, dataLabelFontBold: true,
        showLegend: false, showTitle: false,
      });
      break;
    }
    case "imageGrid": {
      header(pptx, slide, s, c);
      const imgs = (s.media ?? []).filter((m) => (m.role ?? "content") === "content").slice(0, 4);
      const cols = imgs.length > 2 ? 2 : Math.max(1, imgs.length);
      const rows = Math.ceil(Math.max(1, imgs.length) / cols);
      const gap = 0.25;
      const iw = (cw - gap * (cols - 1)) / cols;
      const ih = (bodyH - gap * (rows - 1)) / rows;
      if (!imgs.length) placeholder(pptx, slide, M, bodyTop, cw, bodyH, P, F);
      imgs.forEach((m, i) => {
        const x = M + (i % cols) * (iw + gap);
        const y = bodyTop + Math.floor(i / cols) * (ih + gap);
        image(pptx, slide, m, x, y, iw, ih, P, F, true);
      });
      break;
    }
    default: {
      slide.addText(s.title ?? s.body ?? "", { x: M, y: H * 0.4, w: cw, h: 1.5, fontSize: 26, color: P.ink, fontFace: F.display });
    }
  }

  if (contentFooter) footer(pptx, slide, idx, total, deck, c);
}
