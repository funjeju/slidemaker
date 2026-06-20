// The intermediate representation (IR) that everything in the app revolves around.
// The script generator outputs SlideIR[]; layouts consume it; the renderer paints it.

export type SemanticType =
  | "cover"
  | "section"
  | "keyMessage"
  | "stat"
  | "quote"
  | "bulletList"
  | "twoColumn"
  | "comparison"
  | "timeline"
  | "fullBleed"
  | "chart"
  | "imageGrid";

export const SEMANTIC_TYPES: SemanticType[] = [
  "cover",
  "section",
  "keyMessage",
  "stat",
  "quote",
  "bulletList",
  "twoColumn",
  "comparison",
  "timeline",
  "fullBleed",
  "chart",
  "imageGrid",
];

export type MediaRole = "content" | "background" | "logo";

export interface MediaRef {
  kind: "image" | "chart";
  role?: MediaRole;
  // src is the resolved URL (uploaded / stock / generated). Empty src + prompt
  // means "needs generation by /api/image".
  src?: string;
  prompt?: string;
  alt?: string;
}

export interface ComparisonSide {
  title: string;
  points: string[];
}

export interface TimelineItem {
  time: string;
  text: string;
}

export interface ChartDatum {
  label: string;
  value: number;
}

// One slide. Only the fields relevant to `type` are expected to be filled;
// the rest are optional. This keeps the IR flat and easy for the LLM to emit.
export interface SlideIR {
  id: string;
  type: SemanticType;
  title?: string;
  subtitle?: string;
  body?: string; // a single key sentence / short paragraph
  bullets?: string[];
  stat?: { value: string; label?: string };
  quote?: { text: string; attribution?: string };
  comparison?: { left: ComparisonSide; right: ComparisonSide };
  timeline?: TimelineItem[];
  chartData?: ChartDatum[];
  media?: MediaRef[];
  notes?: string; // speaker notes
}

export type Ratio = "16:9" | "4:3" | "9:16";

// Canvas pixel size per ratio. Width stays 1280 for landscape ratios so the
// fixed-width layouts reflow cleanly; 9:16 swaps to a portrait canvas.
export const RATIO_SIZES: Record<Ratio, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "4:3": { w: 1280, h: 960 },
  "9:16": { w: 720, h: 1280 },
};

export const RATIOS: Ratio[] = ["16:9", "4:3", "9:16"];

export interface Deck {
  id: string;
  title: string;
  themeId: string;
  ratio: Ratio;
  fontId?: string; // optional font override on top of the theme
  slides: SlideIR[];
  ownerUid?: string;
  createdAt?: number;
  updatedAt?: number;
}

export function newId(prefix = "s"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
