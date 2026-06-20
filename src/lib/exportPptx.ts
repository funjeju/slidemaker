"use client";
import type PptxGenJS from "pptxgenjs";
import type { Deck, SlideIR, SemanticType } from "@/engine/types";
import type { Theme } from "@/engine/themes";
import { resolveLayout } from "@/engine/layoutMap";

// Export a deck to a native (editable) .pptx. Instead of screenshotting the DOM
// we re-map each slide's IR + theme to PowerPoint primitives — text boxes,
// shapes, images, charts — so the result stays editable in PowerPoint/Keynote.
// The geometry mirrors src/layouts roughly, in inches.

type Pres = PptxGenJS;
type Slide = ReturnType<PptxGenJS["addSlide"]>;

const RATIO_DIMS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 13.333, h: 7.5 },
  "4:3": { w: 10, h: 7.5 },
  "9:16": { w: 7.5, h: 13.333 },
};

// First quoted family name in a CSS font stack, e.g. '"Pretendard", ...' -> Pretendard.
function face(stack: string): string {
  const m = stack.match(/"([^"]+)"/);
  return m ? m[1] : "Malgun Gothic";
}

// pptxgenjs wants hex without '#'. rgba values (only theme.border) fall back.
function col(c: string, fallback = "888888"): string {
  const m = c.match(/^#?([0-9a-fA-F]{6})$/);
  return m ? m[1] : fallback;
}

function imgProp(src?: string): { data: string } | { path: string } | null {
  if (!src) return null;
  return src.startsWith("data:") ? { data: src } : { path: src };
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

  const disp = face(theme.fontDisplay);
  const body = face(theme.fontBody);
  const M = W * 0.069; // page margin ~ matches the 88px pad on a 1280 canvas

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: col(theme.bg, "ffffff") };
    addByType(pptx, slide, s, resolveLayout(s), theme, { W, H, M, disp, body });
  }

  await pptx.writeFile({ fileName: `${(deck.title || "deck").replace(/[\\/:*?"<>|]/g, "_")}.pptx` });
}

interface Ctx {
  W: number;
  H: number;
  M: number;
  disp: string;
  body: string;
}

function addByType(pptx: Pres, slide: Slide, s: SlideIR, type: SemanticType, theme: Theme, c: Ctx) {
  const { W, H, M, disp, body } = c;
  const text = col(theme.text, "1c1c1a");
  const muted = col(theme.textMuted, "6b6a64");
  const accent = col(theme.accent, "1d9e75");
  const surface = col(theme.surface, "f5f5f4");
  const cw = W - M * 2; // content width

  const placeholder = (x: number, y: number, w: number, h: number) => {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: "DDDDDD" }, line: { color: "CCCCCC", width: 1 } });
    slide.addText("이미지", { x, y, w, h, align: "center", valign: "middle", color: "888888", fontSize: 14, fontFace: body });
  };
  const image = (m: { src?: string } | undefined, x: number, y: number, w: number, h: number, rounding = true) => {
    const p = imgProp(m?.src);
    if (p) slide.addImage({ ...p, x, y, w, h, sizing: { type: "cover", w, h }, rounding } as Parameters<Slide["addImage"]>[0]);
    else placeholder(x, y, w, h);
  };

  switch (type) {
    case "cover": {
      slide.addShape(pptx.ShapeType.rect, { x: M, y: H * 0.36, w: 0.67, h: 0.08, fill: { color: accent } });
      slide.addText(s.title ?? "", { x: M, y: H * 0.4, w: cw, h: 1.6, fontSize: 44, bold: true, color: text, fontFace: disp });
      if (s.subtitle) slide.addText(s.subtitle, { x: M, y: H * 0.62, w: cw, h: 0.9, fontSize: 20, color: muted, fontFace: body });
      break;
    }
    case "section": {
      slide.background = { color: accent };
      slide.addText("SECTION", { x: M, y: H * 0.34, w: cw, h: 0.5, fontSize: 14, color: col(theme.accentText, "ffffff"), charSpacing: 3, fontFace: body });
      slide.addText(s.title ?? "", { x: M, y: H * 0.42, w: cw, h: 1.4, fontSize: 40, bold: true, color: col(theme.accentText, "ffffff"), fontFace: disp });
      if (s.subtitle) slide.addText(s.subtitle, { x: M, y: H * 0.62, w: cw, h: 0.9, fontSize: 20, color: col(theme.accentText, "ffffff"), fontFace: body });
      break;
    }
    case "keyMessage": {
      if (s.title) slide.addText(s.title, { x: M, y: H * 0.3, w: cw, h: 0.5, fontSize: 16, color: accent, fontFace: body });
      slide.addText(s.body ?? "", { x: M, y: H * 0.36, w: cw, h: H * 0.4, fontSize: 34, bold: true, color: text, fontFace: disp, valign: "top" });
      break;
    }
    case "stat": {
      slide.addText(s.stat?.value ?? "", { x: 0, y: H * 0.22, w: W, h: H * 0.4, align: "center", fontSize: 110, bold: true, color: accent, fontFace: disp });
      if (s.stat?.label) slide.addText(s.stat.label, { x: 0, y: H * 0.62, w: W, h: 0.7, align: "center", fontSize: 22, color: text, fontFace: body });
      if (s.body) slide.addText(s.body, { x: M, y: H * 0.72, w: cw, h: 0.9, align: "center", fontSize: 16, color: muted, fontFace: body });
      break;
    }
    case "quote": {
      slide.addText("“", { x: M, y: H * 0.2, w: 1.5, h: 1.2, fontSize: 90, color: accent, fontFace: disp });
      slide.addText(s.quote?.text ?? "", { x: M, y: H * 0.36, w: cw, h: H * 0.35, fontSize: 30, italic: true, color: text, fontFace: disp });
      if (s.quote?.attribution) slide.addText(`— ${s.quote.attribution}`, { x: M, y: H * 0.72, w: cw, h: 0.6, fontSize: 18, color: muted, fontFace: body });
      break;
    }
    case "bulletList": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const items = (s.bullets ?? []).map((b) => ({ text: b, options: { bullet: { code: "2014" }, color: text, fontSize: 20, fontFace: body, paraSpaceAfter: 10 } }));
      slide.addText(items.length ? items : [{ text: "" }], { x: M, y: H * 0.34, w: cw, h: H * 0.55, valign: "top" });
      break;
    }
    case "twoColumn": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const colW = cw * 0.5 - 0.2;
      const y = H * 0.32;
      if (s.body) slide.addText(s.body, { x: M, y, w: colW, h: H * 0.5, fontSize: 18, color: text, fontFace: body, valign: "top" });
      else if (s.bullets) slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true, fontSize: 16, color: text, fontFace: body, paraSpaceAfter: 8 } })), { x: M, y, w: colW, h: H * 0.5, valign: "top" });
      image(contentMedia(s), M + cw * 0.54, y, cw * 0.46, H * 0.45);
      break;
    }
    case "comparison": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const y = H * 0.34;
      const bh = H * 0.5;
      const bw = cw * 0.5 - 0.15;
      const side = (sd: { title: string; points: string[] } | undefined, x: number) => {
        slide.addShape(pptx.ShapeType.roundRect, { x, y, w: bw, h: bh, fill: { color: surface }, line: { type: "none" }, rectRadius: 0.1 } as Parameters<Slide["addShape"]>[1]);
        slide.addText(sd?.title ?? "", { x: x + 0.3, y: y + 0.25, w: bw - 0.6, h: 0.6, fontSize: 20, bold: true, color: accent, fontFace: disp });
        slide.addText((sd?.points ?? []).map((p) => ({ text: p, options: { bullet: true, fontSize: 15, color: text, fontFace: body, paraSpaceAfter: 6 } })), { x: x + 0.3, y: y + 0.9, w: bw - 0.6, h: bh - 1.1, valign: "top" });
      };
      side(s.comparison?.left, M);
      side(s.comparison?.right, M + cw * 0.5 + 0.15);
      break;
    }
    case "timeline": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const items = s.timeline ?? [];
      let y = H * 0.34;
      const rh = Math.min(0.7, (H * 0.55) / Math.max(1, items.length));
      for (const it of items) {
        slide.addText(it.time, { x: M, y, w: cw * 0.22, h: rh, fontSize: 16, bold: true, color: accent, fontFace: disp, valign: "top" });
        slide.addText(it.text, { x: M + cw * 0.24, y, w: cw * 0.76, h: rh, fontSize: 16, color: text, fontFace: body, valign: "top" });
        y += rh;
      }
      break;
    }
    case "fullBleed": {
      image(bgMedia(s), 0, 0, W, H, false);
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: H * 0.55, w: W, h: H * 0.45, fill: { color: "000000", transparency: 35 } });
      if (s.title) slide.addText(s.title, { x: M, y: H * 0.66, w: cw, h: 0.9, fontSize: 32, bold: true, color: "FFFFFF", fontFace: disp });
      if (s.body) slide.addText(s.body, { x: M, y: H * 0.8, w: cw, h: 0.9, fontSize: 18, color: "FFFFFF", fontFace: body });
      break;
    }
    case "chart": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const data = s.chartData ?? [];
      slide.addChart(pptx.ChartType.bar, [{ name: s.title ?? "", labels: data.map((d) => d.label), values: data.map((d) => d.value) }], {
        x: M, y: H * 0.32, w: cw, h: H * 0.55,
        barDir: "col", chartColors: [accent], showValue: true, showLegend: false,
        catAxisLabelColor: muted, valAxisLabelColor: muted, dataLabelColor: text, dataLabelFontFace: body,
      });
      break;
    }
    case "imageGrid": {
      titleAt(slide, s, { x: M, y: M * 0.7, w: cw }, disp, text);
      const imgs = (s.media ?? []).filter((m) => (m.role ?? "content") === "content").slice(0, 4);
      const y = H * 0.32;
      const gh = H * 0.55;
      const cols = imgs.length > 2 ? 2 : Math.max(1, imgs.length);
      const rows = Math.ceil(imgs.length / cols);
      const gap = 0.2;
      const iw = (cw - gap * (cols - 1)) / cols;
      const ih = (gh - gap * (rows - 1)) / rows;
      imgs.forEach((m, i) => {
        const cx = M + (i % cols) * (iw + gap);
        const cy = y + Math.floor(i / cols) * (ih + gap);
        image(m, cx, cy, iw, ih);
      });
      if (!imgs.length) placeholder(M, y, cw, gh);
      break;
    }
    default: {
      slide.addText(s.title ?? s.body ?? "", { x: M, y: H * 0.4, w: cw, h: 1.5, fontSize: 28, color: text, fontFace: disp });
    }
  }
}

function titleAt(slide: Slide, s: SlideIR, box: { x: number; y: number; w: number }, disp: string, color: string) {
  if (!s.title) return;
  slide.addText(s.title, { x: box.x, y: box.y, w: box.w, h: 0.8, fontSize: 26, bold: true, color, fontFace: disp });
}
