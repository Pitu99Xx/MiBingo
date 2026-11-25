import { useCallback, useEffect, useRef, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { increment } from "firebase/firestore";
import { auth } from "./firebase";
import { Ball } from "./components";
import { Login, ProfileSetup, VerifyEmail, authError } from "./screens/Auth";
import { Custom, Home, HowTo, Pick, SettingsScreen, StatsScreen } from "./screens/Menu";
import { Bankrupt, GameScreen, GameVisuals } from "./screens/GameScreen";
import { Game, GameResult, GameUI } from "./game/engine";
import { Card } from "./game/cards";
import { Cfg, DAILY_BONUS, DAILY_MAX_BALL, PRICE, QUICK, START_COINS, costOf } from "./game/rules";
import { Profile, SavedGame, deleteProfile, deleteSaved, loadSaved, patchProfile, saveGame, todayKey, watchProfile } from "./lib/profile";
import { DEFAULT_SETTINGS, Settings, applySettings, settings as liveSettings } from "./lib/settings";
import { onToast, toast } from "./lib/toast";
import { coinSound, fanfare, hush, rattle, sadTrombone, say, vibe } from "./lib/sound";
import { centerOf, coinFx, confetti } from "./lib/fx";
import { APP_VERSION, justUpdatedFrom, useUpdater } from "./lib/version";

type Screen = "home" | "custom" | "pick" | "game" | "settings" | "howto" | "stats";
type Result = GameResult & { coinsAfter: number };

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [screen, setScreen] = useState<Screen>("home");
  const [settingsReturn, setSettingsReturn] = useState<Screen>("home");
  const [cfg, setCfg] = useState<Cfg>(QUICK);
  const [pickFrom, setPickFrom] = useState<Screen>("home");
  const [welcome, setWelcome] = useState(false);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [bankrupt, setBankrupt] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; id: number } | null>(null);

  const gameRef = useRef<Game | null>(null);
  const visualsRef = useRef<GameVisuals | null>(null);
  const coinsRef = useRef(0);
  const profileRef = useRef<Profile | null>(null);
  const uid = user?.uid || "";

  // ---------- avisos ----------
  useEffect(() => {
    let t = 0;
    onToast(msg => { setToastMsg({ msg, id: Date.now() }); clearTimeout(t); t = window.setTimeout(() => setToastMsg(null), 2600); });
    return () => onToast(null);
  }, []);

  // ---------- actualizaciones ----------
  useEffect(() => { if (justUpdatedFrom()) window.setTimeout(() => toast(`Actualizado a la versión ${APP_VERSION}`), 800); }, []);
  // Se recarga sola si no estás jugando ni rellenando un formulario; si no, avisa y espera.
  const calm = !!profile && !bankrupt && !welcome && (screen === "home" || screen === "howto" || screen === "stats") && !(gameRef.current && !gameRef.current.over && !gameRef.current.paused);
  const pendingVersion = useUpdater(calm);

  // ---------- sesión y perfil ----------
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); if (!u) { setProfile(undefined); gameRef.current?.abandon(); gameRef.current = null; setSaved(null); setScreen("home"); } }), []);
  const needsVerify = !!user && !user.emailVerified && user.providerData.some(p => p.providerId === "password");
  useEffect(() => {
    if (!user || needsVerify) return;
    setProfile(undefined);
    return watchProfile(user.uid, p => {
      setProfile(p); profileRef.current = p;
      if (p) { coinsRef.current = p.coins; applySettings(p.settings); }
    }, e => toast(authError(e)));
  }, [user, needsVerify]);
  useEffect(() => {
    if (!uid || !profile) return;
    loadSaved(uid).then(setSaved).catch(() => setSaved(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, !!profile]);

  // ---------- fichas ----------
  const setCoins = useCallback((v: number, extra: Record<string, unknown> = {}) => {
    const c = Math.max(0, Math.round(v)); coinsRef.current = c;
    const best = Math.max(profileRef.current?.stats.best || 0, c);
    return patchProfile(uid, { coins: c, "stats.best": best, ...extra }).catch(e => toast(authError(e)));
  }, [uid]);

  // ---------- partida ----------
  const ui: GameUI = {
    changed: () => setVersion(v => v + 1),
    toast,
    say: t => { const ms = say(t); visualsRef.current?.talk(ms); },
    bubble: (w, t) => visualsRef.current?.bubble(w, t),
    drawing: () => rattle(),
    meWon: (type, prize, balls) => {
      const from = centerOf(document.querySelector(".seat.me"));
      coinFx(12, "gather", from ? { x: from.x, y: from.y - 20 } : undefined); coinSound(10); vibe([60, 40, 120]);
      let bonus = 0; const extra: Record<string, unknown> = {};
      if (type === "linea") {
        confetti(70, .3); fanfare(); visualsRef.current?.happy();
        extra["stats.lines"] = increment(1);
        const d = profileRef.current?.daily;
        if (balls <= DAILY_MAX_BALL && !(d && d.date === todayKey() && d.done)) {
          bonus = DAILY_BONUS; extra.daily = { date: todayKey(), done: true };
          window.setTimeout(() => toast(`¡Reto del día cumplido! +${DAILY_BONUS} fichas`), 1600);
        }
      } else extra["stats.bingos"] = increment(1);
      setCoins(coinsRef.current + prize + bonus, extra);
    },
    penalty: amt => { setCoins(coinsRef.current - amt); vibe([30, 30, 30]); },
    finished: r => {
      const after = coinsRef.current;
      patchProfile(uid, { "stats.games": increment(1), "stats.marked": increment(r.marked), "stats.missed": increment(r.missed.length) }).catch(() => {});
      deleteSaved(uid).catch(() => {}); setSaved(null);
      setResult({ ...r, coinsAfter: after });
      if (r.bingo) { confetti(180, .2); window.setTimeout(() => confetti(120, .35), 600); coinFx(26, "rain"); fanfare(); coinSound(14); ui.say("¡Bingo! ¡Enhorabuena!"); vibe([80, 50, 80, 50, 200]); }
      else if (r.line) { confetti(60, .3); coinSound(6); }
      else { sadTrombone(); if (r.bingoW) ui.say(`¡Bingo para ${r.bingoW}!`); }
    }
  };
  // El motor guarda una referencia a `ui`; la refrescamos en cada render para que vea el estado actual.
  if (gameRef.current) gameRef.current.ui = ui;

  function startGame(cards: Card[]) {
    const cost = costOf(cfg);
    if (coinsRef.current < cost) { toast("No te llegan las fichas para estos cartones"); return; }
    if (saved) { deleteSaved(uid).catch(() => {}); setSaved(null); }
    gameRef.current?.abandon();
    const before = coinsRef.current;
    setCoins(before - cost);
    const g = Game.create(cfg, cards, cost, before, ui);
    gameRef.current = g; setResult(null); setScreen("game");
    toast(`Pagas ${cost} fichas por ${cfg.cards} ${cfg.cards === 1 ? "cartón" : "cartones"}`);
    g.start();
  }
  const pauseGame = useCallback(() => {
    const g = gameRef.current; if (!g || !g.pause()) return;
    hush();
    const data = g.serialize();
    setSaved({ data, drawn: data.drawn.length });
    saveGame(uid, data).catch(e => toast("No se ha podido guardar la partida: " + authError(e)));
  }, [uid]);
  function resumeFromHome() {
    if (gameRef.current && !gameRef.current.over) { setScreen("game"); return; }
    if (!saved) return;
    try { gameRef.current = Game.restore(saved.data, ui); setResult(null); setScreen("game"); }
    catch { toast("No se ha podido recuperar la partida"); deleteSaved(uid).catch(() => {}); setSaved(null); }
  }
  function abandon() {
    gameRef.current?.abandon(); gameRef.current = null; hush();
    deleteSaved(uid).catch(() => {}); setSaved(null); setScreen("home"); toast("Partida abandonada");
  }
  function closeGame() { gameRef.current = null; setResult(null); setScreen("home"); }

  // Pausa automática al salir de la app o bloquear el móvil.
  useEffect(() => {
    const h = () => { if (document.hidden && screen === "game" && liveSettings.autopause) pauseGame(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [screen, pauseGame]);

  // Bancarrota: sin fichas para un cartón y sin partida pendiente.
  useEffect(() => {
    if (profile && screen === "home" && !saved && !welcome && profile.coins < PRICE && !bankrupt) setBankrupt(true);
  }, [profile, screen, saved, welcome, bankrupt]);

  // ---------- pantallas ----------
  let body: React.ReactNode;
  if (user === undefined || (user && !needsVerify && profile === undefined)) {
    body = <div className="splash"><Ball n={90} color="#e0442e" /><p className="small">Barajando cartones…</p></div>;
  } else if (!user) body = <Login />;
  else if (needsVerify) body = <VerifyEmail user={user} />;
  else if (!profile) body = <ProfileSetup user={user} onCreated={() => { setWelcome(true); setScreen("home"); }} />;
  else {
    const g = gameRef.current;
    const settings: Settings = { ...DEFAULT_SETTINGS, ...profile.settings };
    switch (screen) {
      case "home":
        body = <Home profile={profile} welcome={welcome} onWelcomeDone={() => setWelcome(false)} savedDrawn={g && !g.over ? g.drawn.length : saved ? saved.drawn : null}
          onQuick={() => { if (coinsRef.current < costOf(QUICK)) { toast(`La rápida cuesta ${costOf(QUICK)} fichas. Prueba una personalizada con menos cartones.`); return; } setCfg({ ...QUICK, speed: cfg.speed }); setPickFrom("home"); setScreen("pick"); }}
          onCustom={() => setScreen("custom")} onResume={resumeFromHome}
          go={s => { if (s === "settings") setSettingsReturn("home"); setScreen(s); }}
          onLogout={() => { pauseGame(); signOut(auth); }} />;
        break;
      case "custom":
        body = <Custom cfg={cfg} setCfg={setCfg} coins={profile.coins} onBack={() => setScreen("home")} onNext={() => { setPickFrom("custom"); setScreen("pick"); }} />;
        break;
      case "pick":
        body = <Pick cfg={cfg} coins={profile.coins} onBack={() => setScreen(pickFrom)} onPlay={startGame} />;
        break;
      case "game":
        body = g ? <GameScreen game={g} version={version} coins={profile.coins} playerName={profile.name} playerColor={profile.color} result={result}
          onPause={pauseGame} onResume={() => g.resume()} onExit={() => setScreen("home")} onAbandon={abandon}
          onSettings={() => { setSettingsReturn("game"); setScreen("settings"); }}
          onAgain={() => { const c = g.cfg; setCfg(c); closeGame(); if (coinsRef.current < costOf(c)) { toast("No te llega para tantos cartones: elige menos"); setScreen("custom"); } else { setPickFrom("home"); setScreen("pick"); } }}
          onMenu={closeGame} onBankrupt={() => setBankrupt(true)}
          bindVisuals={v => { visualsRef.current = v; }} /> : null;
        if (!g) window.setTimeout(() => setScreen("home"));
        break;
      case "settings":
        body = <SettingsScreen settings={settings} email={user.email || ""}
          onChange={(k, v) => { applySettings({ ...settings, [k]: v }); patchProfile(uid, { ["settings." + k]: v }).catch(e => toast(authError(e))); }}
          onBack={() => setScreen(settingsReturn === "game" && gameRef.current && !gameRef.current.over ? "game" : "home")}
          onDelete={async () => {
            try { gameRef.current?.abandon(); await deleteProfile(uid); await user.delete(); toast("Cuenta borrada"); }
            catch (e) { toast(authError(e)); throw e; }
          }} />;
        break;
      case "howto": body = <HowTo onBack={() => setScreen("home")} />; break;
      case "stats": body = <StatsScreen profile={profile} onBack={() => setScreen("home")} />; break;
    }
  }

  return (
    <div className="frame" id="frame">
      <div className="screens">{body}</div>
      {bankrupt && profile && (
        <Bankrupt coins={profile.coins}
          onRefill={async () => {
            coinFx(18, "gather", { x: 190, y: 700 }); confetti(90, .3); coinSound(16); fanfare();
            await setCoins(START_COINS, { "stats.bankrupt": increment(1) });
          }}
          onDone={() => { setBankrupt(false); closeGame(); }} />
      )}
      {pendingVersion && !calm && (
        <button type="button" className="update-pill" onClick={() => { pauseGame(); window.setTimeout(() => location.reload(), 600); }}>
          Versión {pendingVersion} lista · <b>Actualizar</b>
        </button>
      )}
      <canvas id="fx" />
      {toastMsg && <div className="toast" key={toastMsg.id} role="status">{toastMsg.msg}</div>}
    </div>
  );
}
