import { between, rnd, shuffle } from "../lib/random";
import { Card, CardData, MAXN, cardFromData, cardToData, genCard, hasBingo, hasLine, lineLeft, bingoLeft } from "./cards";
import { Cfg, FALSE_PENALTY, LEVELS, PERSONAS, PHRASES, SPEED_MS, prizeOf } from "./rules";
import { settings } from "../lib/settings";

export type Phase = "linea" | "bingo";
export type Who = "me" | `b${number}`;

/** Lo que la pantalla de juego (y la app) hacen cuando pasa algo en la partida. */
export interface GameUI {
  changed(): void;
  toast(msg: string): void;
  say(text: string): void;
  bubble(who: Who, text: string): void;
  drawing(): void;
  meWon(type: Phase, prize: number, ballCount: number): void;
  penalty(amount: number): void;
  finished(r: GameResult): void;
}

export interface Bot { persona: number; name: string; initials: string; color: string; cards: Card[]; claimFor: Phase | null }

export interface GameResult {
  bingo: boolean; line: boolean; lineW: string; bingoW: string;
  drawn: number; lastN: number | null; att: number; marked: number; missed: number[];
  cost: number; prizes: number; penalty: number; falseClaims: number; coinsBefore: number;
}

export interface GameData {
  cfg: Cfg; bag: number[]; drawn: number[]; phase: Phase; hints: number;
  prizes: number; penalty: number; cost: number; falseClaims: number; coinsBefore: number;
  me: CardData[]; bots: { persona: number; cards: CardData[] }[];
  lineWinners: Who[]; bingoWinners: Who[]; claim: { type: Phase; winners: Who[] } | null;
}

/** Temporizadores que se pueden pausar y reanudar conservando el tiempo que les quedaba. */
class Scheduler {
  private tasks = new Set<{ fn: () => void; remaining: number; start: number; id: ReturnType<typeof setTimeout> }>();
  paused = false;
  add(fn: () => void, ms: number) {
    const t = { fn, remaining: ms, start: 0, id: 0 as unknown as ReturnType<typeof setTimeout> };
    this.tasks.add(t); if (!this.paused) this.run(t); return t;
  }
  private run(t: { fn: () => void; remaining: number; start: number; id: ReturnType<typeof setTimeout> }) {
    t.start = performance.now();
    t.id = setTimeout(() => { this.tasks.delete(t); t.fn(); }, t.remaining);
  }
  cancel(t: unknown) { const x = t as { id: ReturnType<typeof setTimeout> }; if (t && this.tasks.has(t as never)) { clearTimeout(x.id); this.tasks.delete(t as never); } }
  pause() {
    if (this.paused) return; this.paused = true; const now = performance.now();
    this.tasks.forEach(t => { clearTimeout(t.id); t.remaining = Math.max(0, t.remaining - (now - t.start)); });
  }
  resume() { if (!this.paused) return; this.paused = false; this.tasks.forEach(t => this.run(t)); }
  clear() { this.tasks.forEach(t => clearTimeout(t.id)); this.tasks.clear(); }
  get size() { return this.tasks.size; }
}

const SPIN_MS = 950;

export class Game {
  cfg: Cfg;
  bag: number[];
  drawn: number[] = [];
  drawnSet = new Set<number>();
  phase: Phase = "linea";
  paused = false;
  over = false;
  spinning = false;
  checking = false;
  claim: { type: Phase; winners: Who[] } | null = null;
  banner: { title: string; sub: string } | null = null;
  callText = "¡Atentos, que empezamos!";
  me: Card[];
  bots: Bot[];
  hints = 3;
  prizes = 0;
  penalty = 0;
  cost: number;
  falseClaims = 0;
  coinsBefore: number;
  lineWinners: Who[] = [];
  bingoWinners: Who[] = [];
  ui: GameUI;
  private sched = new Scheduler();
  private drawTask: unknown = null;
  private spinTask: unknown = null;
  private restored = false;

  private constructor(cfg: Cfg, me: Card[], bots: Bot[], cost: number, coinsBefore: number, ui: GameUI) {
    this.cfg = cfg; this.me = me; this.bots = bots; this.cost = cost; this.coinsBefore = coinsBefore; this.ui = ui;
    this.bag = shuffle(Array.from({ length: MAXN }, (_, i) => i + 1));
  }

  static create(cfg: Cfg, myCards: Card[], cost: number, coinsBefore: number, ui: GameUI): Game {
    myCards.forEach(c => { c.marked = new Set(); c.missed = new Set(); });
    const personas = shuffle(PERSONAS.map((_, i) => i)).slice(0, cfg.players - 1);
    const bots = personas.map(pi => Game.makeBot(pi, Array.from({ length: cfg.cards }, genCard)));
    return new Game({ ...cfg }, myCards, bots, cost, coinsBefore, ui);
  }

  private static makeBot(pi: number, cards: Card[]): Bot {
    const p = PERSONAS[pi];
    return { persona: pi, name: p.n, initials: p.i, color: p.c, cards, claimFor: null };
  }

  static restore(d: GameData, ui: GameUI): Game {
    const g = new Game(d.cfg, d.me.map(cardFromData), d.bots.map(b => Game.makeBot(b.persona, b.cards.map(cardFromData))), d.cost, d.coinsBefore, ui);
    g.bag = d.bag.slice(); g.drawn = d.drawn.slice(); g.drawnSet = new Set(d.drawn);
    g.phase = d.phase; g.hints = d.hints; g.prizes = d.prizes; g.penalty = d.penalty; g.falseClaims = d.falseClaims;
    g.lineWinners = d.lineWinners || []; g.bingoWinners = d.bingoWinners || []; g.claim = d.claim || null;
    // Las marcas de los rivales que estaban "en camino" se pierden al guardar: las damos por despistes.
    g.bots.forEach(b => b.cards.forEach(c => c.nums.forEach(n => { if (g.drawnSet.has(n) && !c.marked.has(n)) c.missed.add(n); })));
    g.paused = true; g.sched.pause(); g.restored = true;
    g.callText = g.drawn.length ? Game.callTexts(g.drawn[g.drawn.length - 1]).disp : "¡Atentos, que empezamos!";
    if (g.claim) g.banner = { title: g.claim.type === "linea" ? "¡LÍNEA!" : "¡BINGO!", sub: "El crupier comprueba…" };
    return g;
  }

  serialize(): GameData {
    return {
      cfg: this.cfg, bag: this.bag, drawn: this.drawn, phase: this.phase, hints: this.hints,
      prizes: this.prizes, penalty: this.penalty, cost: this.cost, falseClaims: this.falseClaims, coinsBefore: this.coinsBefore,
      me: this.me.map(cardToData), bots: this.bots.map(b => ({ persona: b.persona, cards: b.cards.map(cardToData) })),
      lineWinners: this.lineWinners, bingoWinners: this.bingoWinners, claim: this.claim
    };
  }

  // ---------- helpers ----------
  name(w: Who) { return w === "me" ? "tú" : this.bots[+w.slice(1)].name; }
  names(ws: Who[]) { return ws.map(w => this.name(w)).join(" y "); }
  lastBall() { return this.drawn.length ? this.drawn[this.drawn.length - 1] : null; }
  botLeft(b: Bot) { return Math.min(...b.cards.map(c => this.phase === "linea" ? lineLeft(c) : bingoLeft(c))); }
  static callTexts(n: number) {
    const p = settings.phrases && PHRASES[n];
    const disp = p ? `El ${n}, ${p}` : `El ${n}`;
    return { disp, spoken: disp + (n > 10 && n % 10 && !p ? `. ${Math.floor(n / 10)}, ${n % 10}` : "") };
  }

  // ---------- flujo ----------
  start() { this.ui.say("¡Atentos, que empezamos!"); this.drawTask = this.sched.add(() => this.drawBall(), 2400); }

  private drawBall() {
    if (this.over) return;
    this.drawTask = null;
    if (!this.bag.length) { this.finish(); return; }
    this.spinning = true; this.callText = "Girando el bombo…";
    this.ui.drawing(); this.ui.changed();
    this.spinTask = this.sched.add(() => this.reveal(), SPIN_MS);
  }

  private reveal() {
    this.spinTask = null; this.spinning = false;
    if (this.over) return;
    const n = this.bag.pop()!; this.drawn.push(n); this.drawnSet.add(n);
    const t = Game.callTexts(n); this.callText = t.disp; this.ui.say(t.spoken);
    const lv = LEVELS[this.cfg.bots];
    this.bots.forEach((bot, bi) => bot.cards.forEach(c => {
      c.missed.forEach(m => { if (rnd(100) < 45) { c.missed.delete(m); this.sched.add(() => this.botMark(bi, c, m), between(lv.min, lv.max)); } });
      if (c.nums.has(n)) {
        if (rnd(1000) < lv.hit * 1000) this.sched.add(() => this.botMark(bi, c, n), between(lv.min, lv.max));
        else c.missed.add(n);
      }
    }));
    this.ui.changed();
    if (!this.claim) this.drawTask = this.sched.add(() => this.drawBall(), SPEED_MS[this.cfg.speed] - SPIN_MS);
  }

  private botMark(bi: number, c: Card, n: number) {
    if (this.over) return;
    c.marked.add(n); this.ui.changed();
    this.checkBot(bi, between(250, 900));
  }

  private checkBot(bi: number, delay: number) {
    const bot = this.bots[bi];
    if (bot.claimFor === this.phase) return;
    const ok = this.phase === "linea" ? bot.cards.some(hasLine) : bot.cards.some(hasBingo);
    if (ok) {
      bot.claimFor = this.phase; const ph = this.phase;
      this.sched.add(() => { if (!this.over && this.phase === ph) this.claimFor(`b${bi}`, ph); }, delay);
    }
  }

  private claimFor(who: Who, type: Phase) {
    if (this.over || this.phase !== type) return;
    const label = type === "linea" ? "¡LÍNEA!" : "¡BINGO!";
    this.ui.bubble(who, label);
    if (!this.claim) {
      this.claim = { type, winners: [who] };
      this.sched.cancel(this.drawTask); this.drawTask = null;
      if (this.spinTask) { this.sched.cancel(this.spinTask); this.spinTask = null; this.spinning = false; }
      this.banner = { title: label, sub: (who === "me" ? "La cantas tú" : `La canta ${this.name(who)}`) + " · el crupier comprueba…" };
      this.checking = true; this.callText = "Comprobando el cartón…";
      this.ui.say(type === "linea" ? "¡Línea! Comprobamos" : "¡Bingo! Comprobamos");
      this.sched.add(() => this.resolveClaim(), 2000);
    } else if (this.claim.type === type && !this.claim.winners.includes(who)) {
      this.claim.winners.push(who);
      this.banner = { title: label, sub: `¡Y también ${this.name(who)}! Se reparte el premio` };
    }
    this.ui.changed();
  }

  private resolveClaim() {
    if (!this.claim) return;
    const { type, winners } = this.claim; this.claim = null; this.checking = false;
    const meWon = winners.includes("me");
    const prize = Math.round(prizeOf(this.cfg, type) / winners.length);
    if (meWon) { this.prizes += prize; this.ui.meWon(type, prize, this.drawn.length); }
    if (type === "linea") {
      this.lineWinners = winners;
      this.banner = { title: meWon ? `+${prize} fichas` : "Línea correcta", sub: (meWon ? "¡Tu línea es buena!" : `Para ${this.names(winners)}`) + " · ahora, a por el bingo" };
      this.callText = "Seguimos para bingo";
      this.ui.say("¡Línea correcta! Seguimos para bingo");
      this.phase = "bingo";
      this.bots.forEach(b => { b.claimFor = null; });
      this.sched.add(() => { this.banner = null; this.ui.changed(); }, 2200);
      this.drawTask = this.sched.add(() => this.drawBall(), 2600);
      this.bots.forEach((_, bi) => this.checkBot(bi, between(2800, 3400)));
      this.ui.changed();
    } else {
      this.bingoWinners = winners;
      this.finish();
    }
  }

  // ---------- acciones del jugador ----------
  /** Marca o desmarca. Devuelve "notdrawn" si el número aún no ha salido. */
  toggleMark(ci: number, n: number): "notdrawn" | "marked" | "unmarked" | "ignored" {
    if (this.over || this.paused) return "ignored";
    if (!this.drawnSet.has(n)) return "notdrawn";
    const c = this.me[ci];
    if (c.marked.has(n)) { c.marked.delete(n); this.ui.changed(); return "unmarked"; }
    c.marked.add(n); this.ui.changed(); return "marked";
  }

  userClaim(type: Phase) {
    if (this.over || this.paused) return;
    if (this.phase !== type) { this.ui.toast("La línea ya se ha cantado. Ahora va el bingo."); return; }
    if (this.claim && this.claim.winners.includes("me")) return;
    if (this.me.some(type === "linea" ? hasLine : hasBingo)) { this.claimFor("me", type); return; }
    this.falseClaims++; this.penalty += FALSE_PENALTY;
    this.ui.bubble("me", "¡ups!");
    this.ui.toast(`Canto falso: no tienes ${type === "linea" ? "línea" : "bingo"} marcado. −${FALSE_PENALTY} fichas`);
    this.ui.penalty(FALSE_PENALTY);
    this.ui.changed();
  }

  /** Casillas de números ya salidos sin marcar: [cartón, número]. */
  missedCells(): [number, number][] {
    const out: [number, number][] = [];
    this.me.forEach((c, ci) => c.nums.forEach(n => { if (this.drawnSet.has(n) && !c.marked.has(n)) out.push([ci, n]); }));
    return out;
  }
  useHint(): [number, number][] | null {
    if (this.over || this.paused) return null;
    if (this.hints <= 0) { this.ui.toast("No te quedan pistas en esta partida"); return null; }
    const cells = this.missedCells();
    if (!cells.length) { this.ui.toast("Lo llevas todo al día. ¡Bien visto!"); return null; }
    this.hints--; this.ui.changed();
    return cells;
  }

  pause() {
    if (this.over || this.paused) return false;
    this.paused = true; this.sched.pause(); this.spinning = false; this.ui.changed(); return true;
  }
  resume() {
    if (!this.paused || this.over) return;
    this.paused = false;
    if (this.spinTask) this.spinning = true; else this.callText = "Seguimos…";
    this.sched.resume();
    if (this.restored) {
      this.restored = false;
      if (this.claim) this.sched.add(() => this.resolveClaim(), 1200);
      else this.bots.forEach((_, bi) => this.checkBot(bi, between(1500, 2500)));
    }
    if (!this.drawTask && !this.spinTask && !this.claim) this.drawTask = this.sched.add(() => this.drawBall(), 1500);
    this.ui.changed();
  }
  abandon() { this.over = true; this.sched.clear(); }

  private finish() {
    this.over = true; this.sched.clear(); this.spinning = false; this.checking = false; this.banner = null;
    const missed: number[] = [];
    this.me.forEach(c => c.nums.forEach(n => { if (this.drawnSet.has(n) && !c.marked.has(n)) missed.push(n); }));
    const mine = this.me.reduce((s, c) => s + [...c.nums].filter(n => this.drawnSet.has(n)).length, 0);
    this.ui.changed();
    this.ui.finished({
      bingo: this.bingoWinners.includes("me"), line: this.lineWinners.includes("me"),
      lineW: this.lineWinners.length ? this.names(this.lineWinners) : "nadie",
      bingoW: this.bingoWinners.length ? this.names(this.bingoWinners) : "",
      drawn: this.drawn.length, lastN: this.lastBall(),
      att: mine ? Math.round(100 * (mine - missed.length) / mine) : 100, marked: mine - missed.length, missed: missed.sort((a, b) => a - b),
      cost: this.cost, prizes: this.prizes, penalty: this.penalty, falseClaims: this.falseClaims, coinsBefore: this.coinsBefore
    });
  }
}
