import { NextResponse } from "next/server";
import { requireUser, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// GPT Image 2. Confirm the live model id in the OpenAI console if this changes.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

export async function POST(req: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(req));
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // feature flag check
  const profile = await adminDb().collection("users").doc(uid).get();
  if (profile.data()?.features?.imageGen === false) {
    return NextResponse.json({ error: "이미지 생성이 비활성화되어 있습니다." }, { status: 403 });
  }

  const { prompt, size = "1536x1024" } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt 필요" }, { status: 400 });

  // Image quality is admin-controlled per user (low | medium | high), read
  // server-side from the profile so the client can't bump it.
  const ALLOWED_QUALITY = ["low", "medium", "high"] as const;
  const raw = profile.data()?.imageQuality;
  const quality = (ALLOWED_QUALITY as readonly string[]).includes(raw) ? raw : "low";

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, quality, n: 1 }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "이미지 생성 실패", detail }, { status: 502 });
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  const url = b64 ? `data:image/png;base64,${b64}` : data.data?.[0]?.url;

  // usage metering (best-effort)
  await adminDb().collection("users").doc(uid).collection("usage").add({
    kind: "image",
    at: Date.now(),
  });

  return NextResponse.json({ url });
}
