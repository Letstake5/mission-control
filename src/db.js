import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// ── Generic helpers ───────────────────────────────────────────────────────────

export async function fsGet(docPath, fallback) {
  try {
    const snap = await getDoc(doc(db, docPath));
    return snap.exists() ? snap.data().value : fallback;
  } catch {
    return fallback;
  }
}

export async function fsSet(docPath, value) {
  try {
    await setDoc(doc(db, docPath), { value });
  } catch (e) {
    console.error("fsSet error", docPath, e);
  }
}

// Subscribe to a document and call onChange(value) whenever it changes.
// Returns an unsubscribe function.
export function fsListen(docPath, fallback, onChange) {
  return onSnapshot(doc(db, docPath), (snap) => {
    onChange(snap.exists() ? snap.data().value : fallback);
  });
}

// ── Named accessors (keeps calling code readable) ─────────────────────────────

export const PATHS = {
  roster:   "app/roster",
  balances: "app/balances",
  streaks:  "app/streaks",
  pins:     "app/pins",
  reports:  (dateKey) => `reports/${dateKey}`,
  sessions: (dateKey) => `sessions/${dateKey}`, 
};
