import type { SlideIR, SemanticType, MediaRef } from "./types";
import { TYPE_CATALOG } from "./semanticTypes";

// 1:1 in the common case — type IS the layout. But before we commit, we check
// the slots actually match the content. If not, we fall back to a layout that
// can hold what's there. This is the deterministic half of the pipeline:
// the LLM only does judgment (which type); slot-fitting is pure code.

function contentMediaCount(media?: MediaRef[]): number {
  if (!media) return 0;
  return media.filter((m) => (m.role ?? "content") === "content").length;
}

// Ordered fallbacks per type when the chosen layout can't hold the content.
const FALLBACKS: Partial<Record<SemanticType, SemanticType>> = {
  imageGrid: "twoColumn", // not enough images -> show the one we have beside text
  twoColumn: "keyMessage", // no image -> just say the message
  fullBleed: "keyMessage", // no background image -> plain key message
  chart: "bulletList", // no chart data -> list the points
  comparison: "bulletList",
  stat: "keyMessage",
  timeline: "bulletList",
};

function fits(slide: SlideIR, type: SemanticType): boolean {
  const spec = TYPE_CATALOG[type];
  if (spec.minContentMedia && contentMediaCount(slide.media) < spec.minContentMedia) {
    return false;
  }
  switch (type) {
    case "chart":
      return !!slide.chartData && slide.chartData.length > 0;
    case "comparison":
      return !!slide.comparison;
    case "stat":
      return !!slide.stat?.value;
    case "timeline":
      return !!slide.timeline && slide.timeline.length > 0;
    case "quote":
      return !!slide.quote?.text;
    case "bulletList":
      return !!slide.bullets && slide.bullets.length > 0;
    default:
      return true;
  }
}

// Resolve the layout to actually render. Walks the fallback chain until something fits.
export function resolveLayout(slide: SlideIR): SemanticType {
  let type = slide.type;
  const seen = new Set<SemanticType>();
  while (!fits(slide, type) && !seen.has(type)) {
    seen.add(type);
    const next = FALLBACKS[type];
    if (!next) break;
    type = next;
  }
  return type;
}

// When a user manually switches a slide to another layout (right panel), we let
// them, but flag whether the content fully fits so the UI can warn / re-flow.
export function overrideLayout(
  slide: SlideIR,
  type: SemanticType
): { slide: SlideIR; fitsCleanly: boolean } {
  return { slide: { ...slide, type }, fitsCleanly: fits(slide, type) };
}
