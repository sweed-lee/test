(function initEntitiesModule() {
  "use strict";

  window.ChronoSync = window.ChronoSync || {};

  class Player {
    constructor(startX, startY) {
      this.type = "player";
      this.width = 1;
      this.height = 1;
      this.lastButtonId = null;
      this.reset(startX, startY);
    }

    reset(startX, startY) {
      this.x = startX;
      this.y = startY;
      this.lastButtonId = null;
    }

    move(action, physicsEngine, level) {
      return physicsEngine.attemptMove(this, action, level);
    }
  }

  class ChronoClone {
    constructor(startX, startY) {
      this.type = "clone";
      this.width = 1;
      this.height = 1;
      this.path = [];
      this.active = false;
      this.currentReplayIndex = 0;
      this.lastButtonId = null;
      this.reset(startX, startY);
    }

    reset(startX, startY) {
      this.x = startX;
      this.y = startY;
      this.currentReplayIndex = 0;
      this.lastButtonId = null;
    }

    loadPath(path, startX, startY) {
      this.path = Array.isArray(path) ? path.map((step) => ({ ...step })) : [];
      this.active = this.path.length > 0;
      this.reset(startX, startY);
    }

    getActionAtTick(tick) {
      if (tick < 0 || tick >= this.path.length) {
        return "NONE";
      }
      return this.path[tick].action || "NONE";
    }

    update(tick, physicsEngine, level) {
      if (!this.active) {
        return { moved: false, action: "NONE" };
      }
      const action = this.getActionAtTick(tick);
      const moveResult = physicsEngine.attemptMove(this, action, level);
      this.currentReplayIndex = tick;
      return { ...moveResult, action };
    }
  }

  window.ChronoSync.Player = Player;
  window.ChronoSync.ChronoClone = ChronoClone;
})();
