import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Service account is provided as a single base64-encoded JSON env var on Vercel.
function init(): App {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set");
  }
  const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  return initializeApp({ credential: cert(json) });
}

export function adminAuth() {
  return getAuth(init());
}
export function adminDb() {
  return getFirestore(init());
}

// Verify the bearer token from a request and return the uid + admin flag.
export async function requireUser(req: Request): Promise<{ uid: string; isAdmin: boolean }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("unauthenticated");
  const decoded = await adminAuth().verifyIdToken(token);
  const snap = await adminDb().collection("users").doc(decoded.uid).get();
  return { uid: decoded.uid, isAdmin: !!snap.data()?.isAdmin };
}
