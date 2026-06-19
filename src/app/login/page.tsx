"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const { user, signInGoogle, signInEmail, signUpEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState("");

  useEffect(() => { if (user) router.replace("/editor"); }, [user, router]);

  const submit = async () => {
    setErr("");
    try {
      if (mode === "in") await signInEmail(email, pw);
      else await signUpEmail(email, pw);
    } catch (e) {
      setErr("로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="panel" style={{ width: 360, padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>슬라이드 메이커</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 24px", fontSize: 14 }}>원고를 넣으면 레이아웃이 따라옵니다.</p>

        <button className="btn" style={{ width: "100%", marginBottom: 16 }} onClick={() => signInGoogle()}>
          Google로 계속하기
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="비밀번호" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p style={{ color: "#a32d2d", fontSize: 13, margin: 0 }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={submit}>
            {mode === "in" ? "로그인" : "가입하기"}
          </button>
        </div>

        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, marginTop: 16, width: "100%" }}
        >
          {mode === "in" ? "계정이 없으신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </div>
  );
}
