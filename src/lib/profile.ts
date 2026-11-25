import { Timestamp, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SETTINGS, Settings } from "./settings";
import { START_COINS } from "../game/rules";
import type { GameData } from "../game/engine";

export interface Stats { games: number; lines: number; bingos: number; marked: number; missed: number; bankrupt: number; best: number }
export interface Profile {
  name: string;
  birthDate: Timestamp;
  color: number;
  coins: number;
  stats: Stats;
  settings: Settings;
  daily?: { date: string; done: boolean };
}
export const EMPTY_STATS: Stats = { games: 0, lines: 0, bingos: 0, marked: 0, missed: 0, bankrupt: 0, best: START_COINS };

const userRef = (uid: string) => doc(db, "users", uid);
const savedRef = (uid: string) => doc(db, "users", uid, "saved", "current");

export function watchProfile(uid: string, cb: (p: Profile | null) => void, onErr: (e: Error) => void) {
  return onSnapshot(userRef(uid), s => cb(s.exists() ? (s.data() as Profile) : null), onErr);
}

export async function createProfile(uid: string, name: string, birth: Date, color: number) {
  await setDoc(userRef(uid), {
    name, birthDate: Timestamp.fromDate(birth), color, coins: START_COINS,
    stats: EMPTY_STATS, settings: DEFAULT_SETTINGS,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

/** Actualiza campos del perfil. Admite rutas con punto ("stats.games"). */
export function patchProfile(uid: string, patch: Record<string, unknown>) {
  return updateDoc(userRef(uid), { ...patch, updatedAt: serverTimestamp() });
}

export interface SavedGame { data: GameData; drawn: number }
export async function loadSaved(uid: string): Promise<SavedGame | null> {
  const s = await getDoc(savedRef(uid));
  return s.exists() ? (s.data() as SavedGame) : null;
}
export function saveGame(uid: string, data: GameData) {
  return setDoc(savedRef(uid), { data, drawn: data.drawn.length, savedAt: serverTimestamp() });
}
export function deleteSaved(uid: string) { return deleteDoc(savedRef(uid)); }
export async function deleteProfile(uid: string) {
  await deleteDoc(savedRef(uid)).catch(() => {});
  await deleteDoc(userRef(uid));
}

export function ageOf(d: Date): number {
  const n = new Date(); let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}
export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
