import { catalogForPrompt } from "./semanticTypes";

export interface GenerateOptions {
  topic?: string; // when only a topic is given
  script?: string; // when source text/transcript is provided
  audience?: string;
  ratio?: string;
  maxSlides?: number;
  // whether the caller already decided to augment with web search results
  research?: string;
}

export function buildSystemPrompt(): string {
  return `당신은 발표 슬라이드 설계 엔진입니다. 입력(주제 또는 원고)을 받아 슬라이드 배열을 JSON으로만 출력합니다.

핵심 규칙:
1. "한 슬라이드 한 메시지" — 한 장에는 단 하나의 요점만. 요점이 둘이면 두 장으로 쪼갠다.
2. 각 슬라이드는 내용의 성격에 가장 맞는 type을 고른다. type 목록과 선택 기준:
${catalogForPrompt()}
3. 고른 type에 필요한 필드만 채운다. 불필요한 필드는 생략한다.
4. 이미지가 필요한 슬라이드(twoColumn, fullBleed, imageGrid)는 media 항목에 src 없이 prompt(영문, 글자 없는 배경/일러스트)와 role을 적는다. 실제 이미지는 별도 단계에서 생성된다.
5. 모든 텍스트는 입력 언어를 따른다(보통 한국어).
6. 첫 장은 보통 cover, 큰 전환마다 section을 넣는다.

출력 형식: 다음 스키마의 객체 하나만, 코드펜스 없이 순수 JSON으로.
{
  "title": string,
  "slides": [
    {
      "type": one of [cover, section, keyMessage, stat, quote, bulletList, twoColumn, comparison, timeline, fullBleed, chart, imageGrid],
      "title"?: string,
      "subtitle"?: string,
      "body"?: string,
      "bullets"?: string[],
      "stat"?: { "value": string, "label"?: string },
      "quote"?: { "text": string, "attribution"?: string },
      "comparison"?: { "left": {"title": string, "points": string[]}, "right": {"title": string, "points": string[]} },
      "timeline"?: [{ "time": string, "text": string }],
      "chartData"?: [{ "label": string, "value": number }],
      "media"?: [{ "kind": "image", "role": "content"|"background"|"logo", "prompt": string, "alt": string }],
      "notes"?: string
    }
  ]
}`;
}

export function buildUserPrompt(opts: GenerateOptions): string {
  const parts: string[] = [];
  if (opts.script) {
    parts.push(`다음 원고를 슬라이드로 구조화하세요:\n"""\n${opts.script}\n"""`);
  } else if (opts.topic) {
    parts.push(`다음 주제로 슬라이드를 작성하세요: ${opts.topic}`);
  }
  if (opts.research) {
    parts.push(`참고할 최신 검색 자료:\n"""\n${opts.research}\n"""`);
  }
  if (opts.audience) parts.push(`청중: ${opts.audience}`);
  parts.push(`슬라이드 수는 ${opts.maxSlides ?? 12}장 내외로.`);
  return parts.join("\n\n");
}
