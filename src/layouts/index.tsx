import React from "react";
import type { SlideIR, SemanticType, MediaRef } from "@/engine/types";
import type { Theme } from "@/engine/themes";

// Every layout renders into a fixed 1280x720 canvas; SlideRenderer scales it.
// Structure is fixed per archetype; all color/type comes from `theme`.

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
    return (
      <img
        src={m.src}
        alt={m.alt ?? ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        background: "rgba(125,125,125,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        color: "rgba(125,125,125,0.9)",
      }}
    >
      이미지
    </div>
  );
}

const Cover = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: PAD })}>
    <div style={{ width: 64, height: 6, background: theme.accent, marginBottom: 36 }} />
    <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 78, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
      {slide.title}
    </h1>
    {slide.subtitle && (
      <p style={{ fontSize: 32, color: theme.textMuted, marginTop: 28 }}>{slide.subtitle}</p>
    )}
  </div>
);

const Section = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { background: theme.accent, color: theme.accentText, display: "flex", flexDirection: "column", justifyContent: "center", padding: PAD })}>
    <p style={{ fontSize: 26, opacity: 0.7, margin: 0, letterSpacing: 2 }}>SECTION</p>
    <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 72, fontWeight: 700, margin: "18px 0 0" }}>{slide.title}</h1>
    {slide.subtitle && <p style={{ fontSize: 30, opacity: 0.85, marginTop: 20 }}>{slide.subtitle}</p>}
  </div>
);

const KeyMessage = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: 120 })}>
    {slide.title && <p style={{ fontSize: 28, color: theme.accent, margin: "0 0 24px" }}>{slide.title}</p>}
    <p style={{ fontFamily: theme.fontDisplay, fontSize: 60, fontWeight: 600, lineHeight: 1.25, margin: 0 }}>
      {slide.body}
    </p>
  </div>
);

const Stat = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: PAD, textAlign: "center" })}>
    <div style={{ fontFamily: theme.fontDisplay, fontSize: 220, fontWeight: 700, lineHeight: 1, color: theme.accent }}>
      {slide.stat?.value}
    </div>
    {slide.stat?.label && <p style={{ fontSize: 36, marginTop: 16 }}>{slide.stat.label}</p>}
    {slide.body && <p style={{ fontSize: 26, color: theme.textMuted, marginTop: 16, maxWidth: 820 }}>{slide.body}</p>}
  </div>
);

const Quote = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { display: "flex", flexDirection: "column", justifyContent: "center", padding: 120 })}>
    <div style={{ fontFamily: theme.fontDisplay, fontSize: 120, color: theme.accent, lineHeight: 0.6, height: 60 }}>“</div>
    <p style={{ fontFamily: theme.fontDisplay, fontSize: 50, fontWeight: 500, lineHeight: 1.35, margin: 0 }}>
      {slide.quote?.text}
    </p>
    {slide.quote?.attribution && (
      <p style={{ fontSize: 28, color: theme.textMuted, marginTop: 32 }}>— {slide.quote.attribution}</p>
    )}
  </div>
);

function Title({ slide, theme }: LayoutProps) {
  if (!slide.title) return null;
  return (
    <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 46, fontWeight: 600, margin: "0 0 36px" }}>{slide.title}</h2>
  );
}

const BulletList = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
    <Title slide={slide} theme={theme} />
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 24 }}>
      {(slide.bullets ?? []).map((b, i) => (
        <li key={i} style={{ display: "flex", gap: 20, fontSize: 34, lineHeight: 1.35 }}>
          <span style={{ color: theme.accent, fontWeight: 700 }}>—</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  </div>
);

const TwoColumn = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
    <Title slide={slide} theme={theme} />
    <div style={{ display: "flex", gap: 56, alignItems: "center", flex: 1 }}>
      <div style={{ flex: 1 }}>
        {slide.body && <p style={{ fontSize: 32, lineHeight: 1.5, margin: 0 }}>{slide.body}</p>}
        {slide.bullets && (
          <ul style={{ paddingLeft: 24, margin: slide.body ? "24px 0 0" : 0, fontSize: 30, lineHeight: 1.6 }}>
            {slide.bullets.map((b, i) => (<li key={i}>{b}</li>))}
          </ul>
        )}
      </div>
      <div style={{ flex: "0 0 46%", height: 440 }}>
        <ImageSlot m={contentMedia(slide)} radius={theme.radius} />
      </div>
    </div>
  </div>
);

const Comparison = ({ slide, theme, size }: LayoutProps) => {
  const c = slide.comparison;
  const col = (side?: { title: string; points: string[] }) => (
    <div style={{ flex: 1, background: theme.surface, borderRadius: theme.radius, padding: 40 }}>
      <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 36, margin: "0 0 24px", color: theme.accent }}>{side?.title}</h3>
      <ul style={{ paddingLeft: 22, margin: 0, fontSize: 28, lineHeight: 1.6 }}>
        {(side?.points ?? []).map((p, i) => (<li key={i}>{p}</li>))}
      </ul>
    </div>
  );
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Title slide={slide} theme={theme} />
      <div style={{ display: "flex", gap: 40 }}>
        {col(c?.left)}
        {col(c?.right)}
      </div>
    </div>
  );
};

const Timeline = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
    <Title slide={slide} theme={theme} />
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {(slide.timeline ?? []).map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
          <div style={{ minWidth: 180, fontFamily: theme.fontDisplay, fontSize: 30, fontWeight: 700, color: theme.accent }}>{t.time}</div>
          <div style={{ fontSize: 30, lineHeight: 1.4 }}>{t.text}</div>
        </div>
      ))}
    </div>
  </div>
);

const FullBleed = ({ slide, theme, size }: LayoutProps) => (
  <div style={frame(theme, size)}>
    <div style={{ position: "absolute", inset: 0 }}>
      <ImageSlot m={bgMedia(slide)} radius="0" />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.62), rgba(0,0,0,0.05))" }} />
    <div style={{ position: "absolute", left: PAD, bottom: PAD, right: PAD, color: "#fff" }}>
      {slide.title && <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 64, fontWeight: 700, margin: 0 }}>{slide.title}</h2>}
      {slide.body && <p style={{ fontSize: 32, marginTop: 16, maxWidth: 900 }}>{slide.body}</p>}
    </div>
  </div>
);

const Chart = ({ slide, theme, size }: LayoutProps) => {
  const data = slide.chartData ?? [];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Title slide={slide} theme={theme} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 40, height: 360 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{d.value}</div>
            <div style={{ width: "100%", height: `${(d.value / max) * 300}px`, background: theme.accent, borderRadius: `${theme.radius} ${theme.radius} 0 0` }} />
            <div style={{ fontSize: 24, color: theme.textMuted }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ImageGrid = ({ slide, theme, size }: LayoutProps) => {
  const imgs = (slide.media ?? []).filter((m) => (m.role ?? "content") === "content").slice(0, 4);
  return (
    <div style={frame(theme, size, { padding: PAD, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <Title slide={slide} theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: imgs.length > 2 ? "1fr 1fr" : `repeat(${imgs.length}, 1fr)`, gap: 24, flex: 1 }}>
        {imgs.map((m, i) => (
          <div key={i} style={{ minHeight: 220 }}>
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
