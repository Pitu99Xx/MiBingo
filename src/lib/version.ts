import { useEffect, useState } from "react";

export const APP_VERSION = __APP_VERSION__;
const KEY = "mibingo-version";

/** Devuelve la versión anterior si la app se acaba de actualizar (para avisar al jugador). */
export function justUpdatedFrom(): string | null {
  try {
    const prev = localStorage.getItem(KEY);
    localStorage.setItem(KEY, APP_VERSION);
    return prev && prev !== APP_VERSION ? prev : null;
  } catch { return null; }
}

async function latestVersion(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()).version || null;
  } catch { return null; }
}

/**
 * Comprueba cada pocos minutos (y al volver a la app) si hay una versión publicada más nueva.
 * Si `canReload` es verdadero se recarga sola; si no, devuelve la versión pendiente para avisar.
 */
export function useUpdater(canReload: boolean): string | null {
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (APP_VERSION === "dev") return;
    let stop = false;
    const check = async () => {
      const v = await latestVersion();
      if (!stop && v && v !== APP_VERSION) setPending(v);
    };
    const first = window.setTimeout(check, 3000);
    const every = window.setInterval(check, 3 * 60 * 1000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(first); clearInterval(every); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  useEffect(() => { if (pending && canReload) location.reload(); }, [pending, canReload]);
  return pending;
}
