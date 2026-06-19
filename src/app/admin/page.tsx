"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth-context";

interface Row {
  uid: string;
  email: string;
  plan: string;
  isAdmin: boolean;
  features: Record<string, boolean>;
  imageQuality: string;
}

const FLAGS = ["imageGen", "research", "export"];
// OpenAI image quality. Stored value is canonical; label is what the admin sees.
const QUALITIES: { value: string; label: string }[] = [
  { value: "low", label: "low" },
  { value: "medium", label: "mid" },
  { value: "high", label: "high" },
];

export default function Admin() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!profile?.isAdmin) { router.replace("/editor"); return; }
    (async () => {
      const snap = await getDocs(collection(getDbClient(), "users"));
      setRows(snap.docs.map((d) => ({ uid: d.id, email: d.data().email ?? "", plan: d.data().plan ?? "free", isAdmin: !!d.data().isAdmin, features: d.data().features ?? {}, imageQuality: d.data().imageQuality ?? "low" })));
    })();
  }, [profile, loading, router]);

  const toggleFlag = async (uid: string, flag: string) => {
    const row = rows.find((r) => r.uid === uid);
    if (!row) return;
    const next = { ...row.features, [flag]: !row.features[flag] };
    await updateDoc(doc(getDbClient(), "users", uid), { features: next });
    setRows(rows.map((r) => (r.uid === uid ? { ...r, features: next } : r)));
  };

  const setPlan = async (uid: string, plan: string) => {
    await updateDoc(doc(getDbClient(), "users", uid), { plan });
    setRows(rows.map((r) => (r.uid === uid ? { ...r, plan } : r)));
  };

  const setImageQuality = async (uid: string, imageQuality: string) => {
    await updateDoc(doc(getDbClient(), "users", uid), { imageQuality });
    setRows(rows.map((r) => (r.uid === uid ? { ...r, imageQuality } : r)));
  };

  if (loading || !profile?.isAdmin) return <div style={{ padding: 40 }}>확인 중…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>어드민 · 회원 관리</h1>
        <button className="btn" onClick={() => router.push("/editor")}>에디터로</button>
      </div>
      <div className="panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: 12 }}>이메일</th>
              <th style={{ padding: 12 }}>플랜</th>
              <th style={{ padding: 12 }}>이미지 품질</th>
              {FLAGS.map((f) => (<th key={f} style={{ padding: 12 }}>{f}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.uid} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 12 }}>{r.email}{r.isAdmin && <span style={{ color: "var(--accent)", marginLeft: 6 }}>(admin)</span>}</td>
                <td style={{ padding: 12 }}>
                  <select value={r.plan} onChange={(e) => setPlan(r.uid, e.target.value)} style={{ width: "auto", padding: "4px 8px" }}>
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                  </select>
                </td>
                <td style={{ padding: 12 }}>
                  <select value={r.imageQuality} onChange={(e) => setImageQuality(r.uid, e.target.value)} style={{ width: "auto", padding: "4px 8px" }}>
                    {QUALITIES.map((q) => (<option key={q.value} value={q.value}>{q.label}</option>))}
                  </select>
                </td>
                {FLAGS.map((f) => (
                  <td key={f} style={{ padding: 12 }}>
                    <input type="checkbox" style={{ width: "auto" }} checked={!!r.features[f]} onChange={() => toggleFlag(r.uid, f)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>
        최초 관리자 지정은 Firestore 콘솔에서 해당 users 문서의 isAdmin을 true로 바꾸면 됩니다.
      </p>
    </div>
  );
}
