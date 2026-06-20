import React from "react";
import type { SlideIR, SemanticType, MediaRef } from "@/engine/types";
import type { Theme } from "@/engine/themes";

// Every layout renders into a fixed canvas (default 1280x720); SlideRenderer
// scales it. Structure is fixed per archetype; all color/type comes from
// `theme`. Mirrors the PPTX exporter's infographic treatment so screen, PDF and
// PPTX stay visually consistent: kicker headers, numbered rows, ring stats, VS
// comparison cards, vertical timelines, cards with soft shadows.

export interface CanvasSize {
  w: number;
  h: number;
}

export interface LayoutProps {
  slide: SlideIR;
  theme: Theme;
  size?: CanvasSize;
}

const DEFAULT_SIZE: CanvasSize = { w: 1280, h: 720 };
const PAD = 88;

// ---- color helpers (derive tints/alpha from the theme accent) ----
function rgbOf(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function tint(h: string, t: number): string {
  const [r, g, b] = rgbOf(h);
  const T = t >= 0 ? 255 : 0;
  const a = Math.abs(t);
  const m = (x: number) => Math.round(x + (T - x) * a);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function alpha(h: string, a: number): string {
  const [r, g, b] = rgbOf(h);
  return `rgba(${r},${g},${b},${a})`;
}
const cardShadow = (theme: Theme) => `0 8px 26px ${alpha(theme.text, 0.1)}`;

function frame(theme: Theme, size: CanvasSize = DEFAULT_SIZE, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: size.w,
    height: size.h,
    background: theme.bg,
    color: theme.text,
    fontFamily: theme.fontBody,
    position: "relative",
    overflow: "hidden",
    ...extra,
  };
}

function contentMedia(slide: SlideIR): MediaRef | undefined {
  return slide.media?.find((m) => (m.role ?? "content") === "content");
}
function bgMedia(slide: SlideIR): MediaRef | undefined {
  return slide.media?.find((m) => m.role === "background") ?? contentMedia(slide);
}

function ImageSlot({ m, radius }: { m?: MediaRef; radius: string }) {
  if (m?.src) {
    return <img src={m.src} alt={m.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }} />;
  }
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: radius, background: "rgba(125,125,125,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "rgba(125,125,125,0.9)" }}>
      이미지
    </div>
  );
}

// kicker accent tab + title, shared by content layouts
function Header({ slide, theme, eyebrow }: { slide: SlideIR; theme: Theme; eyebrow?: string }) {
  if (!slide.title && !eyebrow) return null;
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ width: 48, height: 9, background: theme.accent, borderRadius: 3 }} />
        {eyebrow && <span style={{ fontSize: 18, letterSpacing: 2, color: theme.textMuted }}>{eyebrow.toUpperCase()}</span>}
      </div>
      {slide.title && <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 48, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>{slide.title}</h2>}
    </div>
  );
}

const Cover = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: PAD })}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, background: theme.accent }} />
    <div style={{ width: 76, height: 12, background: theme.accent, marginBottom: 34 }} />
    <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 84, fontWeight: 700, lineHeight: 1.06, margin: 0 }}>{slide.title}</h1>
    {slide.subtitle && <p style={{ fontSize: 33, color: theme.textMuted, marginTop: 28, maxWidth: 980 }}>{slide.subtitle}</p>}
  </div>
);

const Section = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { background: theme.accent, color: theme.accentText, display: "flex", flexDirection: "column", justifyContent: "center", padding: PAD })}>
    <p style={{ fontSize: 26, opacity: 0.75, margin: 0, letterSpacing: 3 }}>SECTION</p>
    <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 76, fontWeight: 700, margin: "16px 0 0" }}>{slide.title}</h1>
    {slide.subtitle && <p style={{ fontSize: 30, opacity: 0.85, marginTop: 20, maxWidth: 980 }}>{slide.subtitle}</p>}
  </div>
);

const KeyMessage = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: 120 })}>
    {slide.title && (
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
        <span style={{ width: 44, height: 9, background: theme.accent, borderRadius: 3 }} />
        <span style={{ fontSize: 22, letterSpacing: 2, color: theme.accent }}>{slide.title.toUpperCase()}</span>
      </div>
    )}
    <p style={{ fontFamily: theme.fontDisplay, fontSize: 62, fontWeight: 700, lineHeight: 1.22, margin: 0 }}>{slide.body}</p>
    <div style={{ width: 110, height: 8, background: theme.accent, marginTop: 40, borderRadius: 4 }} />
  </div>
);

const Stat = ({ slide, theme, size }: LayoutProps) => {
  const sz = size ?? DEFAULT_SIZE;
  const D = Math.min(380, sz.h * 0.52);
  const ring = Math.max(16, D * 0.085);
  return (
    <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: PAD, textAlign: "center" })}>
      <div style={{ width: D, height: D, borderRadius: "50%", border: `${ring}px solid ${theme.accent}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: cardShadow(theme) }}>
        <span style={{ fontFamily: theme.fontDisplay, fontSize: D * 0.3, fontWeight: 700, lineHeight: 1, color: theme.accent }}>{slide.stat?.value}</span>
      </div>
      {slide.stat?.label && <p style={{ fontFamily: theme.fontDisplay, fontSize: 38, fontWeight: 600, marginTop: 28 }}>{slide.stat.label}</p>}
      {slide.body && <p style={{ fontSize: 25, color: theme.textMuted, marginTop: 12, maxWidth: 820 }}>{slide.body}</p>}
    </div>
  );
};

const Quote = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: 120 })}>
    <div style={{ position: "absolute", left: 64, top: 150, bottom: 150, width: 10, background: theme.accent, borderRadius: 5 }} />
    <div style={{ fontFamily: theme.fontDisplay, fontSize: 150, color: theme.accent, lineHeight: 0.7, height: 80 }}>“</div>
    <p style={{ fontFamily: theme.fontDisplay, fontSize: 52, fontWeight: 500, lineHeight: 1.34, margin: 0 }}>{slide.quote?.text}</p>
    {slide.quote?.attribution && <p style={{ fontSize: 28, color: theme.textMuted, marginTop: 32 }}>— {slide.quote.attribution}</p>}
  </div>
);

const BulletList = ({ slide, theme, size }: LayoutProps) => {
  const items = (slide.bullets ?? []).slice(0, 6);
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Header slide={slide} theme={theme} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 24, alignItems: "center", padding: "18px 0", borderBottom: i < items.length - 1 ? `1px solid ${tint(theme.text, 0.82)}` : "none" }}>
            <span style={{ flex: "0 0 auto", width: 50, height: 50, borderRadius: "50%", background: theme.accent, color: theme.accentText, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
            <span style={{ fontSize: 32, lineHeight: 1.3 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TwoColumn = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
    <Header slide={slide} theme={theme} />
    <div style={{ display: "flex", gap: 56, alignItems: "center", flex: 1 }}>
      <div style={{ flex: 1 }}>
        {slide.body && <p style={{ fontSize: 32, lineHeight: 1.55, margin: 0 }}>{slide.body}</p>}
        {slide.bullets && (
          <ul style={{ listStyle: "none", padding: 0, margin: slide.body ? "24px 0 0" : 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {slide.bullets.map((b, i) => (
              <li key={i} style={{ display: "flex", gap: 14, fontSize: 28, lineHeight: 1.4 }}>
                <span style={{ color: theme.accent, fontWeight: 700 }}>•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ flex: "0 0 46%", height: 440, borderRadius: theme.radius, overflow: "hidden", boxShadow: cardShadow(theme) }}>
        <ImageSlot m={contentMedia(slide)} radius={theme.radius} />
      </div>
    </div>
  </div>
);

const Comparison = ({ slide, theme, size }: LayoutProps) => {
  const c = slide.comparison;
  const col = (side?: { title: string; points: string[] }) => (
    <div style={{ flex: 1, background: theme.surface, borderRadius: theme.radius, overflow: "hidden", boxShadow: cardShadow(theme) }}>
      <div style={{ background: theme.accent, color: theme.accentText, padding: "20px 32px", fontFamily: theme.fontDisplay, fontSize: 32, fontWeight: 700 }}>{side?.title}</div>
      <ul style={{ listStyle: "none", padding: "28px 32px", margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {(side?.points ?? []).map((p, i) => (
          <li key={i} style={{ display: "flex", gap: 12, fontSize: 26, lineHeight: 1.45 }}>
            <span style={{ color: theme.accent, fontWeight: 700 }}>•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Header slide={slide} theme={theme} />
      <div style={{ position: "relative", display: "flex", gap: 48, alignItems: "stretch" }}>
        {col(c?.left)}
        {col(c?.right)}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 76, height: 76, borderRadius: "50%", background: theme.bg, border: `3px solid ${theme.accent}`, color: theme.accent, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: cardShadow(theme) }}>VS</div>
      </div>
    </div>
  );
};

const Timeline = ({ slide, theme, size }: LayoutProps) => {
  const items = (slide.timeline ?? []).slice(0, 6);
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Header slide={slide} theme={theme} />
      <div style={{ position: "relative", paddingLeft: 44 }}>
        <div style={{ position: "absolute", left: 16, top: 12, bottom: 12, width: 3, background: tint(theme.text, 0.8) }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {items.map((t, i) => (
            <div key={i} style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: -36, top: 4, width: 22, height: 22, borderRadius: "50%", background: theme.accent, border: `3px solid ${theme.bg}`, boxShadow: `0 0 0 2px ${theme.accent}` }} />
              <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 700, color: theme.accent }}>{t.time}</div>
              <div style={{ fontSize: 28, lineHeight: 1.4, marginTop: 4 }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FullBleed = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size)}>
    <div style={{ position: "absolute", inset: 0 }}>
      <ImageSlot m={bgMedia(slide)} radius="0" />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.66), rgba(0,0,0,0.05))" }} />
    <div style={{ position: "absolute", left: PAD, bottom: PAD, right: PAD, color: "#fff" }}>
      <div style={{ width: 76, height: 10, background: theme.accent, marginBottom: 20, borderRadius: 4 }} />
      {slide.title && <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 66, fontWeight: 700, margin: 0 }}>{slide.title}</h2>}
      {slide.body && <p style={{ fontSize: 32, marginTop: 16, maxWidth: 940 }}>{slide.body}</p>}
    </div>
  </div>
);

const Chart = ({ slide, theme, size }: LayoutProps) => {
  const data = slide.chartData ?? [];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Header slide={slide} theme={theme} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 36, height: 360, borderBottom: `2px solid ${tint(theme.text, 0.78)}`, paddingBottom: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, justifyContent: "flex-end", height: "100%" }}>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 700, color: theme.text }}>{d.value}</div>
            <div style={{ width: "70%", maxWidth: 140, height: `${(d.value / max) * 300}px`, background: `linear-gradient(180deg, ${theme.accent}, ${tint(theme.accent, 0.28)})`, borderRadius: "10px 10px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 36, marginTop: 14 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 24, color: theme.textMuted }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
};

const ImageGrid = ({ slide, theme, size }: LayoutProps) => {
  const imgs = (slide.media ?? []).filter((m) => (m.role ?? "content") === "content").slice(0, 4);
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Header slide={slide} theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: imgs.length > 2 ? "1fr 1fr" : `repeat(${Math.max(1, imgs.length)}, 1fr)`, gap: 24, flex: 1 }}>
        {imgs.map((m, i) => (
          <div key={i} style={{ minHeight: 220, borderRadius: theme.radius, overflow: "hidden", boxShadow: cardShadow(theme) }}>
            <ImageSlot m={m} radius={theme.radius} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const LAYOUTS: Record<SemanticType, React.FC<LayoutProps>> = {
  cover: Cover,
  section: Section,
  keyMessage: KeyMessage,
  stat: Stat,
  quote: Quote,
  bulletList: BulletList,
  twoColumn: TwoColumn,
  comparison: Comparison,
  timeline: Timeline,
  fullBleed: FullBleed,
  chart: Chart,
  imageGrid: ImageGrid,
};
