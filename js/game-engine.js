(function initGameEngineModule() {
  "use strict";

  window.ChronoSync = window.ChronoSync || {};

  const { LevelManager, PhysicsEngine, Player, ChronoClone, PhaseManager } = window.ChronoSync;

  class GameEngine {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        throw new Error(`Canvas with id "${canvasId}" was not found.`);
      }

      this.ctx = this.canvas.getContext("2d");
      this.state = "MENU"; // MENU, PLAYING, LEVEL_CLEAR, WIN
      this.tickRate = 10;
      this.msPerTick = 1000 / this.tickRate;
      this.lastFrameTime = 0;
      this.accumulator = 0;

      this.levelManager = new LevelManager();
      this.physics = new PhysicsEngine();
      this.phaseManager = new PhaseManager(this);

      this.currentLevelIndex = 0;
      this.currentLevel = null;
      this.player = null;
      this.chronoClone = null;
      this.levelClearCountdown = 0;

      this.keys = {};
      this.statusMessage = "";
      this.statusMessageTicks = 0;

      this.bindInput();
    }

    startGame() {
      if (this.levelManager.getLevelCount() === 0) {
        this.state = "WIN";
        return;
      }
      this.loadLevel(this.currentLevelIndex);
      this.state = "PLAYING";
    }

    loadLevel(index) {
      this.currentLevelIndex = Math.max(0, Math.min(index, this.levelManager.getLevelCount() - 1));
      this.beginRecordingPhase();
      this.state = "PLAYING";
    }

    beginRecordingPhase() {
      this.currentLevel = this.levelManager.loadLevel(this.currentLevelIndex);
      this.player = new Player(this.currentLevel.start.x, this.currentLevel.start.y);
      this.chronoClone = new ChronoClone(this.currentLevel.start.x, this.currentLevel.start.y);
      this.chronoClone.active = false;

      this.physics.resetRecording();
      this.phaseManager.startRecordingPhase(this.currentLevel.recordTicks);
    }

    startSyncPhase(force = false) {
      if (!this.currentLevel || this.state !== "PLAYING") {
        return;
      }
      if (!force && this.phaseManager.phase !== "RECORDING") {
        return;
      }
      if (this.physics.recordedPath.length === 0) {
        this.flashMessage("Record at least one tick before syncing.", this.tickRate * 2);
        return;
      }

      const replayPath = this.physics.recordedPath.map((step) => ({ ...step }));
      this.currentLevel = this.levelManager.loadLevel(this.currentLevelIndex);
      this.player = new Player(this.currentLevel.start.x, this.currentLevel.start.y);
      this.chronoClone = new ChronoClone(this.currentLevel.start.x, this.currentLevel.start.y);
      this.chronoClone.loadPath(replayPath, this.currentLevel.start.x, this.currentLevel.start.y);

      this.physics.setReplayPath(replayPath);
      const computedSyncTicks = Math.max(this.currentLevel.syncTicks, replayPath.length + this.tickRate * 4);
      this.phaseManager.startSyncPhase(computedSyncTicks);
      this.flashMessage("Sync started. Use your clone to solve the puzzle.", this.tickRate * 2);
    }

    handleLevelComplete() {
      if (this.currentLevelIndex >= this.levelManager.getLevelCount() - 1) {
        this.state = "WIN";
        return;
      }

      this.state = "LEVEL_CLEAR";
      this.levelClearCountdown = this.tickRate * 2;
      this.flashMessage("Level clear!", this.tickRate * 2);
    }

    handleSyncTimeout() {
      this.flashMessage("Sync ended. Re-record your route.", this.tickRate * 2);
      this.beginRecordingPhase();
    }

    nextLevel() {
      if (this.currentLevelIndex >= this.levelManager.getLevelCount() - 1) {
        this.state = "WIN";
        return;
      }
      this.currentLevelIndex += 1;
      this.loadLevel(this.currentLevelIndex);
    }

    previousLevel() {
      if (this.currentLevelIndex <= 0) {
        this.flashMessage("Already at the first level.", this.tickRate * 2);
        return;
      }
      this.currentLevelIndex -= 1;
      this.loadLevel(this.currentLevelIndex);
    }

    restartLevel() {
      if (!this.currentLevel) {
        return;
      }
      this.beginRecordingPhase();
      this.flashMessage("Level reset.", this.tickRate * 2);
    }

    flashMessage(text, ticks) {
      this.statusMessage = text;
      this.statusMessageTicks = Math.max(1, ticks || this.tickRate * 2);
    }

    bindInput() {
      const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);

      window.addEventListener("keydown", (event) => {
        if (movementKeys.has(event.code)) {
          this.keys[event.code] = true;
          event.preventDefault();
        }

        if (event.code === "Enter") {
          if (this.state === "MENU") {
            this.startGame();
          } else if (this.state === "LEVEL_CLEAR") {
            this.nextLevel();
          } else if (this.state === "WIN") {
            this.currentLevelIndex = 0;
            this.startGame();
          }
        }

        if (event.code === "Space") {
          if (this.state === "PLAYING" && this.phaseManager.phase === "RECORDING") {
            this.startSyncPhase(true);
          }
          event.preventDefault();
        }

        if (event.code === "KeyR") {
          if (this.state === "PLAYING") {
            this.restartLevel();
          }
        }

        if (event.code === "KeyN") {
          if (this.state === "PLAYING" || this.state === "LEVEL_CLEAR") {
            this.nextLevel();
          }
        }

        if (event.code === "KeyB") {
          if (this.state === "PLAYING" || this.state === "LEVEL_CLEAR") {
            this.previousLevel();
          }
        }

        if (event.code === "Escape") {
          this.state = "MENU";
          this.flashMessage("Paused to menu.", this.tickRate * 2);
        }
      });

      window.addEventListener("keyup", (event) => {
        if (this.keys[event.code]) {
          delete this.keys[event.code];
        }
      });
    }

    getMoveAction() {
      if (this.keys.ArrowUp || this.keys.KeyW) {
        return "UP";
      }
      if (this.keys.ArrowDown || this.keys.KeyS) {
        return "DOWN";
      }
      if (this.keys.ArrowLeft || this.keys.KeyA) {
        return "LEFT";
      }
      if (this.keys.ArrowRight || this.keys.KeyD) {
        return "RIGHT";
      }
      return "NONE";
    }

    updateTick() {
      if (this.statusMessageTicks > 0) {
        this.statusMessageTicks -= 1;
        if (this.statusMessageTicks === 0) {
          this.statusMessage = "";
        }
      }

      if (this.state === "LEVEL_CLEAR") {
        this.levelClearCountdown = Math.max(0, this.levelClearCountdown - 1);
        if (this.levelClearCountdown === 0) {
          this.nextLevel();
        }
        return;
      }

      if (this.state !== "PLAYING" || !this.currentLevel) {
        return;
      }

      if (this.phaseManager.phase === "RECORDING") {
        this.updateRecordingTick();
      } else if (this.phaseManager.phase === "SYNC") {
        this.updateSyncTick();
      }
    }

    updateRecordingTick() {
      const action = this.getMoveAction();
      this.player.move(action, this.physics, this.currentLevel);

      this.physics.processInteractions([this.player], this.currentLevel);
      this.physics.recordPlayerState(this.physics.currentTick, this.player.x, this.player.y, action);
      this.physics.currentTick += 1;

      const phaseEvent = this.phaseManager.update();
      if (phaseEvent === "RECORDING_COMPLETE") {
        this.startSyncPhase(true);
      }
    }

    updateSyncTick() {
      const tick = this.physics.currentTick;
      if (this.chronoClone && this.chronoClone.active) {
        this.chronoClone.update(tick, this.physics, this.currentLevel);
        // Apply clone side-effects first so the present player can use the updated state immediately.
        this.physics.processCloneInteractions(tick, this.currentLevel, this.chronoClone);
      }

      const action = this.getMoveAction();
      this.player.move(action, this.physics, this.currentLevel);

      const entities = [];
      if (this.chronoClone && this.chronoClone.active) {
        entities.push(this.chronoClone);
      }
      entities.push(this.player);

      this.physics.processInteractions(entities, this.currentLevel);
      this.physics.currentTick += 1;

      if (this.levelManager.checkWinCondition(this.player, this.currentLevel.goal)) {
        this.handleLevelComplete();
        return;
      }

      const phaseEvent = this.phaseManager.update();
      if (phaseEvent === "SYNC_COMPLETE") {
        this.handleSyncTimeout();
      }
    }

    gameLoop(timestamp = 0) {
      if (!this.lastFrameTime) {
        this.lastFrameTime = timestamp;
      }

      const delta = Math.min(250, timestamp - this.lastFrameTime);
      this.lastFrameTime = timestamp;
      this.accumulator += delta;

      while (this.accumulator >= this.msPerTick) {
        this.updateTick();
        this.accumulator -= this.msPerTick;
      }

      this.render();
      window.requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.state === "MENU") {
        this.drawMenu();
        return;
      }

      if (this.state === "WIN") {
        this.drawWinScreen();
        return;
      }

      if (!this.currentLevel) {
        this.drawMenu();
        return;
      }

      const layout = this.computeBoardLayout(this.currentLevel);
      this.drawGrid(this.currentLevel, layout);
      this.drawLevelObjects(this.currentLevel, layout);
      this.drawEntities(layout);
      this.drawHUD(layout);

      if (this.state === "LEVEL_CLEAR") {
        this.drawCenteredOverlay("Level Cleared", "Press Enter to continue");
      }
    }

    computeBoardLayout(level) {
      const maxBoardWidth = this.canvas.width - 220;
      const maxBoardHeight = this.canvas.height - 220;
      const tileSize = Math.max(20, Math.floor(Math.min(maxBoardWidth / level.width, maxBoardHeight / level.height)));
      const boardWidth = tileSize * level.width;
      const boardHeight = tileSize * level.height;
      const originX = Math.floor((this.canvas.width - boardWidth) / 2);
      const originY = Math.floor((this.canvas.height - boardHeight) / 2) + 20;

      return { tileSize, originX, originY, boardWidth, boardHeight };
    }

    drawGrid(level, layout) {
      const { ctx } = this;
      const { tileSize, originX, originY } = layout;

      ctx.save();
      for (let y = 0; y < level.height; y += 1) {
        for (let x = 0; x < level.width; x += 1) {
          this.renderMinimalistSprite("floor", x, y, layout);
          const tileX = originX + x * tileSize;
          const tileY = originY + y * tileSize;
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.strokeRect(tileX + 0.5, tileY + 0.5, tileSize - 1, tileSize - 1);
        }
      }
      ctx.restore();
    }

    drawLevelObjects(level, layout) {
      for (const wallPos of level.walls.values()) {
        const [x, y] = wallPos.split(",").map(Number);
        this.renderMinimalistSprite("wall", x, y, layout);
      }

      for (let i = 0; i < level.oneWayGates.length; i += 1) {
        const gate = level.oneWayGates[i];
        this.renderMinimalistSprite("oneWay", gate.x, gate.y, layout, gate);
      }

      for (let i = 0; i < level.blockers.length; i += 1) {
        const blocker = level.blockers[i];
        this.renderMinimalistSprite("blocker", blocker.x, blocker.y, layout, blocker);
      }

      for (let i = 0; i < level.buttons.length; i += 1) {
        const button = level.buttons[i];
        this.renderMinimalistSprite("button", button.x, button.y, layout, button);
      }

      for (let i = 0; i < level.plates.length; i += 1) {
        const plate = level.plates[i];
        this.renderMinimalistSprite("plate", plate.x, plate.y, layout, plate);
      }

      for (let i = 0; i < level.doors.length; i += 1) {
        const door = level.doors[i];
        this.renderMinimalistSprite("door", door.x, door.y, layout, door);
      }

      this.renderMinimalistSprite("goal", level.goal.x, level.goal.y, layout);
    }

    drawEntities(layout) {
      if (this.chronoClone && this.chronoClone.active && this.phaseManager.phase === "SYNC") {
        this.renderMinimalistSprite("clone", this.chronoClone.x, this.chronoClone.y, layout);
      }
      if (this.player) {
        this.renderMinimalistSprite("player", this.player.x, this.player.y, layout);
      }
    }

    drawHUD(layout) {
      const { ctx } = this;
      const levelCount = this.levelManager.getLevelCount();

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e9efff";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Level ${this.currentLevelIndex + 1}/${levelCount}: ${this.currentLevel.name}`, 20, 84);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#b9c6df";
      ctx.fillText(this.currentLevel.hint, 20, 106);
      ctx.fillText(`Recorded ticks: ${this.physics.recordedPath.length}`, 20, 126);

      this.phaseManager.drawUI(ctx);
      this.drawControlsPanel(layout);

      if (this.statusMessage) {
        ctx.fillStyle = "#ffe083";
        ctx.font = "14px sans-serif";
        ctx.fillText(this.statusMessage, 20, this.canvas.height - 34);
      }

      ctx.restore();
    }

    drawControlsPanel(layout) {
      const { ctx } = this;
      const panelX = Math.min(this.canvas.width - 220, layout.originX + layout.boardWidth + 16);
      const panelY = 150;
      const lines = [
        "Controls:",
        "WASD / Arrows: Move",
        "Space: End recording",
        "R: Restart level",
        "N / B: Next / Previous",
        "Esc: Menu",
        "",
        "Legend:",
        "Yellow = Player",
        "Cyan = Clone",
        "Blue = Toggle button",
        "Violet = Pressure plate",
        "Red = Closed door",
        "Orange = Blocker"
      ];

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#93a3c2";
      ctx.font = "13px sans-serif";

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === "Controls:" || line === "Legend:") {
          ctx.fillStyle = "#d8e4ff";
        } else {
          ctx.fillStyle = "#93a3c2";
        }
        ctx.fillText(line, panelX, panelY + i * 18);
      }
      ctx.restore();
    }

    drawMenu() {
      const { ctx } = this;
      ctx.save();
      ctx.fillStyle = "#101522";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#eef3ff";
      ctx.font = "42px sans-serif";
      ctx.fillText("Chrono-Sync: Refined", this.canvas.width / 2, 170);

      ctx.fillStyle = "#9fb4d8";
      ctx.font = "20px sans-serif";
      ctx.fillText("Deterministic time-cloning puzzle game", this.canvas.width / 2, 214);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#d8e4ff";
      ctx.fillText("Record a route, then cooperate with your clone in Sync.", this.canvas.width / 2, 280);
      ctx.fillText("Solve 12 handcrafted levels with structured puzzle elements.", this.canvas.width / 2, 308);
      ctx.fillText("No external resources, pure Canvas + JavaScript.", this.canvas.width / 2, 336);

      ctx.fillStyle = "#ffe083";
      ctx.fillText("Press Enter to start", this.canvas.width / 2, 410);

      ctx.fillStyle = "#8fa0bf";
      ctx.font = "14px sans-serif";
      ctx.fillText("Move: WASD / Arrows | Record finish: Space | Reset: R", this.canvas.width / 2, 450);
      ctx.restore();
    }

    drawWinScreen() {
      const { ctx } = this;
      ctx.save();
      ctx.fillStyle = "#0f1727";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f0f6ff";
      ctx.font = "40px sans-serif";
      ctx.fillText("Timeline Stabilized", this.canvas.width / 2, 220);

      ctx.fillStyle = "#9dd7ff";
      ctx.font = "20px sans-serif";
      ctx.fillText("All Chrono-Sync levels completed.", this.canvas.width / 2, 270);

      ctx.fillStyle = "#b7c6e2";
      ctx.font = "16px sans-serif";
      ctx.fillText("Press Enter to play again", this.canvas.width / 2, 350);
      ctx.restore();
    }

    drawCenteredOverlay(title, subtitle) {
      const { ctx } = this;
      const boxWidth = 420;
      const boxHeight = 120;
      const x = (this.canvas.width - boxWidth) / 2;
      const y = (this.canvas.height - boxHeight) / 2;

      ctx.save();
      ctx.fillStyle = "rgba(8, 12, 20, 0.82)";
      ctx.fillRect(x, y, boxWidth, boxHeight);
      ctx.strokeStyle = "#6c83ad";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, boxWidth, boxHeight);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f2f7ff";
      ctx.font = "28px sans-serif";
      ctx.fillText(title, this.canvas.width / 2, y + 44);
      ctx.fillStyle = "#c2d1eb";
      ctx.font = "16px sans-serif";
      ctx.fillText(subtitle, this.canvas.width / 2, y + 84);
      ctx.restore();
    }

    renderMinimalistSprite(type, x, y, layout, data = null) {
      const { ctx } = this;
      const { tileSize, originX, originY } = layout;
      const px = originX + x * tileSize;
      const py = originY + y * tileSize;

      switch (type) {
        case "floor":
          ctx.fillStyle = "#1a2030";
          ctx.fillRect(px, py, tileSize, tileSize);
          break;
        case "wall":
          ctx.fillStyle = "#36415a";
          ctx.fillRect(px, py, tileSize, tileSize);
          break;
        case "goal":
          ctx.fillStyle = "#285f3b";
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = "#65f58f";
          ctx.beginPath();
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "button":
          ctx.fillStyle = data && data.pressed ? "#5ad1ff" : "#2f95bf";
          ctx.fillRect(px + tileSize * 0.2, py + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
          break;
        case "plate":
          ctx.fillStyle = data && data.pressed ? "#d9a4ff" : "#8b5fbf";
          ctx.fillRect(px + tileSize * 0.12, py + tileSize * 0.12, tileSize * 0.76, tileSize * 0.76);
          break;
        case "door":
          if (data && data.open) {
            ctx.strokeStyle = "#5abf7a";
            ctx.lineWidth = Math.max(2, tileSize * 0.08);
            ctx.strokeRect(px + tileSize * 0.15, py + tileSize * 0.15, tileSize * 0.7, tileSize * 0.7);
          } else {
            ctx.fillStyle = "#a94848";
            ctx.fillRect(px + tileSize * 0.08, py + tileSize * 0.08, tileSize * 0.84, tileSize * 0.84);
          }
          break;
        case "oneWay":
          ctx.fillStyle = "rgba(255, 195, 82, 0.28)";
          ctx.fillRect(px, py, tileSize, tileSize);
          this.drawGateArrow(px, py, tileSize, data ? data.direction : "right");
          break;
        case "blocker":
          ctx.fillStyle = "#db8242";
          ctx.fillRect(px + tileSize * 0.14, py + tileSize * 0.14, tileSize * 0.72, tileSize * 0.72);
          ctx.strokeStyle = "#4d2f1c";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + tileSize * 0.2, py + tileSize * 0.2);
          ctx.lineTo(px + tileSize * 0.8, py + tileSize * 0.8);
          ctx.moveTo(px + tileSize * 0.8, py + tileSize * 0.2);
          ctx.lineTo(px + tileSize * 0.2, py + tileSize * 0.8);
          ctx.stroke();
          break;
        case "player":
          ctx.fillStyle = "#ffd866";
          ctx.fillRect(px + tileSize * 0.14, py + tileSize * 0.14, tileSize * 0.72, tileSize * 0.72);
          break;
        case "clone":
          ctx.fillStyle = "rgba(85, 217, 255, 0.85)";
          ctx.fillRect(px + tileSize * 0.16, py + tileSize * 0.16, tileSize * 0.68, tileSize * 0.68);
          break;
        default:
          break;
      }
    }

    drawGateArrow(px, py, tileSize, direction) {
      const { ctx } = this;
      const cx = px + tileSize / 2;
      const cy = py + tileSize / 2;
      const half = tileSize * 0.22;

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();

      if (direction === "up") {
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx - half, cy + half);
        ctx.lineTo(cx + half, cy + half);
      } else if (direction === "down") {
        ctx.moveTo(cx, cy + half);
        ctx.lineTo(cx - half, cy - half);
        ctx.lineTo(cx + half, cy - half);
      } else if (direction === "left") {
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx + half, cy - half);
        ctx.lineTo(cx + half, cy + half);
      } else {
        ctx.moveTo(cx + half, cy);
        ctx.lineTo(cx - half, cy - half);
        ctx.lineTo(cx - half, cy + half);
      }

      ctx.closePath();
      ctx.fill();
    }
  }

  window.ChronoSync.GameEngine = GameEngine;
})();
