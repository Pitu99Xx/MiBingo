import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// iPhone con la app instalada: iOS dibuja la app por debajo de la barra de estado (hora, isla)
// y a veces no informa de su altura. Reservamos ese hueco según el modelo como mínimo.
(() => {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPod/.test(navigator.userAgent);
  const standalone = nav.standalone === true || matchMedia("(display-mode: standalone)").matches;
  if (!ios || !standalone) return;
  const h = Math.max(screen.height, screen.width);
  const top = h >= 852 ? 59 : h >= 812 ? 50 : 20; // isla dinámica · muesca · botón de inicio
  document.documentElement.style.setProperty("--top-fallback", top + "px");
  if (h >= 812) document.documentElement.style.setProperty("--bottom-fallback", "20px");
})();

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
