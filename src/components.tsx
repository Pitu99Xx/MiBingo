import { useEffect, useRef, useState } from "react";
import { Card, TINTS, ballColor } from "./game/cards";

export function Ball({ n, size, className, color }: { n: number | string; size?: number; className?: string; color?: string }) {
  const style = { "--bc": color || (typeof n === "number" ? ballColor(n) : undefined), ...(size ? { "--s": size + "px" } : {}) } as React.CSSProperties;
  return <div className={"ball" + (className ? " " + className : "")} style={style}><b>{n}</b></div>;
}

export function CardView({ card, ci = 0, interactive = false, cellClass }: {
  card: Card; ci?: number; interactive?: boolean; cellClass?: (n: number) => string;
}) {
  return (
    <div className="card" style={{ "--tint": TINTS[card.tint] } as React.CSSProperties}>
      <div className="card-head"><span>Serie {card.serie}</span><b>MiBingo</b><span>Nº {card.no}</span></div>
      <div className="grid">
        {card.grid.map((n, i) => {
          if (!n) return <span key={i} className="cell empty" />;
          const cls = "cell" + (card.marked.has(n) ? " marked" : "") + (cellClass ? cellClass(n) : "");
          return interactive
            ? <button key={i} type="button" className={cls} data-n={n} data-ci={ci} aria-label={"Número " + n}>{n}</button>
            : <span key={i} className={cls}>{n}</span>;
        })}
      </div>
    </div>
  );
}

/** Número que se anima al cambiar (contador de fichas). */
export function useCountUp(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current, b = value;
    if (a === b) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(b); from.current = b; return; }
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (b - a) * e); setShown(v); from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function CoinsChip({ value, override }: { value: number; override?: number | null }) {
  const shown = useCountUp(value);
  const [bump, setBump] = useState(0);
  const prev = useRef(value);
  const display = override ?? shown;
  useEffect(() => { if (prev.current !== value || override != null) setBump(b => b + 1); prev.current = value; }, [value, override]);
  return (
    <div className="chips" id="coins-chip" key={bump} style={bump ? { animation: "bump .4s" } : undefined} aria-label={`${value} fichas`}>
      <span className="coin" aria-hidden="true" /><span>{display}</span>
    </div>
  );
}

export function Avatar({ name, color, className }: { name: string; color: string; className?: string }) {
  return <div className={"avatar" + (className ? " " + className : "")} style={{ "--c": color } as React.CSSProperties}>{initials(name)}</div>;
}
export function initials(n: string) {
  return (n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function DealerArt() {
  return (
    <svg viewBox="0 0 84 96" aria-hidden="true">
      <path d="M10 96 C10 70 24 62 42 62 C60 62 74 70 74 96Z" fill="#2c2c34" />
      <path d="M34 63 L42 96 L50 63Z" fill="#fbf5e6" />
      <path d="M30 64 L38 68 L30 72Z M54 64 L46 68 L54 72Z" fill="#e0442e" />
      <circle cx="42" cy="68" r="2.6" fill="#b8321f" />
      <g className="arm"><path d="M62 74 Q76 76 80 62" stroke="#2c2c34" strokeWidth="9" strokeLinecap="round" fill="none" /><circle cx="80" cy="60" r="5" fill="#f1c7a0" /></g>
      <rect x="37" y="50" width="10" height="13" rx="3" fill="#e2ad83" />
      <g className="head">
        <circle cx="42" cy="36" r="17" fill="#f1c7a0" />
        <path d="M25 34 C24 20 33 15 42 15 C52 15 60 20 59 34 C56 26 49 23 42 23 C34 23 28 26 25 34Z" fill="#3a2a1d" />
        <rect x="27" y="11" width="30" height="7" rx="2" fill="#e0442e" />
        <rect x="23" y="16" width="38" height="4" rx="2" fill="#b8321f" />
        <g className="eyes"><circle cx="36" cy="37" r="2.1" fill="#231c17" /><circle cx="48" cy="37" r="2.1" fill="#231c17" /></g>
        <ellipse cx="31" cy="43" rx="3" ry="1.8" fill="#e89a86" opacity=".7" /><ellipse cx="53" cy="43" rx="3" ry="1.8" fill="#e89a86" opacity=".7" />
        <path d="M35 44 Q42 41 49 44 Q42 47 35 44Z" fill="#3a2a1d" />
        <ellipse className="mouth" cx="42" cy="48.5" rx="3.4" ry="1.3" fill="#8a2c1f" />
      </g>
    </svg>
  );
}

export function BomboArt({ popKey }: { popKey: number }) {
  return (
    <svg viewBox="0 0 92 96" aria-hidden="true">
      <path d="M30 90 L40 62 M62 90 L52 62" stroke="#8a5a33" strokeWidth="5" strokeLinecap="round" />
      <rect x="20" y="86" width="52" height="7" rx="3" fill="#6b4426" />
      <circle cx="46" cy="42" r="31" fill="rgba(255,255,255,.07)" />
      <g className="tumble">
        <circle cx="34" cy="56" r="5" fill="#e0442e" /><circle cx="45" cy="60" r="5" fill="#f3b73b" /><circle cx="57" cy="55" r="5" fill="#1aa3c2" />
        <circle cx="40" cy="49" r="5" fill="#6fa83a" /><circle cx="52" cy="47" r="5" fill="#7b55d6" /><circle cx="62" cy="62" r="4.5" fill="#c94ca0" />
      </g>
      <g className="cage">
        <circle cx="46" cy="42" r="31" fill="none" stroke="#f3b73b" strokeWidth="3" />
        <path d="M15 42 H77 M46 11 V73 M24 20 L68 64 M68 20 L24 64" stroke="#f3b73b" strokeWidth="1.3" opacity=".55" />
        <ellipse cx="46" cy="42" rx="12" ry="31" fill="none" stroke="#f3b73b" strokeWidth="1.6" opacity=".8" />
      </g>
      <g className="crank"><path d="M46 42 L46 6" stroke="#b7841d" strokeWidth="3" strokeLinecap="round" /><circle cx="46" cy="6" r="4" fill="#e0442e" /></g>
      <circle cx="46" cy="42" r="4.5" fill="#b7841d" />
      {popKey > 0 && <circle key={popKey} className="out" cx="46" cy="72" r="6" fill="#fffdf7" />}
    </svg>
  );
}
