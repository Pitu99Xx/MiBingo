const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const frame = () => document.getElementById("frame") as HTMLElement;

interface Part { x: number; y: number; vx: number; vy: number; w: number; h: number; c: string; r: number; vr: number; life: number; H: number }
let parts: Part[] = [], running = false;

export function confetti(n = 140, y = .25) {
  if (reduceMotion()) return;
  const cv = document.getElementById("fx") as HTMLCanvasElement | null; if (!cv) return;
  const box = frame().getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = box.width * dpr; cv.height = box.height * dpr;
  const c = cv.getContext("2d")!; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ["#e0442e", "#f3b73b", "#1aa3c2", "#6fa83a", "#7b55d6", "#fbf5e6", "#c94ca0"];
  for (let i = 0; i < n; i++) parts.push({ x: box.width / 2 + (Math.random() - .5) * 80, y: box.height * y, vx: (Math.random() - .5) * 11, vy: -Math.random() * 10 - 3, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: cols[i % cols.length], r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 150 + Math.random() * 80, H: box.height });
  if (!running) { running = true; requestAnimationFrame(loop); }
  function loop() {
    c.clearRect(0, 0, cv!.width, cv!.height);
    parts.forEach(p => {
      p.vy += .22; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); c.restore();
    });
    parts = parts.filter(p => p.life > 0 && p.y < p.H + 30);
    if (parts.length) requestAnimationFrame(loop); else { running = false; c.clearRect(0, 0, cv!.width, cv!.height); }
  }
}

export type CoinMode = "rain" | "spill" | "gather";
/** Monedas animadas. `from` en coordenadas relativas al marco; "gather" vuelan al contador de fichas. */
export function coinFx(n: number, mode: CoinMode, from?: { x: number; y: number }) {
  if (reduceMotion()) return;
  const box = frame(), br = box.getBoundingClientRect();
  const target = document.getElementById("coins-chip");
  const tr = target ? target.getBoundingClientRect() : { left: br.right - 60, top: br.top + 40, width: 0, height: 0 };
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span"); c.className = "coinfx " + mode;
    c.style.setProperty("--dx", (Math.random() - .5) * 260 + "px");
    if (mode === "rain") { c.style.left = Math.random() * 100 + "%"; c.style.animationDelay = Math.random() * .8 + "s"; }
    else {
      const x0 = from ? from.x : br.width / 2, y0 = from ? from.y : br.height / 2;
      c.style.left = x0 - 11 + (Math.random() - .5) * 40 + "px"; c.style.top = y0 - 11 + (Math.random() - .5) * 30 + "px";
      c.style.animationDelay = i * .04 + "s";
      if (mode === "gather") {
        c.style.setProperty("--tx", tr.left - br.left + tr.width / 2 - x0 + "px");
        c.style.setProperty("--ty", tr.top - br.top + tr.height / 2 - y0 + "px");
      }
    }
    box.appendChild(c); setTimeout(() => c.remove(), 2800);
  }
}

/** Posición del centro de un elemento relativa al marco de la app. */
export function centerOf(el: Element | null): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect(), br = frame().getBoundingClientRect();
  return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2 };
}
