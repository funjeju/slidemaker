"use client";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getDbClient } from "./firebase/client";
import type { Deck } from "@/engine/types";

// Decks live in the top-level `decks` collection, owned by ownerUid. The
// firestore.rules already gate read/write to the owner.

export interface DeckSummary {
  id: string;
  title: string;
  updatedAt: number;
  slideCount: number;
}

export async function saveDeck(deck: Deck, uid: string): Promise<void> {
  const db = getDbClient();
  const payload: Deck = {
    ...deck,
    ownerUid: uid,
    createdAt: deck.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  // Strip undefined fields — Firestore rejects them.
  await setDoc(doc(db, "decks", deck.id), JSON.parse(JSON.stringify(payload)));
}

export async function listDecks(uid: string): Promise<DeckSummary[]> {
  const db = getDbClient();
  // Filter by owner in the query; sort client-side to avoid a composite index.
  const q = query(collection(db, "decks"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as Deck;
      return {
        id: d.id,
        title: data.title || "제목 없음",
        updatedAt: data.updatedAt ?? 0,
        slideCount: data.slides?.length ?? 0,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadDeck(id: string): Promise<Deck | null> {
  const db = getDbClient();
  const snap = await getDoc(doc(db, "decks", id));
  return snap.exists() ? (snap.data() as Deck) : null;
}
