(function initPhaseModule() {
  "use strict";

  window.ChronoSync = window.ChronoSync || {};

  class PhaseManager {
    constructor(gameEngine) {
      this.gameEngine = gameEngine;
      this.phase = "RECORDING";
      this.recordTimer = 0;
      this.syncTimer = 0;
    }

    startRecordingPhase(recordTicks) {
      this.phase = "RECORDING";
      this.recordTimer = Math.max(1, recordTicks || 1);
      this.syncTimer = 0;
    }

    startSyncPhase(syncTicks) {
      this.phase = "SYNC";
      this.syncTimer = Math.max(1, syncTicks || 1);
    }

    update() {
      if (this.phase === "RECORDING") {
        this.recordTimer = Math.max(0, this.recordTimer - 1);
        if (this.recordTimer === 0) {
          return "RECORDING_COMPLETE";
        }
      } else if (this.phase === "SYNC") {
        this.syncTimer = Math.max(0, this.syncTimer - 1);
        if (this.syncTimer === 0) {
          return "SYNC_COMPLETE";
        }
      }
      return null;
    }

    getPhaseLabel() {
      return this.phase === "RECORDING" ? "Recording Phase" : "Sync Phase";
    }

    drawUI(ctx) {
      const engine = this.gameEngine;
      const ticksPerSecond = engine.tickRate;

      ctx.save();
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#dde6ff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const phaseColor = this.phase === "RECORDING" ? "#ffd166" : "#64d2ff";
      const timerTicks = this.phase === "RECORDING" ? this.recordTimer : this.syncTimer;
      const seconds = Math.max(0, timerTicks / ticksPerSecond);
      const timerLabel = seconds.toFixed(1).padStart(4, " ");

      ctx.fillStyle = "#9fb4d8";
      ctx.fillText(`State: ${engine.state}`, 20, 16);
      ctx.fillStyle = phaseColor;
      ctx.fillText(`Phase: ${this.getPhaseLabel()}`, 20, 38);
      ctx.fillStyle = "#dde6ff";
      ctx.fillText(`Timer: ${timerLabel}s`, 20, 60);

      ctx.restore();
    }
  }

  window.ChronoSync.PhaseManager = PhaseManager;
})();
