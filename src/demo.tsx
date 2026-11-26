// Solo para desarrollo: pantallas con datos de ejemplo, sin Firebase. No se incluye en la web publicada.
import { useReducer, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Timestamp } from "firebase/firestore";
import "./styles.css";
import "./lib/viewport";
import { Game, GameUI } from "./game/engine";
import { genCard } from "./game/cards";
import { QUICK } from "./game/rules";
import { GameScreen, GameVisuals, Bankrupt } from "./screens/GameScreen";
import { Home } from "./screens/Menu";
import { EMPTY_STATS, Profile } from "./lib/profile";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { say } from "./lib/sound";

const profile: Profile = { name: "Lucía", birthDate: Timestamp.now(), color: 2, coins: 440, stats: EMPTY_STATS, settings: DEFAULT_SETTINGS };
const view = new URLSearchParams(location.search).get("v") || "game";

function Demo() {
  const [, force] = useReducer(x => x + 1, 0);
  const vis = useRef<GameVisuals | null>(null);
  const gRef = useRef<Game | null>(null);
  if (!gRef.current) {
    const ui: GameUI = { changed: force, toast: m => console.log("toast", m), say: t => vis.current?.talk(say(t)), bubble: (w, t) => vis.current?.bubble(w, t), drawing() {}, meWon() {}, penalty() {}, finished() {} };
    gRef.current = Game.create(QUICK, [genCard(), genCard(), genCard()], 60, 500, ui);
    gRef.current.start();
  }
  const g = gRef.current;
  return (
    <div className="frame" id="frame">
      <div className="screens">
        {view === "home" && <Home profile={profile} welcome={false} onWelcomeDone={() => {}} savedDrawn={12} onQuick={() => {}} onCustom={() => {}} onResume={() => {}} go={() => {}} onLogout={() => {}} />}
        {view !== "home" && <GameScreen game={g} version={0} coins={440} playerName="Lucía" playerColor={2}
          result={view === "result" ? { bingo: true, line: true, lineW: "tú", bingoW: "tú", drawn: 61, lastN: 42, att: 100, marked: 40, missed: [], cost: 60, prizes: 240, penalty: 0, falseClaims: 0, coinsBefore: 500, coinsAfter: 680 } : null}
          onPause={() => g.pause()} onResume={() => g.resume()} onExit={() => {}} onAbandon={() => {}} onSettings={() => {}} onAgain={() => {}} onMenu={() => {}} onBankrupt={() => {}}
          bindVisuals={v => { vis.current = v; }} />}
      </div>
      {view === "bankrupt" && <Bankrupt coins={8} onRefill={() => {}} onDone={() => {}} />}
      <canvas id="fx" />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Demo />);
