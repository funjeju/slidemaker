"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SlideRenderer from "@/components/SlideRenderer";
import PrintDeck, { printDeck } from "@/components/PrintDeck";
import { exportPptx } from "@/lib/exportPptx";
import { THEMES, getTheme } from "@/engine/themes";
import { FONTS, applyFont } from "@/engine/fonts";
import {
  SEMANTIC_TYPES,
  RATIOS,
  type Deck,
  type SlideIR,
  type Ratio,
  type MediaRole,
} from "@/engine/types";
import { TYPE_CATALOG } from "@/engine/semanticTypes";
import { saveDeck, listDecks, loadDeck, type DeckSummary } from "@/lib/decks";

const ROLES: { value: MediaRole; label: string }[] = [
  { value: "content", label: "콘텐츠" },
  { value: "background", label: "배경" },
  { value: "logo", label: "로고" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Editor() {
  const { user, profile, loading, getToken, signOut } = useAuth();
  const router = useRouter();

  const [src, setSrc] = useState("");
  const [research, setResearch] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [assist, setAssist] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [saveMsg, setSaveMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  // Load the user's saved decks once authenticated. Must stay ABOVE the early
  // return below so hook order is stable (React error #310 otherwise).
  useEffect(() => {
    if (!user) return;
    listDecks(user.uid).then(setDecks).catch(() => {});
  }, [user]);
  if (loading || !user) return <div style={{ padding: 40 }}>불러오는 중…</div>;

  const baseTheme = getTheme(deck?.themeId ?? THEMES[0].id);
  const theme = applyFont(baseTheme, deck?.fontId);
  const ratio: Ratio = deck?.ratio ?? "16:9";
  const slide = deck?.slides[sel];
  const isScript = src.trim().length > 120;

  const update = (patch: Partial<SlideIR>) => {
    if (!deck) return;
    const slides = deck.slides.map((s, i) => (i === sel ? { ...s, ...patch } : s));
    setDeck({ ...deck, slides });
  };

  const generate = async () => {
    if (!src.trim()) return;
    setBusy(true); setErr("");
    try {
      const token = await getToken();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          script: isScript ? src : undefined,
          topic: isScript ? undefined : src,
          research: research ? "(웹 검색 보강은 별도 연동 예정)" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      setDeck(data.deck); setSel(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성 실패");
    } finally { setBusy(false); }
  };

  const fillImages = async () => {
    if (!deck) return;
    // Count slots that would actually be generated (have a prompt, no image yet).
    const pending = deck.slides.reduce(
      (n, s) => n + (s.media?.filter((m) => !m.src && m.prompt).length ?? 0),
      0
    );
    if (pending === 0) {
      alert("생성할 AI 이미지가 없습니다.\n(이미 채워졌거나, 이미지 프롬프트가 있는 슬라이드가 없습니다.)");
      return;
    }
    const ok = window.confirm(
      `AI 이미지 생성을 진행합니다.\n\n` +
        `• 대상: 프롬프트는 있으나 아직 비어 있는 이미지 ${pending}장\n` +
        `• OpenAI 이미지 API를 호출합니다 — 유료이며 계정 사용량이 차감됩니다.\n` +
        `• 시간이 다소 걸리며, 생성된 이미지는 해당 슬라이드에 자동으로 들어갑니다.\n\n` +
        `계속하시겠습니까?`
    );
    if (!ok) return;
    setBusy(true);
    const token = await getToken();
    const slides = [...deck.slides];
    for (let i = 0; i < slides.length; i++) {
      const media = slides[i].media;
      if (!media) continue;
      for (let j = 0; j < media.length; j++) {
        if (media[j].src || !media[j].prompt) continue;
        try {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ prompt: media[j].prompt }),
          });
          const data = await res.json();
          if (res.ok && data.url) media[j] = { ...media[j], src: data.url };
        } catch { /* skip */ }
      }
    }
    setDeck({ ...deck, slides });
    setBusy(false);
  };

  const runAssist = async () => {
    if (!deck || !assist.trim()) return;
    setAssistBusy(true); setErr("");
    try {
      const token = await getToken();
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slides: deck.slides, instruction: assist }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정 실패");
      setDeck({ ...deck, slides: data.slides });
      setSel((s) => Math.min(s, data.slides.length - 1));
      setAssist("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "수정 실패");
    } finally { setAssistBusy(false); }
  };

  const exportPptxNow = async () => {
    if (!deck) return;
    setSaveMsg("PPTX 생성 중…");
    try {
      await exportPptx(deck, theme);
      setSaveMsg("PPTX 내려받음");
    } catch (e) {
      setSaveMsg(e instanceof Error ? `PPTX 실패: ${e.message}` : "PPTX 실패");
    }
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const onUploadSource = async (f?: File) => {
    if (!f) return;
    setSrc(await f.text());
  };

  const addImage = async (f?: File) => {
    if (!f || !deck || !slide) return;
    const url = await fileToDataUrl(f);
    const media = [...(slide.media ?? []), { kind: "image" as const, role: "content" as MediaRole, src: url, alt: f.name }];
    update({ media });
  };
  const setMediaRole = (idx: number, role: MediaRole) => {
    if (!slide?.media) return;
    update({ media: slide.media.map((m, i) => (i === idx ? { ...m, role } : m)) });
  };
  const removeMedia = (idx: number) => {
    if (!slide?.media) return;
    update({ media: slide.media.filter((_, i) => i !== idx) });
  };

  const doSave = async () => {
    if (!deck || !user) return;
    setSaveMsg("저장 중…");
    try {
      await saveDeck(deck, user.uid);
      setSaveMsg("저장됨");
      setTimeout(() => setSaveMsg(""), 1500);
    } catch (e) {
      setSaveMsg(e instanceof Error ? `실패: ${e.message}` : "저장 실패");
    }
  };
  const refreshDecks = async () => {
    if (!user) return;
    try { setDecks(await listDecks(user.uid)); } catch { /* ignore */ }
  };
  const openDeck = async (id: string) => {
    const d = await loadDeck(id);
    if (d) { setDeck(d); setSel(0); }
  };

  return (
    <>
    <div className="screen-only" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <strong>슬라이드 메이커</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveMsg && <span style={{ fontSize: 13, color: "var(--muted)" }}>{saveMsg}</span>}
          <button className="btn" onClick={doSave} disabled={!deck}>저장</button>
          <button className="btn" onClick={() => deck && printDeck(deck)} disabled={!deck}>PDF</button>
          <button className="btn" onClick={exportPptxNow} disabled={!deck}>PPTX</button>
          <button className="btn" onClick={fillImages} disabled={!deck || busy} title="AI로 이미지를 생성합니다(유료). 누르면 확인창이 뜹니다.">AI 이미지 생성</button>
          {profile?.isAdmin && <button className="btn" onClick={() => router.push("/admin")}>어드민</button>}
          <button className="btn" onClick={() => signOut()}>로그아웃</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", gap: 12, padding: 12, minHeight: 0 }}>
        {/* ---- LEFT: source + design ---- */}
        <aside style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">소스 입력</div>
            <textarea rows={7} placeholder="주제 한 줄을 적거나, 원고 전체를 붙여넣으세요." value={src} onChange={(e) => setSrc(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {src.trim() ? (isScript ? "원고로 인식 → 구조화" : "주제로 인식 → 초안 작성") : "입력 대기"}
              </span>
              <button className="btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => fileRef.current?.click()}>파일 첨부</button>
              <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(e) => onUploadSource(e.target.files?.[0])} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={research} onChange={(e) => setResearch(e.target.checked)} />
              검색으로 보강 (연동 예정)
            </label>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={generate} disabled={busy}>
              {busy ? "생성 중…" : "슬라이드 생성"}
            </button>
            {err && <p style={{ color: "#a32d2d", fontSize: 13 }}>{err}</p>}
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">디자인 · 테마</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => deck && setDeck({ ...deck, themeId: t.id })}
                  className="btn" style={{ padding: "8px 6px", fontSize: 12, borderColor: (deck?.themeId ?? THEMES[0].id) === t.id ? "var(--accent)" : "var(--border)" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: t.accent, marginRight: 6, verticalAlign: "middle" }} />
                  {t.name}
                </button>
              ))}
            </div>

            <div className="panel-label" style={{ marginTop: 16 }}>비율</div>
            <div style={{ display: "flex", gap: 6 }}>
              {RATIOS.map((r) => (
                <button key={r} onClick={() => deck && setDeck({ ...deck, ratio: r })}
                  className="btn" style={{ flex: 1, padding: "6px 4px", fontSize: 12, borderColor: ratio === r ? "var(--accent)" : "var(--border)" }}>{r}</button>
              ))}
            </div>

            <div className="panel-label" style={{ marginTop: 16 }}>폰트</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FONTS.map((f) => {
                const active = (deck?.fontId ?? FONTS[0].id) === f.id;
                return (
                  <button key={f.id} onClick={() => deck && setDeck({ ...deck, fontId: f.id })}
                    className="btn" style={{ textAlign: "left", padding: "8px 10px", borderColor: active ? "var(--accent)" : "var(--border)" }}>
                    <div style={{ fontFamily: f.display, fontSize: 18, lineHeight: 1.1 }}>{f.name} 가나다 AaBb</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{f.mood}</div>
                  </button>
                );
              })}
            </div>
            {!deck && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>덱을 생성하면 테마·비율·폰트가 즉시 적용됩니다.</p>}
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">내 덱 <button className="btn" style={{ padding: "2px 6px", fontSize: 11, marginLeft: "auto" }} onClick={refreshDecks}>새로고침</button></div>
            {decks.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>저장된 덱이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {decks.map((d) => (
                  <button key={d.id} className="btn" style={{ textAlign: "left", padding: "6px 8px", fontSize: 12 }} onClick={() => openDeck(d.id)}>
                    {d.title} <span style={{ color: "var(--muted)" }}>· {d.slideCount}장</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ---- CENTER: canvas + thumbnails ---- */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div className="panel" style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {slide ? (
              <div style={{ width: "100%", maxWidth: ratio === "9:16" ? 420 : 880, boxShadow: "0 1px 12px rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
                <SlideRenderer slide={slide} theme={theme} ratio={ratio} index={sel} total={deck?.slides.length} />
              </div>
            ) : (
              <p style={{ color: "var(--muted)" }}>왼쪽에 소스를 넣고 “슬라이드 생성”을 눌러보세요.</p>
            )}
          </div>
          {deck && (
            <div className="panel" style={{ padding: 10, display: "flex", gap: 8, overflowX: "auto" }}>
              {deck.slides.map((s, i) => (
                <button key={s.id} onClick={() => setSel(i)} style={{ flex: "0 0 150px", border: i === sel ? "2px solid var(--accent)" : "1px solid var(--border)", borderRadius: 6, padding: 0, overflow: "hidden", background: "none" }}>
                  <SlideRenderer slide={s} theme={theme} ratio={ratio} />
                </button>
              ))}
            </div>
          )}
        </main>

        {/* ---- RIGHT: assistant + layout + media ---- */}
        <aside style={{ flex: "0 0 240px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">어시스턴트</div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>예: “3번 슬라이드를 인용으로”, “마지막에 요약 슬라이드 추가”</p>
            <textarea rows={3} placeholder="수정 요청…" value={assist} onChange={(e) => setAssist(e.target.value)} disabled={!deck || assistBusy} />
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={runAssist} disabled={!deck || assistBusy || !assist.trim()}>
              {assistBusy ? "수정 중…" : "수정 적용"}
            </button>
          </div>

          {slide && (
            <div className="panel" style={{ padding: 14 }}>
              <div className="panel-label">이 슬라이드 레이아웃</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {SEMANTIC_TYPES.map((t) => (
                  <button key={t} onClick={() => update({ type: t })} className="btn" style={{ padding: "6px 4px", fontSize: 12, borderColor: slide.type === t ? "var(--accent)" : "var(--border)", color: slide.type === t ? "var(--accent)" : "var(--text)" }}>
                    {TYPE_CATALOG[t].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {slide && (
            <div className="panel" style={{ padding: 14 }}>
              <div className="panel-label">이미지 <button className="btn" style={{ padding: "2px 6px", fontSize: 11, marginLeft: "auto" }} onClick={() => imgRef.current?.click()}>＋ 업로드</button></div>
              <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { addImage(e.target.files?.[0]); if (imgRef.current) imgRef.current.value = ""; }} />
              {(slide.media ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>이미지를 업로드하거나 “이미지 채우기”로 AI 생성하세요.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(slide.media ?? []).map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 44, height: 28, borderRadius: 4, overflow: "hidden", background: "rgba(125,125,125,0.14)", flex: "0 0 44px" }}>
                        {m.src && <img src={m.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <select value={m.role ?? "content"} onChange={(e) => setMediaRole(i, e.target.value as MediaRole)} style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}>
                        {ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                      </select>
                      <button className="btn" style={{ padding: "3px 8px", fontSize: 12, marginLeft: "auto" }} onClick={() => removeMedia(i)}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
    {deck && <PrintDeck deck={deck} theme={theme} />}
    </>
  );
}
