import { GameEngine } from "./gameEngine.js";
import { UIManager } from "./uiManager.js";

function boot() {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    throw new Error("Game canvas not found.");
  }

  const engine = new GameEngine("gameCanvas");
  const ui = new UIManager(engine, canvas);

  // Expose for quick local debugging from browser devtools.
  window.laserLogic = { engine, ui };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
