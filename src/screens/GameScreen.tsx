import { useEffect, useRef, useState } from "react";
import { Ball, BomboArt, CardView, CoinsChip, DealerArt, initials } from "../components";
import { Game, GameResult, Who } from "../game/engine";
import { MAXN } from "../game/cards";
import { AV_COLORS, prizeOf } from "../game/rules";
import { settings } from "../lib/settings";
import { beep } from "../lib/sound";

export interface GameVisuals {
  bubble(who: Who, text: string): void;
  talk(ms: number): void;
  happy(): void;
}

export function GameScreen({ game, version, coins, playerName, playerColor, result, onPause, onResume, onExit, onAbandon, onSettings, onAgain, onMenu, onBankrupt, bindVisuals }: {
  game: Game; version: number; coins: number; playerName: string; playerColor: number; result: (GameResult & { coinsAfter: number }) | null;
  onPause: () => void; onResume: () => void; onExit: () => void; onAbandon: () => void; onSettings: () => void;
  onAgain: () => void; onMenu: () => void; onBankrupt: () => void; bindVisuals: (v: GameVisuals | null) => void;
}) {
  void version; // fuerza el repintado cuando cambia la partida
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [talking, setTalking] = useState(false);
  const [happy, setHappy] = useState(false);
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<string | null>(null);
  const [just, setJust] = useState<number | null>(null);
  const [board, setBoard] = useState(false);
  const [quit, setQuit] = useState(false);
  const [slide, setSlide] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    bindVisuals({
      bubble: (who, text) => { setBubbles(b => ({ ...b, [who]: text })); later(() => setBubbles(b => { const c = { ...b }; delete c[who]; return c; }), 1800); },
      talk: ms => { setTalking(true); later(() => setTalking(false), ms); },
      happy: () => { setHappy(true); later(() => setHappy(false), 1500); }
    });
    return () => bindVisuals(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = game.lastBall();
  // Modo fácil: ilumina el número recién salido si lo tienes.
  useEffect(() => {
    if (!settings.highlight || last === null) return;
    setJust(last); const t = window.setTimeout(() => setJust(null), 1800); return () => clearTimeout(t);
  }, [last]);

  function onCellClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".cell[data-n]"); if (!el) return;
    const n = +el.dataset.n!, ci = +el.dataset.ci!;
    const r = game.toggleMark(ci, n);
    if (r === "notdrawn") {
      setShake(`${ci}-${n}`); later(() => setShake(null), 400);
      game.ui.toast(`El ${n} todavía no ha salido`); beep(200, .12, "square", .04);
    } else if (r === "marked") {
      beep(620 + Math.random() * 120, .05);
      if (settings.vibe && navigator.vibrate) try { navigator.vibrate(15); } catch { /* */ }
      setHints(h => { if (!h.has(`${ci}-${n}`)) return h; const c = new Set(h); c.delete(`${ci}-${n}`); return c; });
    }
  }
  function hint() {
    const cells = game.useHint(); if (!cells) return;
    setHints(new Set(cells.map(([ci, n]) => `${ci}-${n}`))); later(() => setHints(new Set()), 3000);
    scrollToCard(cells[0][0]);
    const nCards = new Set(cells.map(c => c[0])).size;
    game.ui.toast((cells.length === 1 ? "Se te ha pasado 1 número" : `Se te han pasado ${cells.length} números`) + (nCards > 1 ? ` en ${nCards} cartones` : ""));
  }
  function scrollToCard(i: number) {
    const el = listRef.current?.children[i] as HTMLElement | undefined;
    if (el && listRef.current) listRef.current.scrollTo({ top: el.offsetTop - 4, behavior: "smooth" });
  }
  function onScroll() {
    const el = listRef.current; if (!el) return;
    const kids = [...el.children] as HTMLElement[];
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) { setSlide(kids.length - 1); return; }
    let best = 0; kids.forEach((k, i) => { if (k.offsetTop - 4 <= el.scrollTop + 20) best = i; }); setSlide(best);
  }

  // Asientos de los rivales alrededor de la mesa.
  const k = game.bots.length, L = Math.ceil(k / 2), R = k - L, angles: number[] = [];
  for (let i = 0; i < L; i++) angles.push(130 + 100 * (i + .5) / L);
  for (let i = 0; i < R; i++) angles.push(50 - 100 * (i + .5) / R);

  const phaseType = game.phase === "linea" ? "linea" : "bingo";
  const dealerCls = "dealer" + (game.spinning ? " drawing" : "") + (game.checking ? " checking" : "") + (talking ? " talking" : "") + (happy ? " happy" : "");
  const blur = game.paused && !game.over;

  return (
    <section className="screen s-game">
      <div className="g-top">
        <button className="pausebtn" aria-label="Pausar partida" type="button" onClick={onPause}><i /></button>
        <div className="counter"><b>Bola {game.drawn.length}</b>quedan {MAXN - game.drawn.length}</div>
        <CoinsChip value={coins} />
        <span className={"phase" + (phaseType === "bingo" ? " bingo" : "")}>{phaseType === "linea" ? "LÍNEA" : "BINGO"} <span className="coin" />{prizeOf(game.cfg, phaseType)}</span>
      </div>
      <div className="table-wrap">
        <div className={dealerCls}><DealerArt /></div>
        <div className="felt" />
        <div className={"bombo" + (game.spinning ? " fast" : "") + (game.drawn.length ? " pop" : "")}><BomboArt popKey={game.drawn.length} /></div>
        <div className="center">
          <div className="plate">{last !== null && <Ball key={game.drawn.length} n={last} className="drop" />}</div>
          <div className="calltext">{game.callText}</div>
        </div>
        {game.bots.map((b, i) => {
          const a = angles[i] * Math.PI / 180, left = game.botLeft(b);
          const x = Math.max(12, Math.min(88, 50 + 43 * Math.cos(a))), y = 66 + 27 * Math.sin(a);
          return (
            <div key={b.persona} className="seat" style={{ left: x + "%", top: y + "%" }}>
              {bubbles["b" + i] && <span className="bub">{bubbles["b" + i]}</span>}
              <div className="av" style={{ "--c": b.color } as React.CSSProperties}>{b.initials}</div>
              <div className="nm">{b.name}</div>
              <div className={"pill" + (left <= 1 ? " hot" : "")}>{left === 0 ? "¡lo tiene!" : left === 1 ? "¡le falta 1!" : `le faltan ${left}`}</div>
            </div>
          );
        })}
        <div className="seat me" style={{ left: "50%", top: "94%" }}>
          {bubbles.me && <span className="bub">{bubbles.me}</span>}
          <div className="av" style={{ "--c": AV_COLORS[playerColor] } as React.CSSProperties}>{initials(playerName)}</div>
          <div className="nm">Tú</div>
        </div>
        {game.banner && <div className="banner"><div><h3>{game.banner.title}</h3><p>{game.banner.sub}</p></div></div>}
      </div>
      <div className="last">
        <span className="lbl">Últimas</span>
        <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {game.drawn.length > 1 ? game.drawn.slice(-6, -1).reverse().map(n => <Ball key={n} n={n} size={28} />) : <span className="small">—</span>}
        </span>
        <button className="boardbtn" type="button" onClick={() => setBoard(true)}>Ver tablero</button>
      </div>
      <div className="cards-zone">
        <div className={"carousel" + (blur ? " blur" : "") + (settings.big ? " big" : "")} ref={listRef} onClick={onCellClick} onScroll={onScroll}>
          {game.me.map((c, ci) => (
            <div className="slide" key={ci}>
              <CardView card={c} ci={ci} interactive cellClass={n => (hints.has(`${ci}-${n}`) ? " hint" : "") + (shake === `${ci}-${n}` ? " shake" : "") + (just === n ? " just" : "")} />
            </div>
          ))}
        </div>
        {game.me.length > 1 && (
          <div className="dots">
            {game.me.map((_, i) => <button key={i} type="button" className={slide === i ? "on" : ""} aria-label={"Cartón " + (i + 1)} onClick={() => scrollToCard(i)} />)}
            <span className="lbl">Cartón {slide + 1} de {game.me.length} · desliza ↕</span>
          </div>
        )}
      </div>
      <div className="g-actions">
        <button className="claim l" type="button" disabled={game.phase !== "linea"} onClick={() => game.userClaim("linea")}>¡LÍNEA!</button>
        <button className="claim b" type="button" onClick={() => game.userClaim("bingo")}>¡BINGO!</button>
        {settings.hints && <button className="helpbtn" type="button" onClick={hint}><b>{game.hints}</b>pistas</button>}
      </div>

      {game.paused && !game.over && !quit && (
        <div className="overlay">
          <h2>En pausa</h2>
          <p>Vamos por la bola {game.drawn.length}. El crupier espera y tus cartones están tapados.</p>
          <button className="btn gold" type="button" onClick={onResume}>Reanudar</button>
          <button className="btn ghost" type="button" onClick={onSettings}>Ajustes</button>
          <button className="btn ghost" type="button" onClick={onExit}>Salir al menú (se guarda)</button>
          <button className="btn ghost" type="button" style={{ borderColor: "transparent", color: "var(--muted)" }} onClick={() => setQuit(true)}>Abandonar partida</button>
        </div>
      )}
      {quit && (
        <div className="overlay">
          <h2 style={{ fontSize: 30 }}>¿Abandonar?</h2>
          <p>Perderás las fichas de los cartones y los premios que llevas.</p>
          <button className="btn primary" type="button" onClick={() => { setQuit(false); onAbandon(); }}>Sí, abandonar</button>
          <button className="btn ghost" type="button" onClick={() => setQuit(false)}>Seguir jugando</button>
        </div>
      )}
      {board && (
        <div className="sheet">
          <div className="sheet-head"><h3>Tablero de bolas</h3><button className="back" aria-label="Cerrar" type="button" onClick={() => setBoard(false)}>×</button></div>
          <div className="board">
            {Array.from({ length: MAXN }, (_, i) => i + 1).map(n => <span key={n} className={(game.drawnSet.has(n) ? "on" : "") + (n === last ? " lastn" : "")}>{n}</span>)}
          </div>
          <p className="small" style={{ marginTop: 10 }}>Consultar el tablero no pausa la partida.</p>
        </div>
      )}
      {result && <ResultOverlay r={result} onAgain={onAgain} onMenu={onMenu} onBankrupt={onBankrupt} />}
    </section>
  );
}

function ResultOverlay({ r, onAgain, onMenu, onBankrupt }: { r: GameResult & { coinsAfter: number }; onAgain: () => void; onMenu: () => void; onBankrupt: () => void }) {
  const net = r.prizes - r.cost - r.penalty, win = r.bingo, partial = !r.bingo && r.line;
  const broke = r.coinsAfter < 20;
  const shown = useCountUpFrom(r.coinsBefore, r.coinsAfter);
  useEffect(() => { if (broke) { const t = window.setTimeout(onBankrupt, 3600); return () => clearTimeout(t); } }, [broke, onBankrupt]);
  const title = win ? "¡BINGO!" : partial ? "¡Línea para ti!" : r.bingoW ? `Bingo para ${r.bingoW}` : "Se acabaron las bolas";
  const sub = win ? "Te llevas el premio gordo de la mesa." : partial ? "No ha caído el bingo, pero te llevas la línea." : r.missed.length ? "Esta vez no ha habido suerte. La próxima cae." : "Estuviste atento, faltó suerte.";
  return (
    <div className={"overlay result" + (win || partial ? "" : " lose")}>
      <div className="mini">
        <div className={"dealer " + (win ? "happy" : partial ? "" : "sad")} style={{ position: "static", width: 80 }}><DealerArt /></div>
        {r.lastN !== null && <Ball n={r.lastN} size={54} />}
      </div>
      {win ? <div className="stamp gold">¡BINGO!</div> : <h2 style={{ fontSize: 30 }}>{title}</h2>}
      <p>{sub}</p>
      <div className="rlist">
        <div><span>Línea</span><b>{r.lineW}</b></div>
        <div><span>Bingo</span><b>{r.bingoW || "nadie"}</b></div>
        <div><span>Bolas sacadas · tu atención</span><b>{r.drawn} · {r.att} %</b></div>
        <div><span>Se te escaparon</span><b>{r.missed.length ? r.missed.join(", ") : "ninguno"}</b></div>
        <div><span>Cartones</span><b className="neg">−{r.cost}</b></div>
        {r.prizes > 0 && <div><span>Premios</span><b className="pos">+{r.prizes}</b></div>}
        {r.penalty > 0 && <div><span>Cantos falsos</span><b className="neg">−{r.penalty}</b></div>}
        <div className="tot"><span>Tus fichas</span><b>{shown} <span className={net >= 0 ? "pos" : "neg"}>({net >= 0 ? "+" : ""}{net})</span></b></div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {broke
          ? <button className="btn primary" type="button" onClick={onBankrupt}>Continuar</button>
          : <>
              <button className="btn gold" type="button" onClick={onAgain}>Revancha</button>
              <button className="btn ghost" type="button" onClick={onMenu}>Volver al menú</button>
            </>}
      </div>
    </div>
  );
}

function useCountUpFrom(from: number, to: number) {
  const [v, setV] = useState(from);
  useEffect(() => {
    const t0 = performance.now() + 500; let raf = 0;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / 1200)), e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(from + (to - from) * e)); if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return v;
}

export function Bankrupt({ coins, onRefill, onDone }: { coins: number; onRefill: () => Promise<void> | void; onDone: () => void }) {
  const [stage, setStage] = useState<"spill" | "empty" | "full">("spill");
  const [shown, setShown] = useState(coins);
  const coinRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    animate(coins, 0, 800, setShown);
    const t = window.setTimeout(() => { setStage("empty"); beep(110, .4, "square", .06); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="overlay bank">
      <div ref={coinRef} className={"bigcoin" + (stage === "empty" ? " empty" : stage === "full" ? " full" : "")}>{shown}</div>
      <div className="stamp" style={{ visibility: stage === "empty" ? "visible" : "hidden" }} key={stage}>BANCARROTA</div>
      <h2 style={{ fontSize: 28 }}>{stage === "full" ? "¡De vuelta a la mesa!" : "Te has quedado sin fichas"}</h2>
      <p>{stage === "full" ? "Tienes otra vez 500 fichas. Que la suerte te acompañe." : "No te llega ni para un cartón (20 fichas). No pasa nada: la casa invita."}</p>
      {stage === "empty" && <button className="btn gold" type="button" onClick={async () => { setStage("full"); animate(0, 500, 1100, setShown); await onRefill(); }}>Recibir 500 fichas</button>}
      {stage === "full" && <button className="btn gold" type="button" onClick={onDone}>Volver al menú</button>}
    </div>
  );
}
function animate(a: number, b: number, ms: number, set: (v: number) => void) {
  const t0 = performance.now();
  const step = (t: number) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); set(Math.round(a + (b - a) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
