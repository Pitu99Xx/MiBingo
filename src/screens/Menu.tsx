import { useEffect, useState } from "react";
import { Avatar, Ball, CardView, CoinsChip } from "../components";
import { Card, genCard } from "../game/cards";
import { AV_COLORS, Cfg, DAILY_BONUS, DAILY_MAX_BALL, MIN_AGE, PRICE, QUICK, SPEED_MS, costOf, pot, prizeOf } from "../game/rules";
import { Profile, todayKey } from "../lib/profile";
import { Settings } from "../lib/settings";
import { shuffle } from "../lib/random";
import { beep } from "../lib/sound";
import { coinFx } from "../lib/fx";
import { toast } from "../lib/toast";

/* ---------- Menú principal ---------- */
export function Home({ profile, welcome, onWelcomeDone, savedDrawn, onQuick, onCustom, onResume, go, onLogout }: {
  profile: Profile; welcome: boolean; onWelcomeDone: () => void; savedDrawn: number | null;
  onQuick: () => void; onCustom: () => void; onResume: () => void; go: (s: "howto" | "stats" | "settings") => void; onLogout: () => void;
}) {
  const [override, setOverride] = useState<number | null>(welcome ? 0 : null);
  useEffect(() => {
    if (!welcome) return;
    // Las monedas de bienvenida vuelan al contador y cada una suma su parte hasta 500.
    const n = 14, timers: number[] = [];
    toast("¡500 fichas de bienvenida!");
    timers.push(window.setTimeout(() => coinFx(n, "gather", { x: 190, y: 420 }), 300));
    for (let i = 0; i < n; i++) timers.push(window.setTimeout(() => {
      setOverride(Math.round(profile.coins * (i + 1) / n)); beep(1300 + i * 40, .05, "square", .025);
    }, 1300 + i * 40));
    timers.push(window.setTimeout(() => { setOverride(null); onWelcomeDone(); }, 1300 + n * 40 + 200));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome]);
  const dailyDone = profile.daily?.date === todayKey() && profile.daily.done;
  const quickCost = costOf(QUICK);
  return (
    <section className="screen">
      <div className="home-top">
        <Avatar name={profile.name} color={AV_COLORS[profile.color]} />
        <div className="who"><small>Hola,</small><br /><b style={{ fontSize: 18 }}>{profile.name}</b></div>
        <CoinsChip value={profile.coins} override={override} />
      </div>
      <div className="pad">
        {savedDrawn !== null && (
          <div className="resume"><span>Partida en pausa · bola {savedDrawn}</span><button type="button" onClick={onResume}>Continuar</button></div>
        )}
        <article className="quick">
          <div className="deco" aria-hidden="true"><Ball n={22} size={40} /><Ball n={90} size={40} /></div>
          <h3>Partida rápida</h3>
          <p>{QUICK.players} jugadores · {QUICK.cards} cartones cada uno<br />Se juega línea y bingo · <span className="price"><span className="coin" />{quickCost} fichas</span></p>
          <button className="btn gold" type="button" style={{ marginTop: 6 }} onClick={onQuick}>Jugar ahora</button>
        </article>
        <article className="custom">
          <div className="fan" aria-hidden="true"><span style={{ "--t": "#e9def8" } as React.CSSProperties} /><span style={{ "--t": "#d6ebf7" } as React.CSSProperties} /><span style={{ "--t": "#fde2c8" } as React.CSSProperties} /></div>
          <h3>Personalizada</h3>
          <p>Monta tu mesa: tú decides cuántos juegan, con cuántos cartones y a qué ritmo.</p>
          <div className="opts"><span>2–6 jugadores</span><span>1–5 cartones</span><span>3 ritmos</span></div>
          <button className="btn velvet" type="button" style={{ marginTop: 4 }} onClick={onCustom}>Montar mi partida</button>
        </article>
        {savedDrawn !== null && <p className="small" style={{ marginTop: -6 }}>Si empiezas otra partida, la que está en pausa se pierde.</p>}
        <div className="tiles">
          <button className="tile" type="button" onClick={() => go("howto")}><span className="ico">?</span>Cómo se juega</button>
          <button className="tile" type="button" onClick={() => go("stats")}><span className="ico">%</span>Mis números</button>
          <button className="tile" type="button" onClick={() => go("settings")}><span className="ico">⚙</span>Ajustes</button>
        </div>
        <div className="daily">
          <span className="tag">Reto del día</span><br />
          {dailyDone ? <>Reto de hoy cumplido. ¡Vuelve mañana a por otro!</> : <>Canta línea antes de la bola {DAILY_MAX_BALL} y gana <b>+{DAILY_BONUS} fichas</b>.</>}
        </div>
        <button className="btn ghost" type="button" style={{ fontSize: 13, padding: 9 }} onClick={onLogout}>Cerrar sesión</button>
      </div>
    </section>
  );
}

/* ---------- Partida personalizada ---------- */
export function Custom({ cfg, setCfg, coins, onBack, onNext }: { cfg: Cfg; setCfg: (c: Cfg) => void; coins: number; onBack: () => void; onNext: () => void }) {
  const rivals = cfg.players - 1, cost = costOf(cfg), ok = coins >= cost;
  const step = (k: "players" | "cards", d: number, min: number, max: number) => { setCfg({ ...cfg, [k]: Math.max(min, Math.min(max, cfg[k] + d)) }); beep(500, .04); };
  const seg = <K extends "speed" | "bots">(k: K, opts: [Cfg[K], string][]) => (
    <div className="seg">{opts.map(([v, l]) => <button key={v} type="button" className={cfg[k] === v ? "on" : ""} onClick={() => setCfg({ ...cfg, [k]: v })}>{l}</button>)}</div>
  );
  return (
    <section className="screen">
      <div className="topbar"><button className="back" aria-label="Volver" type="button" onClick={onBack}>‹</button><h2>Personalizada</h2></div>
      <div className="pad" style={{ paddingTop: 6 }}>
        <div className="field"><div><b>Jugadores en la mesa</b><small>Contándote a ti, máximo 6</small></div>
          <div className="stepper"><button type="button" aria-label="Menos" onClick={() => step("players", -1, 2, 6)}>−</button><output>{cfg.players}</output><button type="button" aria-label="Más" onClick={() => step("players", 1, 2, 6)}>+</button></div></div>
        <div className="field"><div><b>Cartones por jugador</b><small>Cada cartón cuesta {PRICE} fichas</small></div>
          <div className="stepper"><button type="button" aria-label="Menos" onClick={() => step("cards", -1, 1, 5)}>−</button><output>{cfg.cards}</output><button type="button" aria-label="Más" onClick={() => step("cards", 1, 1, 5)}>+</button></div></div>
        <div className="field col"><b>Velocidad del crupier</b>{seg("speed", [["lento", "Tranquilo"], ["normal", "Normal"], ["rapido", "Rápido"]])}</div>
        <div className="field col"><b>Rivales</b>{seg("bots", [["despistados", "Despistados"], ["normales", "Normales"], ["expertos", "Expertos"]])}</div>
        <div className="bill">
          <div><span>Tú + {rivals} {rivals === 1 ? "rival" : "rivales"} · {cfg.players * cfg.cards} cartones</span><b>bola cada {(SPEED_MS[cfg.speed] / 1000).toFixed(1).replace(".", ",")} s</b></div>
          <div><span>Pagas por tus {cfg.cards} {cfg.cards === 1 ? "cartón" : "cartones"}</span><b className={ok ? "" : "neg"}>{cost}</b></div>
          <div><span>Bote total</span><b>{pot(cfg)}</b></div>
          <div><span>Línea · Bingo</span><b className="pos">{prizeOf(cfg, "linea")} · {prizeOf(cfg, "bingo")}</b></div>
        </div>
        <button className="btn primary" type="button" disabled={!ok} onClick={onNext}>{ok ? "Elegir mis cartones" : `Te faltan ${cost - coins} fichas`}</button>
      </div>
    </section>
  );
}

/* ---------- Elegir cartones (exactamente N) ---------- */
export function Pick({ cfg, coins, onBack, onPlay }: { cfg: Cfg; coins: number; onBack: () => void; onPlay: (cards: Card[]) => void }) {
  const [cards, setCards] = useState<Card[]>(() => Array.from({ length: 10 }, genCard));
  const [sel, setSel] = useState<number[]>([]);
  const n = cfg.cards, cost = costOf(cfg), full = sel.length === n;
  function toggle(i: number) {
    if (sel.includes(i)) setSel(sel.filter(x => x !== i));
    else if (sel.length < n) { setSel([...sel, i]); beep(720, .05); }
    else toast(`Ya tienes ${n}. Quita uno para cambiarlo.`);
  }
  return (
    <section className="screen" style={{ overflow: "hidden" }}>
      <div className="topbar"><button className="back" aria-label="Volver" type="button" onClick={onBack}>‹</button><h2>{n === 1 ? "Elige 1 cartón" : `Elige ${n} cartones`}</h2><span className={"count" + (full ? " full" : "")}>{sel.length}/{n}</span></div>
      <div className="pick-head"><p>Toca los que te den buena espina. ¿No te convencen? Pide otros 10.</p></div>
      <div className="pick-list" id="pickList">
        {cards.map((c, i) => (
          <div key={c.no + i} className={"pick" + (sel.includes(i) ? " on" : "")} role="button" tabIndex={0} aria-pressed={sel.includes(i)}
            onClick={() => toggle(i)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}>
            <span className="tick">✓</span><CardView card={c} />
          </div>
        ))}
      </div>
      <div className="foot">
        <div className="pay"><span>Pagas <b>{cost}</b></span><span>Te quedan <b>{Math.max(0, coins - cost)}</b></span></div>
        <div className="row2">
          <button className="btn ghost" type="button" style={{ padding: 12 }} onClick={() => { setCards(Array.from({ length: 10 }, genCard)); setSel([]); document.getElementById("pickList")?.scrollTo(0, 0); toast("Diez cartones nuevos"); }}>Otros 10</button>
          <button className="btn ghost" type="button" style={{ padding: 12 }} onClick={() => setSel(shuffle([...Array(10).keys()]).slice(0, n))}>Al azar</button>
          <button className="btn primary" type="button" disabled={!full || coins < cost} onClick={() => onPlay([...sel].sort((a, b) => a - b).map(i => cards[i]))}>
            {coins < cost ? "Sin fichas" : full ? "A la mesa" : `Faltan ${n - sel.length}`}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Ajustes ---------- */
const SETTING_ROWS: [keyof Settings, string, string][] = [
  ["voice", "Voz del crupier", "Parlotea en su idioma cada vez que canta"],
  ["phrases", "Frases de bingo", "“El 15, la niña bonita”"],
  ["sound", "Sonidos", "Bombo, marcado y premios"],
  ["vibe", "Vibración", "Al marcar y al cantar"],
  ["hints", "Pistas", "3 por partida: señalan números que se te han pasado"],
  ["highlight", "Resaltar al salir", "Modo fácil: ilumina el número si lo tienes"],
  ["big", "Números grandes", "Cartones más legibles"],
  ["autopause", "Pausa automática", "Si sales de la app o bloqueas el móvil"]
];
export function SettingsScreen({ settings, onChange, onBack, email, onDelete }: {
  settings: Settings; onChange: (k: keyof Settings, v: boolean) => void; onBack: () => void; email: string; onDelete: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const row = ([k, t, d]: [keyof Settings, string, string]) => (
    <label className="row" key={k}><div>{t}<small>{d}</small></div><input type="checkbox" className="sw" id={"set-" + k} checked={settings[k]} onChange={e => onChange(k, e.target.checked)} /></label>
  );
  return (
    <section className="screen">
      <div className="topbar"><button className="back" aria-label="Volver" type="button" onClick={onBack}>‹</button><h2>Ajustes</h2></div>
      <div className="pad" style={{ paddingTop: 6 }}>
        <p className="sec-t">Crupier</p>
        <div className="list">{SETTING_ROWS.slice(0, 4).map(row)}</div>
        <p className="sec-t">Ayudas</p>
        <div className="list">{SETTING_ROWS.slice(4).map(row)}</div>
        <p className="sec-t">Cuenta</p>
        <div className="list">
          <div className="row"><div>Sesión iniciada como<small className="mail" style={{ color: "var(--muted)" }}>{email}</small></div></div>
        </div>
        {!confirm
          ? <button className="btn ghost danger" type="button" onClick={() => setConfirm(true)}>Borrar mi cuenta</button>
          : <div className="list" style={{ padding: 14, display: "grid", gap: 10 }}>
              <b>¿Seguro? Se borran tu perfil, tus fichas y tus estadísticas.</b>
              <button className="btn primary" type="button" onClick={() => onDelete().catch(() => setConfirm(false))}>Sí, borrar mi cuenta</button>
              <button className="btn ghost" type="button" onClick={() => setConfirm(false)}>Cancelar</button>
            </div>}
      </div>
    </section>
  );
}

/* ---------- Cómo se juega ---------- */
export function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <section className="screen">
      <div className="topbar"><button className="back" aria-label="Volver" type="button" onClick={onBack}>‹</button><h2>Cómo se juega</h2></div>
      <div className="pad howto" style={{ paddingTop: 6 }}>
        <ol>
          <li>Compra tus cartones: <b>{PRICE} fichas</b> cada uno. Todo lo que se paga va al <b>bote</b>.</li>
          <li>Cada cartón tiene <b>15 números</b> en 3 filas de 5. Si tienes varios, van uno debajo de otro: <b>desliza hacia arriba o abajo</b>.</li>
          <li>El crupier saca bolas del <b>1 al 90</b>, sin repetir.</li>
          <li><b>Toca el número</b> en tu cartón cuando salga. Nadie lo hace por ti.</li>
          <li>¿Fila completa? Pulsa <b>¡LÍNEA!</b> antes que nadie. Solo hay una línea por partida.</li>
          <li>¿Cartón completo? Pulsa <b>¡BINGO!</b> y se acaba la partida.</li>
          <li>Si cantas sin tenerlo es <b>canto falso</b>: pierdes 10 fichas.</li>
          <li>Si dos jugadores cantan con la misma bola, se reparten el premio.</li>
          <li>Si te quedas sin fichas, la casa te devuelve a <b>500</b>.</li>
        </ol>
        <div className="list">
          <div className="row"><div>Línea<small>30 % del bote</small></div><b>{prizeOf(QUICK, "linea")}</b></div>
          <div className="row"><div>Bingo<small>70 % del bote</small></div><b>{prizeOf(QUICK, "bingo")}</b></div>
          <div className="row"><div>Canto falso</div><b>−10</b></div>
        </div>
        <p className="small">Ejemplo con la partida rápida: {QUICK.players} jugadores × {QUICK.cards} cartones × {PRICE} fichas = bote de {pot(QUICK)}. MiBingo es para mayores de {MIN_AGE} años y no usa dinero real.</p>
      </div>
    </section>
  );
}

/* ---------- Estadísticas ---------- */
export function StatsScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const s = profile.stats, tot = s.marked + s.missed;
  const items: [string | number, string][] = [
    [s.games, "partidas"], [s.lines, "líneas cantadas"], [s.bingos, "bingos"], [tot ? Math.round(100 * s.marked / tot) + " %" : "—", "atención media"],
    [profile.coins, "fichas ahora"], [s.best, "récord de fichas"], [s.missed, "números escapados"], [s.bankrupt, "bancarrotas"]
  ];
  return (
    <section className="screen">
      <div className="topbar"><button className="back" aria-label="Volver" type="button" onClick={onBack}>‹</button><h2>Mis números</h2></div>
      <div className="pad" style={{ paddingTop: 6 }}>
        <div className="statgrid">{items.map(([v, l]) => <div className="stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      </div>
    </section>
  );
}

