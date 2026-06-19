import { NextResponse } from "next/server";
import { requireUser } from "@/lib/firebase/admin";
import { buildSystemPrompt, buildUserPrompt, type GenerateOptions } from "@/engine/prompt";
import { newId, type SlideIR, type Deck } from "@/engine/types";
import { DEFAULT_THEME_ID } from "@/engine/themes";

export const runtime = "nodejs";
export const maxDuration = 60;

// Model is configurable. The user asked for an OpenAI "mini"; set the exact
// current model id in env (e.g. gpt-4o-mini). Verify the live name in the
// OpenAI console — model ids change over time.
const MODEL = process.env.OPENAI_SCRIPT_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const opts = (await req.json()) as GenerateOptions;
  if (!opts.topic && !opts.script) {
    return NextResponse.json({ error: "topic 또는 script가 필요합니다." }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(opts) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "LLM 호출 실패", detail }, { status: 502 });
  }

  const data = await res.json();
  let parsed: { title?: string; slides?: SlideIR[] };
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 502 });
  }

  const slides: SlideIR[] = (parsed.slides ?? []).map((s) => ({ ...s, id: newId() }));

  const deck: Deck = {
    id: newId("deck"),
    title: parsed.title || opts.topic || "제목 없는 발표",
    themeId: DEFAULT_THEME_ID,
    ratio: "16:9",
    slides,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return NextResponse.json({ deck });
}
