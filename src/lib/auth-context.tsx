"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthClient, getDbClient, googleProvider } from "./firebase/client";

export interface Profile {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: "free" | "pro";
  isAdmin: boolean;
  features: Record<string, boolean>;
  imageQuality: "low" | "medium" | "high";
}

const DEFAULT_FEATURES = { imageGen: true, research: true, export: false };

interface Ctx {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pw: string) => Promise<void>;
  signUpEmail: (email: string, pw: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx);

async function ensureProfile(user: User): Promise<Profile> {
  const db = getDbClient();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: Omit<Profile, "uid"> = {
      email: user.email,
      displayName: user.displayName,
      plan: "free",
      isAdmin: false,
      features: DEFAULT_FEATURES,
      imageQuality: "low",
    };
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
    return { uid: user.uid, ...profile };
  }
  const d = snap.data();
  return {
    uid: user.uid,
    email: d.email ?? user.email,
    displayName: d.displayName ?? user.displayName,
    plan: d.plan ?? "free",
    isAdmin: !!d.isAdmin,
    features: { ...DEFAULT_FEATURES, ...(d.features ?? {}) },
    imageQuality: d.imageQuality ?? "low",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (u) => {
      setUser(u);
      setProfile(u ? await ensureProfile(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: Ctx = {
    user,
    profile,
    loading,
    signInGoogle: async () => { await signInWithPopup(getAuthClient(), googleProvider); },
    signInEmail: async (e, p) => { await signInWithEmailAndPassword(getAuthClient(), e, p); },
    signUpEmail: async (e, p) => { await createUserWithEmailAndPassword(getAuthClient(), e, p); },
    signOut: async () => { await fbSignOut(getAuthClient()); },
    getToken: async () => {
      const u = getAuthClient().currentUser;
      return u ? u.getIdToken() : "";
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
