// Tablets en vertical: ampliamos la app para que ocupe la pantalla entera con el mismo diseño
// del móvil, en vez de verse pequeña. Se hace con el ancho del viewport, así todo escala a la vez.
function fitViewport() {
  const meta = document.querySelector('meta[name="viewport"]'); if (!meta) return;
  const portrait = matchMedia("(orientation: portrait)").matches;
  const a = screen.width, b = screen.height;
  const W = portrait ? Math.min(a, b) : Math.max(a, b), H = portrait ? Math.max(a, b) : Math.min(a, b);
  const k = Math.min(W / 430, H / 880, 1.8);
  const content = portrait && k > 1.05 ? `width=${Math.round(W / k)}, viewport-fit=cover` : "width=device-width, initial-scale=1, viewport-fit=cover";
  if (meta.getAttribute("content") !== content) meta.setAttribute("content", content);
}
fitViewport();
addEventListener("orientationchange", () => setTimeout(fitViewport, 50));
matchMedia("(orientation: portrait)").addEventListener?.("change", fitViewport);
