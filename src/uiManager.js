import {
  colorLabel,
  colorMaskToCss,
  colorNameToMask,
  DIRECTION_VECTORS,
  gridKey,
  rotationToDirection,
} from "./constants.js";
import { Component } from "./grid.js";

const TARGET_COLOR_TAG_STYLES = Object.freeze({
  red: "background: rgba(255,70,70,0.18); color: #ff9a9a;",
  green: "background: rgba(80,255,120,0.16); color: #b5ffcc;",
  blue: "background: rgba(90,150,255,0.2); color: #aecdff;",
  yellow: "background: rgba(255,240,80,0.2); color: #fff2a4;",
  magenta: "background: rgba(255,90,240,0.2); color: #ffc0f7;",
  cyan: "background: rgba(80,255,245,0.2); color: #b5fff9;",
  white: "background: rgba(255,255,255,0.22); color: #ffffff;",
  black: "background: rgba(100,110,130,0.2); color: #d7dced;",
});

export class UIManager {
  constructor(engine, canvas) {
    this.engine = engine;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.boardRect = { x: 0, y: 0, cellSize: 1 };
    this.hoverCell = null;
    this.isMouseDown = false;
    this.state = this.engine.getState();
    this.lastTimestamp = performance.now();
    this.particles = [];
    this.targetActivationByKey = new Map();

    this.levelSelect = document.getElementById("levelSelect");
    this.levelTitle = document.getElementById("levelTitle");
    this.levelDescription = document.getElementById("levelDescription");
    this.moveCounter = document.getElementById("moveCounter");
    this.parCounter = document.getElementById("parCounter");
    this.starCounter = document.getElementById("starCounter");
    this.targetList = document.getElementById("targetList");
    this.toolbar = document.getElementById("toolbar");
    this.statusText = document.getElementById("statusText");
    this.winBanner = document.getElementById("winBanner");

    this.prevButton = document.getElementById("prevButton");
    this.resetButton = document.getElementById("resetButton");
    this.nextButton = document.getElementById("nextButton");

    this.bindEvents();
    this.engine.onStateChange = (state) => this.handleStateChange(state);
    this.handleStateChange(this.state);
    this.startRenderLoop();
  }

  bindEvents() {
    this.canvas.addEventListener("mousedown", (event) => this.handleMouseDown(event));
    this.canvas.addEventListener("mousemove", (event) => this.handleMouseMove(event));
    this.canvas.addEventListener("mouseup", (event) => this.handleMouseUp(event));
    this.canvas.addEventListener("mouseleave", () => {
      this.hoverCell = null;
    });
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    this.prevButton.addEventListener("click", () => this.engine.loadPrevLevel());
    this.resetButton.addEventListener("click", () => this.engine.resetLevel());
    this.nextButton.addEventListener("click", () => this.engine.loadNextLevel());

    this.levelSelect.addEventListener("change", () => {
      this.engine.loadLevel(Number(this.levelSelect.value));
    });

    this.toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tool-id]");
      if (!button) {
        return;
      }
      this.engine.setSelectedTool(button.dataset.toolId);
    });
  }

  handleStateChange(state) {
    const previousState = this.state;
    this.state = state;
    this.syncHud(previousState, state);
  }

  syncHud(previousState, currentState) {
    this.levelTitle.textContent = `Level ${currentState.level.id}: ${currentState.level.name}`;
    this.levelDescription.textContent = currentState.level.description;
    this.moveCounter.textContent = String(currentState.moves);
    this.parCounter.textContent = String(currentState.par);
    this.starCounter.textContent = `${"★".repeat(currentState.stars)}${"☆".repeat(3 - currentState.stars)}`;

    this.prevButton.disabled = !currentState.canGoPrev;
    this.nextButton.disabled = !currentState.canGoNext;
    this.winBanner.classList.toggle("hidden", !currentState.won);

    if (currentState.won) {
      this.statusText.textContent =
        `Solved! ${currentState.bestStarsForCurrent > 0 ? `Best: ${"★".repeat(currentState.bestStarsForCurrent)}` : ""}`;
    } else if (currentState.beamResult?.truncated) {
      this.statusText.textContent = "Feedback loop capped. Adjust mirrors or splitters.";
    } else {
      this.statusText.textContent = "Route beams so every target receives its exact required color.";
    }

    this.renderLevelSelect(currentState);
    this.renderToolbox(currentState);
    this.renderTargetList(currentState);
    this.spawnActivationParticles(previousState, currentState);
  }

  renderLevelSelect(state) {
    const currentValue = Number(state.level.id);
    this.levelSelect.innerHTML = state.levelOptions
      .map((option) => {
        const lockedLabel = option.unlocked ? "" : " (Locked)";
        const stars = option.bestStars > 0 ? ` ${"★".repeat(option.bestStars)}` : "";
        return `<option value="${option.id}" ${option.unlocked ? "" : "disabled"}>
          ${option.id}. ${option.name}${lockedLabel}${stars}
        </option>`;
      })
      .join("");
    this.levelSelect.value = String(currentValue);
  }

  renderToolbox(state) {
    const toolButtons = [];
    for (const tool of state.tools) {
      const isActive = state.selectedToolId === tool.id;
      const unavailable = !(tool.remaining === null || tool.remaining > 0);
      const countLabel = tool.remaining === null ? "∞" : `${tool.remaining}/${tool.count}`;
      toolButtons.push(`
        <button type="button"
          data-tool-id="${tool.id}"
          class="tool-button ${isActive ? "active" : ""} ${unavailable ? "unavailable" : ""}"
          ${unavailable ? "disabled" : ""}>
          <span class="tool-name">${tool.label}</span>
          <span class="tool-count">${countLabel}</span>
        </button>
      `);
    }

    toolButtons.push(`
      <button type="button"
        data-tool-id="eraser"
        class="tool-button ${state.selectedToolId === "eraser" ? "active" : ""}">
        <span class="tool-name">Eraser</span>
        <span class="tool-count">Remove component</span>
      </button>
    `);

    this.toolbar.innerHTML = toolButtons.join("");
  }

  renderTargetList(state) {
    const targetStates = state.beamResult?.targetStates ?? [];
    this.targetList.innerHTML = targetStates
      .map((target, idx) => {
        const style =
          TARGET_COLOR_TAG_STYLES[target.requiredColor] ?? TARGET_COLOR_TAG_STYLES.white;
        return `<li class="target-item ${target.active ? "active" : ""}">
          <span>Target ${idx + 1} @ (${target.x},${target.y})</span>
          <span class="target-tag" style="${style}">${colorLabel(target.requiredColor)}</span>
        </li>`;
      })
      .join("");
  }

  spawnActivationParticles(previousState, currentState) {
    const prevTargets = previousState?.beamResult?.targetStates ?? [];
    const prevByKey = new Map(
      prevTargets.map((target) => [gridKey(target.x, target.y), target.active]),
    );

    const currentTargets = currentState?.beamResult?.targetStates ?? [];
    for (const target of currentTargets) {
      const key = gridKey(target.x, target.y);
      const wasActive = prevByKey.get(key) ?? this.targetActivationByKey.get(key) ?? false;
      if (!wasActive && target.active) {
        this.emitTargetBurst(target.x, target.y, target.requiredColor);
      }
      this.targetActivationByKey.set(key, target.active);
    }
  }

  emitTargetBurst(cellX, cellY, colorName) {
    const mask = colorNameToMask(colorName);
    for (let i = 0; i < 14; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: cellX + 0.5,
        y: cellY + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 0.7 + Math.random() * 0.4,
        colorMask: mask,
        radius: 0.05 + Math.random() * 0.08,
      });
    }
  }

  startRenderLoop() {
    const frame = (timestamp) => {
      const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = timestamp;
      this.updateParticles(dt);
      this.render(timestamp / 1000);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  updateParticles(dt) {
    this.particles = this.particles
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx * dt,
        y: particle.y + particle.vy * dt,
        life: particle.life - dt,
        vx: particle.vx * 0.98,
        vy: particle.vy * 0.98,
      }))
      .filter((particle) => particle.life > 0);
  }

  render(timeSeconds = 0) {
    const state = this.state;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state?.grid) {
      return;
    }

    this.computeBoardRect(state);
    this.drawGridBackground(state);
    this.drawBeamSegments(state, timeSeconds);
    this.drawSources(state);
    this.drawTargets(state);
    this.drawComponents(state);
    this.drawHoverGhost(state);
    this.drawParticles();
  }

  computeBoardRect(state) {
    const margin = 34;
    const availableWidth = this.canvas.width - margin * 2;
    const availableHeight = this.canvas.height - margin * 2;
    const cellSize = Math.floor(
      Math.min(availableWidth / state.grid.width, availableHeight / state.grid.height),
    );
    const boardWidth = state.grid.width * cellSize;
    const boardHeight = state.grid.height * cellSize;
    this.boardRect = {
      x: (this.canvas.width - boardWidth) / 2,
      y: (this.canvas.height - boardHeight) / 2,
      cellSize,
      width: boardWidth,
      height: boardHeight,
    };
  }

  drawGridBackground(state) {
    const { ctx } = this;
    const { x, y, width, height, cellSize } = this.boardRect;
    ctx.save();
    ctx.fillStyle = "#0d1425";
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

    for (let gy = 0; gy < state.grid.height; gy += 1) {
      for (let gx = 0; gx < state.grid.width; gx += 1) {
        const px = x + gx * cellSize;
        const py = y + gy * cellSize;
        const isTint = (gx + gy) % 2 === 0;
        ctx.fillStyle = isTint ? "rgba(255,255,255,0.022)" : "rgba(255,255,255,0.01)";
        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = "rgba(180, 200, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= state.grid.width; gx += 1) {
      const lineX = x + gx * cellSize;
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= state.grid.height; gy += 1) {
      const lineY = y + gy * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBeamSegments(state, timeSeconds) {
    const segments = state.beamResult?.segments ?? [];
    if (segments.length === 0) {
      return;
    }

    const { ctx } = this;
    const dashOffset = -timeSeconds * 90;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = dashOffset;

    for (const segment of segments) {
      const { x: x1, y: y1 } = this.gridToCanvas(segment.x1, segment.y1);
      const { x: x2, y: y2 } = this.gridToCanvas(segment.x2, segment.y2);
      ctx.strokeStyle = colorMaskToCss(segment.colorMask, 0.92);
      ctx.shadowColor = colorMaskToCss(segment.colorMask, 0.8);
      ctx.shadowBlur = this.boardRect.cellSize * 0.22;
      ctx.lineWidth = Math.max(3, this.boardRect.cellSize * 0.16);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawSources(state) {
    const { ctx } = this;
    const radius = this.boardRect.cellSize * 0.23;
    ctx.save();

    for (const source of state.level.sources) {
      const center = this.cellCenter(source.x, source.y);
      const dirVector = DIRECTION_VECTORS[source.dir];
      const colorMask = colorNameToMask(source.color);
      ctx.fillStyle = colorMaskToCss(colorMask, 0.9);
      ctx.shadowColor = colorMaskToCss(colorMask, 0.8);
      ctx.shadowBlur = radius * 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();

      const tipX = center.x + dirVector.x * radius * 1.7;
      const tipY = center.y + dirVector.y * radius * 1.7;
      const sideX = center.x + dirVector.y * radius * 0.7;
      const sideY = center.y - dirVector.x * radius * 0.7;
      const sideX2 = center.x - dirVector.y * radius * 0.7;
      const sideY2 = center.y + dirVector.x * radius * 0.7;

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(sideX, sideY);
      ctx.lineTo(sideX2, sideY2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawTargets(state) {
    const targetStates = state.beamResult?.targetStates ?? [];
    const { ctx } = this;
    const outerRadius = this.boardRect.cellSize * 0.28;
    const innerRadius = this.boardRect.cellSize * 0.17;

    ctx.save();
    for (const target of targetStates) {
      const center = this.cellCenter(target.x, target.y);
      const colorMask = colorNameToMask(target.requiredColor);
      const ringAlpha = target.active ? 0.95 : 0.45;
      ctx.strokeStyle = colorMaskToCss(colorMask, ringAlpha);
      ctx.lineWidth = target.active ? 3.4 : 2.2;
      ctx.shadowColor = colorMaskToCss(colorMask, target.active ? 0.9 : 0.35);
      ctx.shadowBlur = target.active ? 16 : 4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = target.active
        ? colorMaskToCss(colorMask, 0.65)
        : "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawComponents(state) {
    const drawSet = (entries, fixed) => {
      for (const [key, component] of entries) {
        const [x, y] = key.split(",").map((n) => Number(n));
        this.drawComponentGlyph(x, y, component, fixed, 1);
      }
    };

    drawSet(state.grid.getFixedEntries(), true);
    drawSet(state.grid.getPlacedEntries(), false);
  }

  drawComponentGlyph(cellX, cellY, component, isFixed, alpha = 1) {
    const { ctx } = this;
    const { cellSize } = this.boardRect;
    const left = this.boardRect.x + cellX * cellSize;
    const top = this.boardRect.y + cellY * cellSize;
    const center = this.cellCenter(cellX, cellY);
    const slash = (component.rotation ?? 0) % 2 === 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isFixed ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.92)";
    ctx.fillStyle = isFixed ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.1)";
    ctx.lineWidth = Math.max(2, cellSize * 0.1);

    switch (component.type) {
      case "mirror":
      case "splitter": {
        ctx.strokeStyle =
          component.type === "splitter"
            ? "rgba(170, 225, 255, 0.9)"
            : "rgba(236, 244, 255, 0.95)";
        ctx.beginPath();
        if (slash) {
          ctx.moveTo(left + cellSize * 0.2, top + cellSize * 0.8);
          ctx.lineTo(left + cellSize * 0.8, top + cellSize * 0.2);
        } else {
          ctx.moveTo(left + cellSize * 0.2, top + cellSize * 0.2);
          ctx.lineTo(left + cellSize * 0.8, top + cellSize * 0.8);
        }
        ctx.stroke();
        if (component.type === "splitter") {
          ctx.fillStyle = "rgba(147, 220, 255, 0.3)";
          ctx.beginPath();
          ctx.arc(center.x, center.y, cellSize * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case "filter": {
        const colorMask = colorNameToMask(component.color ?? "white");
        ctx.fillStyle = colorMaskToCss(colorMask, 0.4);
        ctx.strokeStyle = colorMaskToCss(colorMask, 0.9);
        ctx.lineWidth = Math.max(2, cellSize * 0.06);
        ctx.beginPath();
        ctx.roundRect(
          left + cellSize * 0.2,
          top + cellSize * 0.2,
          cellSize * 0.6,
          cellSize * 0.6,
          cellSize * 0.08,
        );
        ctx.fill();
        ctx.stroke();
        break;
      }

      case "blocker": {
        ctx.fillStyle = "rgba(25, 32, 50, 0.95)";
        ctx.strokeStyle = "rgba(200, 210, 235, 0.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(
          left + cellSize * 0.2,
          top + cellSize * 0.2,
          cellSize * 0.6,
          cellSize * 0.6,
          cellSize * 0.07,
        );
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(left + cellSize * 0.28, top + cellSize * 0.28);
        ctx.lineTo(left + cellSize * 0.72, top + cellSize * 0.72);
        ctx.moveTo(left + cellSize * 0.72, top + cellSize * 0.28);
        ctx.lineTo(left + cellSize * 0.28, top + cellSize * 0.72);
        ctx.stroke();
        break;
      }

      case "combiner": {
        const outDir = rotationToDirection(component.rotation);
        const vec = DIRECTION_VECTORS[outDir];
        const r = cellSize * 0.23;
        ctx.fillStyle = "rgba(255, 225, 160, 0.22)";
        ctx.strokeStyle = "rgba(255, 228, 173, 0.92)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 238, 200, 0.9)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + vec.x * r * 1.35, center.y + vec.y * r * 1.35);
        ctx.stroke();
        break;
      }

      case "prism": {
        const forward = rotationToDirection(component.rotation);
        const vec = DIRECTION_VECTORS[forward];
        const normal = { x: -vec.y, y: vec.x };
        const p1 = {
          x: center.x + vec.x * cellSize * 0.28,
          y: center.y + vec.y * cellSize * 0.28,
        };
        const p2 = {
          x: center.x - vec.x * cellSize * 0.18 + normal.x * cellSize * 0.2,
          y: center.y - vec.y * cellSize * 0.18 + normal.y * cellSize * 0.2,
        };
        const p3 = {
          x: center.x - vec.x * cellSize * 0.18 - normal.x * cellSize * 0.2,
          y: center.y - vec.y * cellSize * 0.18 - normal.y * cellSize * 0.2,
        };
        ctx.fillStyle = "rgba(205, 230, 255, 0.25)";
        ctx.strokeStyle = "rgba(215, 240, 255, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      default: {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isFixed) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = `${Math.max(10, cellSize * 0.17)}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("F", left + cellSize * 0.9, top + cellSize * 0.9);
    }

    ctx.restore();
  }

  drawHoverGhost(state) {
    if (!this.hoverCell) {
      return;
    }
    if (state.selectedToolId === "eraser") {
      return;
    }
    if (!state.grid.canPlaceAt(this.hoverCell.x, this.hoverCell.y)) {
      return;
    }
    const tool = state.tools.find((item) => item.id === state.selectedToolId);
    if (!tool) {
      return;
    }
    const preview = new Component(tool.type, tool.defaultRotation ?? 0, tool.color ?? null, false);
    this.drawComponentGlyph(this.hoverCell.x, this.hoverCell.y, preview, false, 0.42);

    const { ctx } = this;
    const { cellSize } = this.boardRect;
    const cellLeft = this.boardRect.x + this.hoverCell.x * cellSize;
    const cellTop = this.boardRect.y + this.hoverCell.y * cellSize;
    ctx.save();
    ctx.strokeStyle = "rgba(127, 193, 255, 0.8)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(cellLeft + 2, cellTop + 2, cellSize - 4, cellSize - 4);
    ctx.restore();
  }

  drawParticles() {
    if (this.particles.length === 0) {
      return;
    }
    const { ctx } = this;
    ctx.save();
    for (const particle of this.particles) {
      const { x, y } = this.gridToCanvas(particle.x, particle.y);
      const radius = particle.radius * this.boardRect.cellSize;
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = colorMaskToCss(particle.colorMask, alpha);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  cellCenter(x, y) {
    return this.gridToCanvas(x + 0.5, y + 0.5);
  }

  gridToCanvas(gx, gy) {
    return {
      x: this.boardRect.x + gx * this.boardRect.cellSize,
      y: this.boardRect.y + gy * this.boardRect.cellSize,
    };
  }

  screenToCell(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * this.canvas.height;
    const gx = (canvasX - this.boardRect.x) / this.boardRect.cellSize;
    const gy = (canvasY - this.boardRect.y) / this.boardRect.cellSize;

    if (
      gx < 0 ||
      gy < 0 ||
      gx >= this.state.grid.width ||
      gy >= this.state.grid.height
    ) {
      return null;
    }
    return { x: Math.floor(gx), y: Math.floor(gy) };
  }

  handleMouseDown(event) {
    const cell = this.screenToCell(event.clientX, event.clientY);
    if (!cell) {
      return;
    }
    this.isMouseDown = true;
    if (event.button === 2) {
      this.engine.rotateComponent(cell.x, cell.y, true);
      return;
    }
    if (event.button !== 0) {
      return;
    }
    this.engine.placeFromTool(cell.x, cell.y, this.state.selectedToolId);
  }

  handleMouseMove(event) {
    this.hoverCell = this.screenToCell(event.clientX, event.clientY);
  }

  handleMouseUp() {
    this.isMouseDown = false;
  }
}
