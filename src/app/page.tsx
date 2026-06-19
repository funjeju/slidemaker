"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/editor" : "/login");
  }, [user, loading, router]);
  return <div style={{ padding: 40, color: "var(--muted)" }}>불러오는 중…</div>;
}
