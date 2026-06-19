"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SlideRenderer from "@/components/SlideRenderer";
import { THEMES, getTheme } from "@/engine/themes";
import { SEMANTIC_TYPES, type Deck, type SlideIR } from "@/engine/types";
import { TYPE_CATALOG } from "@/engine/semanticTypes";

export default function Editor() {
  const { user, profile, loading, getToken, signOut } = useAuth();
  const router = useRouter();

  const [src, setSrc] = useState("");
  const [research, setResearch] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  if (loading || !user) return <div style={{ padding: 40 }}>불러오는 중…</div>;

  const theme = getTheme(deck?.themeId ?? THEMES[0].id);
  const slide = deck?.slides[sel];

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
        body: JSON.stringify({ script: src.length > 120 ? src : undefined, topic: src.length <= 120 ? src : undefined, research: research ? "(웹 검색 결과를 여기에 주입)" : undefined }),
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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <strong>슬라이드 메이커</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={deck?.themeId ?? THEMES[0].id} onChange={(e) => deck && setDeck({ ...deck, themeId: e.target.value })} style={{ width: "auto", padding: "6px 10px" }}>
            {THEMES.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <button className="btn" onClick={fillImages} disabled={!deck || busy}>이미지 채우기</button>
          {profile?.isAdmin && <button className="btn" onClick={() => router.push("/admin")}>어드민</button>}
          <button className="btn" onClick={() => signOut()}>로그아웃</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", gap: 12, padding: 12, minHeight: 0 }}>
        <aside style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">소스 입력</div>
            <textarea rows={8} placeholder="주제 한 줄을 적거나, 원고 전체를 붙여넣으세요." value={src} onChange={(e) => setSrc(e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={research} onChange={(e) => setResearch(e.target.checked)} />
              검색으로 보강
            </label>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={generate} disabled={busy}>
              {busy ? "생성 중…" : "슬라이드 생성"}
            </button>
            {err && <p style={{ color: "#a32d2d", fontSize: 13 }}>{err}</p>}
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="panel-label">디자인</div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>테마는 상단에서 전환. 폰트·참조 업로드·콘텐츠 이미지 태깅은 다음 단계.</p>
          </div>
        </aside>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div className="panel" style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {slide ? (
              <div style={{ width: "100%", maxWidth: 880, boxShadow: "0 1px 12px rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
                <SlideRenderer slide={slide} theme={theme} />
              </div>
            ) : (
              <p style={{ color: "var(--muted)" }}>왼쪽에 소스를 넣고 “슬라이드 생성”을 눌러보세요.</p>
            )}
          </div>
          {deck && (
            <div className="panel" style={{ padding: 10, display: "flex", gap: 8, overflowX: "auto" }}>
              {deck.slides.map((s, i) => (
                <button key={s.id} onClick={() => setSel(i)} style={{ flex: "0 0 150px", border: i === sel ? "2px solid var(--accent)" : "1px solid var(--border)", borderRadius: 6, padding: 0, overflow: "hidden", background: "none" }}>
                  <SlideRenderer slide={s} theme={theme} />
                </button>
              ))}
            </div>
          )}
        </main>

        <aside style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="panel" style={{ padding: 14, flex: 1 }}>
            <div className="panel-label">어시스턴트</div>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>예: “3번 슬라이드를 인용으로 바꿔줘” — 자연어 수정은 다음 단계.</p>
            <input placeholder="수정 요청…" disabled />
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
        </aside>
      </div>
    </div>
  );
}
