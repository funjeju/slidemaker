import type { Theme } from "./themes";

// A font override sits on top of a theme. The theme still owns color/spacing;
// the font pack only swaps display/body families. All families are loaded in
// app/layout.tsx so previews render immediately.

export interface FontPack {
  id: string;
  name: string; // Korean UI label
  mood: string; // one-line feel, shown under the name
  display: string; // headings
  body: string; // body text
}

const SANS = `"Pretendard", "Noto Sans KR", system-ui, sans-serif`;

export const FONTS: FontPack[] = [
  {
    id: "pretendard",
    name: "프리텐다드",
    mood: "깔끔한 기본 산세리프",
    display: SANS,
    body: SANS,
  },
  {
    id: "noto-serif",
    name: "노토 명조",
    mood: "차분한 정통 명조",
    display: `"Noto Serif KR", serif`,
    body: SANS,
  },
  {
    id: "nanum-myeongjo",
    name: "나눔명조",
    mood: "고전적이고 에디토리얼",
    display: `"Nanum Myeongjo", serif`,
    body: SANS,
  },
  {
    id: "gowun-dodum",
    name: "고운돋움",
    mood: "부드럽고 둥근 산세리프",
    display: `"Gowun Dodum", ${SANS}`,
    body: `"Gowun Dodum", ${SANS}`,
  },
  {
    id: "jua",
    name: "주아",
    mood: "친근하고 통통한 디스플레이",
    display: `"Jua", ${SANS}`,
    body: SANS,
  },
  {
    id: "black-han-sans",
    name: "검은고딕",
    mood: "굵고 강한 임팩트 헤드라인",
    display: `"Black Han Sans", ${SANS}`,
    body: SANS,
  },
  {
    id: "do-hyeon",
    name: "도현",
    mood: "또렷한 포스터형 굵은 고딕",
    display: `"Do Hyeon", ${SANS}`,
    body: SANS,
  },
  {
    id: "ibm-plex",
    name: "IBM Plex Sans KR",
    mood: "테크/모던한 산세리프",
    display: `"IBM Plex Sans KR", ${SANS}`,
    body: `"IBM Plex Sans KR", ${SANS}`,
  },
];

export const DEFAULT_FONT_ID = FONTS[0].id;

export function getFont(id?: string): FontPack | undefined {
  if (!id) return undefined;
  return FONTS.find((f) => f.id === id);
}

// Apply an optional font override to a theme, returning an effective theme.
export function applyFont(theme: Theme, fontId?: string): Theme {
  const f = getFont(fontId);
  if (!f) return theme;
  return { ...theme, fontDisplay: f.display, fontBody: f.body };
}
