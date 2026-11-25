import { between, rnd, shuffle } from "../lib/random";

export const MAXN = 90;
export const COLS = 9;

/** Cartón de 3×9 con 15 números (5 por fila). `grid` va por filas: 27 casillas, 0 = hueco. */
export interface Card {
  grid: number[];
  nums: Set<number>;
  marked: Set<number>;
  missed: Set<number>; // solo rivales: números que se les han pasado
  serie: number;
  no: string;
  tint: number;
}

function colRange(c: number): [number, number] {
  return c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9];
}

export function genCard(): Card {
  for (;;) {
    const counts = Array(COLS).fill(1); let extra = 6;
    while (extra > 0) { const c = rnd(COLS); if (counts[c] < 3) { counts[c]++; extra--; } }
    const rows = [0, 0, 0], colRows: number[][] = [];
    for (let c = 0; c < COLS; c++) {
      const r = shuffle([0, 1, 2]).slice(0, counts[c]).sort();
      colRows.push(r); r.forEach(x => rows[x]++);
    }
    if (rows.some(x => x !== 5)) continue;
    const grid = Array(27).fill(0);
    for (let c = 0; c < COLS; c++) {
      const [a, b] = colRange(c);
      const pool = shuffle(Array.from({ length: b - a + 1 }, (_, i) => a + i)).slice(0, counts[c]).sort((x, y) => x - y);
      colRows[c].forEach((r, i) => { grid[r * COLS + c] = pool[i]; });
    }
    return {
      grid, nums: new Set(grid.filter(Boolean)), marked: new Set(), missed: new Set(),
      serie: between(1, 9), no: String(between(1, 9999)).padStart(4, "0"), tint: rnd(5)
    };
  }
}

export const rowOf = (c: Card, r: number) => c.grid.slice(r * COLS, r * COLS + COLS);
export const lineLeft = (c: Card) => Math.min(...[0, 1, 2].map(r => rowOf(c, r).filter(n => n && !c.marked.has(n)).length));
export const bingoLeft = (c: Card) => 15 - c.marked.size;
export const hasLine = (c: Card) => lineLeft(c) === 0;
export const hasBingo = (c: Card) => bingoLeft(c) === 0;

export interface CardData { grid: number[]; marked: number[]; missed: number[]; serie: number; no: string; tint: number }
export const cardToData = (c: Card): CardData => ({ grid: c.grid, marked: [...c.marked], missed: [...c.missed], serie: c.serie, no: c.no, tint: c.tint });
export const cardFromData = (d: CardData): Card => ({
  grid: d.grid, nums: new Set(d.grid.filter(Boolean)), marked: new Set(d.marked), missed: new Set(d.missed || []),
  serie: d.serie, no: d.no, tint: d.tint
});

export const TINTS = ["#fde2c8", "#d6ebf7", "#e3f1cf", "#f8d8e2", "#e9def8"];
const BALLC = ["#e0442e", "#f08a24", "#e0a91f", "#6fa83a", "#1f9d74", "#1aa3c2", "#3b6fd8", "#7b55d6", "#c94ca0"];
export const ballColor = (n: number) => BALLC[Math.min(8, Math.floor(n / 10))];
