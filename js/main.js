(function bootstrap() {
  "use strict";

  window.addEventListener("DOMContentLoaded", () => {
    const game = new window.ChronoSync.GameEngine("gameCanvas");
    window.__chronoSyncGame = game;
    game.gameLoop();
  });
})();
