// Theme = the "clothes". Structure lives in layouts; style lives here.
// layouts × themes multiply, so a handful of each yields lots of looks.

export interface Theme {
  id: string;
  name: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
}

const KR_SANS = `"Pretendard", "Noto Sans KR", system-ui, sans-serif`;
const KR_SERIF = `"Nanum Myeongjo", "Noto Serif KR", serif`;

export const THEMES: Theme[] = [
  {
    id: "clean-light",
    name: "클린 라이트",
    bg: "#ffffff",
    surface: "#f5f5f4",
    text: "#1c1c1a",
    textMuted: "#6b6a64",
    accent: "#1d9e75",
    accentText: "#04342c",
    border: "rgba(0,0,0,0.1)",
    fontDisplay: KR_SANS,
    fontBody: KR_SANS,
    radius: "14px",
  },
  {
    id: "ink-dark",
    name: "잉크 다크",
    bg: "#16161a",
    surface: "#22222a",
    text: "#f3f2ee",
    textMuted: "#a3a2a0",
    accent: "#7f77dd",
    accentText: "#eeedfe",
    border: "rgba(255,255,255,0.12)",
    fontDisplay: KR_SANS,
    fontBody: KR_SANS,
    radius: "14px",
  },
  {
    id: "editorial",
    name: "에디토리얼",
    bg: "#f7f4ec",
    surface: "#efe9db",
    text: "#2c2a26",
    textMuted: "#76705f",
    accent: "#993c1d",
    accentText: "#4a1b0c",
    border: "rgba(0,0,0,0.12)",
    fontDisplay: KR_SERIF,
    fontBody: KR_SANS,
    radius: "4px",
  },
  {
    id: "ocean",
    name: "오션",
    bg: "#f0f6fb",
    surface: "#dcebf7",
    text: "#042c53",
    textMuted: "#3f6285",
    accent: "#185fa5",
    accentText: "#042c53",
    border: "rgba(4,44,83,0.14)",
    fontDisplay: KR_SANS,
    fontBody: KR_SANS,
    radius: "12px",
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
