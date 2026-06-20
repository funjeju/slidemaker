import { NextResponse } from "next/server";
import { requireUser } from "@/lib/firebase/admin";
import { catalogForPrompt } from "@/engine/semanticTypes";
import { newId, type SlideIR } from "@/engine/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_SCRIPT_MODEL || "gpt-4o-mini";

// Natural-language editing of an existing deck. The client sends the current
// slides plus an instruction (e.g. "3번 슬라이드를 인용으로 바꿔줘"); the model
// returns the full updated slides array. Slot-fitting / fallback still happens
// deterministically at render time, so the model only needs to get the IR right.
export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { slides, instruction } = (await req.json()) as {
    slides?: SlideIR[];
    instruction?: string;
  };
  if (!slides?.length || !instruction?.trim()) {
    return NextResponse.json({ error: "slides와 instruction이 필요합니다." }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });

  const system = `당신은 발표 슬라이드 편집기입니다. 현재 슬라이드 배열(JSON)과 사용자의 수정 요청을 받아, 요청을 반영한 "전체 슬라이드 배열"을 JSON으로만 출력합니다.

규칙:
1. 요청과 무관한 슬라이드는 그대로 둔다(내용·순서 보존).
2. 각 슬라이드의 id는 절대 바꾸지 않는다. 새 슬라이드를 추가할 때만 id를 비워둔다.
3. type을 바꾸면 해당 type에 필요한 필드를 채우고 불필요한 필드는 제거한다.
4. type 목록과 선택 기준:
${catalogForPrompt()}
5. 텍스트 언어는 기존 슬라이드를 따른다(보통 한국어).

출력: { "slides": [ ... ] } 형태의 순수 JSON 객체 하나. 코드펜스 없이.
각 슬라이드 스키마는 입력과 동일하다(type, title, subtitle, body, bullets, stat, quote, comparison, timeline, chartData, media, notes, id).`;

  const user = `현재 슬라이드:\n${JSON.stringify({ slides }, null, 0)}\n\n수정 요청:\n"""${instruction}"""`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "LLM 호출 실패", detail }, { status: 502 });
  }

  const data = await res.json();
  let parsed: { slides?: SlideIR[] };
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 502 });
  }

  // Keep existing ids; mint ids for any new slides the model added.
  const out: SlideIR[] = (parsed.slides ?? []).map((s) => ({
    ...s,
    id: s.id && s.id.trim() ? s.id : newId(),
  }));
  if (!out.length) {
    return NextResponse.json({ error: "빈 결과" }, { status: 502 });
  }

  return NextResponse.json({ slides: out });
}
