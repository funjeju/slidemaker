import type { SemanticType } from "./types";

// This is the heart of "원고가 레이아웃을 결정한다".
// We do NOT feed the model a pile of templates. We feed it a small, closed set
// of meaning-types with crisp selection criteria. The model's only creative job
// is: read each slide's content, pick the right type, fill the slots.

export interface TypeSpec {
  type: SemanticType;
  label: string; // Korean label for UI
  when: string; // selection criterion (goes into the prompt)
  fills: string; // which IR fields to populate
  // minimum media of role 'content' the matching layout expects
  minContentMedia?: number;
}

export const TYPE_CATALOG: Record<SemanticType, TypeSpec> = {
  cover: {
    type: "cover",
    label: "표지",
    when: "발표 전체의 첫 장. 제목과 한 줄 부제.",
    fills: "title, subtitle",
  },
  section: {
    type: "section",
    label: "섹션 구분",
    when: "화제가 바뀌는 전환 지점. 짧은 섹션 제목만.",
    fills: "title (and optional subtitle)",
  },
  keyMessage: {
    type: "keyMessage",
    label: "핵심 한 줄",
    when: "한 문장으로 끝나는 핵심 주장 하나. 불릿이 아니라 선언.",
    fills: "body (one strong sentence), optional title",
  },
  stat: {
    type: "stat",
    label: "지표",
    when: "큰 숫자/지표 하나가 주인공이고 짧은 설명이 따른다.",
    fills: "stat.value, stat.label, optional body",
  },
  quote: {
    type: "quote",
    label: "인용",
    when: "발언이나 인용문을 강조한다.",
    fills: "quote.text, quote.attribution",
  },
  bulletList: {
    type: "bulletList",
    label: "목록",
    when: "3~5개의 병렬 항목. 위계가 없는 나열.",
    fills: "title, bullets[3-5]",
  },
  twoColumn: {
    type: "twoColumn",
    label: "2단(텍스트+시각)",
    when: "설명 텍스트와 그것을 뒷받침하는 시각 자료 1개를 나란히.",
    fills: "title, body or bullets, media[0] (role: content)",
    minContentMedia: 1,
  },
  comparison: {
    type: "comparison",
    label: "비교",
    when: "A 대 B 대조 구조. 두 항목을 좌우로 견준다.",
    fills: "comparison.left, comparison.right",
  },
  timeline: {
    type: "timeline",
    label: "타임라인",
    when: "시간순 또는 단계 흐름. 순서가 의미를 가진다.",
    fills: "title, timeline[]",
  },
  fullBleed: {
    type: "fullBleed",
    label: "풀블리드",
    when: "분위기/감정 전달용 사진이 주인공이고 텍스트는 오버레이.",
    fills: "title or body, media[0] (role: background)",
    minContentMedia: 1,
  },
  chart: {
    type: "chart",
    label: "차트",
    when: "수치 데이터 묶음을 그래프로 보여준다.",
    fills: "title, chartData[]",
  },
  imageGrid: {
    type: "imageGrid",
    label: "이미지 그리드",
    when: "이미지 여러 장을 격자로 보여준다.",
    fills: "title, media[2+] (role: content)",
    minContentMedia: 2,
  },
};

export function catalogForPrompt(): string {
  return Object.values(TYPE_CATALOG)
    .map((s) => `- ${s.type}: ${s.when} (채울 필드: ${s.fills})`)
    .join("\n");
}
