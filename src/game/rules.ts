export const PRICE = 20;
export const START_COINS = 500;
export const FALSE_PENALTY = 10;
export const DAILY_BONUS = 100;
export const DAILY_MAX_BALL = 25;
export const MIN_AGE = 14;
export const SPLIT = { linea: .3, bingo: .7 } as const;

export type Speed = "lento" | "normal" | "rapido";
export type BotLevel = "despistados" | "normales" | "expertos";
export interface Cfg { players: number; cards: number; speed: Speed; bots: BotLevel }
export const QUICK: Cfg = { players: 4, cards: 3, speed: "normal", bots: "normales" };

export const SPEED_MS: Record<Speed, number> = { lento: 6000, normal: 4300, rapido: 2800 };
export const LEVELS: Record<BotLevel, { hit: number; min: number; max: number }> = {
  despistados: { hit: .72, min: 900, max: 2600 },
  normales: { hit: .9, min: 700, max: 1900 },
  expertos: { hit: 1, min: 400, max: 1100 }
};
export const PERSONAS = [
  { n: "Abuela Pura", i: "AP", c: "#c94ca0" }, { n: "Paco", i: "PA", c: "#3b6fd8" },
  { n: "Mari Carmen", i: "MC", c: "#f08a24" }, { n: "Don Ramón", i: "DR", c: "#1f9d74" },
  { n: "Lola", i: "LO", c: "#7b55d6" }, { n: "Toni", i: "TO", c: "#1aa3c2" }, { n: "Rocío", i: "RO", c: "#8a6a4a" }
];
export const AV_COLORS = ["#e0442e", "#f08a24", "#1f9d74", "#3b6fd8", "#7b55d6", "#c94ca0"];
export const PHRASES: Record<number, string> = { 1: "el primerito", 15: "la niña bonita", 22: "los dos patitos", 33: "la edad de Cristo", 50: "medio siglo", 90: "el abuelo" };

export const pot = (cfg: Cfg) => cfg.players * cfg.cards * PRICE;
export const prizeOf = (cfg: Cfg, type: "linea" | "bingo") => Math.round(pot(cfg) * SPLIT[type]);
export const costOf = (cfg: Cfg) => cfg.cards * PRICE;
