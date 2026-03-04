import { BeamSimulator } from "./beamSimulator.js";
import { colorLabel, gridKey } from "./constants.js";
import { GameGrid } from "./grid.js";
import { levelData } from "./levelData.js";

const STORAGE_KEY = "laser-logic-progress-v1";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toolIdFromEntry(entry, index) {
  const color = entry.color ?? "none";
  return `${entry.type}:${color}:${index}`;
}

export class GameEngine {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.levels = deepClone(levelData);
    this.currentLevelIndex = 0;
    this.grid = null;
    this.beamSimulator = null;
    this.beamResult = null;
    this.moves = 0;
    this.won = false;
    this.tools = [];
    this.placedToolByCell = new Map();
    this.selectedToolId = "eraser";
    this.onStateChange = null;
    this.onWin = null;

    const progress = this.loadProgress();
    this.unlockedLevel = progress.unlockedLevel;
    this.bestStarsByLevel = progress.bestStarsByLevel;

    this.loadLevel(this.levels[0].id);
  }

  loadProgress() {
    const fallback = { unlockedLevel: 1, bestStarsByLevel: {} };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        unlockedLevel: Math.max(1, Number(parsed.unlockedLevel) || 1),
        bestStarsByLevel: parsed.bestStarsByLevel && typeof parsed.bestStarsByLevel === "object"
          ? parsed.bestStarsByLevel
          : {},
      };
    } catch {
      return fallback;
    }
  }

  saveProgress() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        unlockedLevel: this.unlockedLevel,
        bestStarsByLevel: this.bestStarsByLevel,
      }),
    );
  }

  isLevelUnlocked(levelIndex) {
    return levelIndex + 1 <= this.unlockedLevel;
  }

  loadLevel(levelId) {
    const requestedIndex = this.levels.findIndex((level) => level.id === Number(levelId));
    const index = requestedIndex >= 0 ? requestedIndex : 0;
    if (!this.isLevelUnlocked(index)) {
      return false;
    }

    this.currentLevelIndex = index;
    const level = this.levels[this.currentLevelIndex];
    const [width, height] = level.grid;

    this.grid = new GameGrid(width, height);
    for (const source of level.sources) {
      this.grid.reserveCell(source.x, source.y);
    }
    for (const target of level.targets) {
      this.grid.reserveCell(target.x, target.y);
    }
    for (const fixed of level.fixedComponents ?? []) {
      this.grid.placeFixedComponent(
        fixed.x,
        fixed.y,
        fixed.type,
        fixed.rotation ?? 0,
        fixed.color ?? null,
      );
    }

    this.tools = (level.available ?? []).map((entry, indexInLevel) => {
      const count = entry.count ?? null;
      const normalizedCount = Number.isFinite(count) ? Math.max(0, Number(count)) : null;
      return {
        id: toolIdFromEntry(entry, indexInLevel),
        type: entry.type,
        color: entry.color ?? null,
        defaultRotation: entry.rotation ?? 0,
        count: normalizedCount,
        remaining: normalizedCount,
        label: entry.label ?? this.defaultToolLabel(entry.type, entry.color),
      };
    });

    this.placedToolByCell.clear();
    this.moves = 0;
    this.won = false;
    this.selectedToolId = this.tools.length > 0 ? this.tools[0].id : "eraser";

    this.beamSimulator = new BeamSimulator(this.grid);
    this.gameLoop();
    return true;
  }

  defaultToolLabel(type, color) {
    const base = type.charAt(0).toUpperCase() + type.slice(1);
    if (!color) {
      return base;
    }
    return `${base} (${colorLabel(color)})`;
  }

  resetLevel() {
    this.grid.clearPlaced();
    this.placedToolByCell.clear();
    for (const tool of this.tools) {
      tool.remaining = tool.count;
    }
    this.moves = 0;
    this.won = false;
    this.gameLoop();
  }

  canUseTool(tool) {
    return tool && (tool.remaining === null || tool.remaining > 0);
  }

  findTool(toolId) {
    return this.tools.find((tool) => tool.id === toolId) ?? null;
  }

  setSelectedTool(toolId) {
    if (toolId === "eraser") {
      this.selectedToolId = toolId;
      this.emitState();
      return;
    }
    const tool = this.findTool(toolId);
    if (tool) {
      this.selectedToolId = toolId;
      this.emitState();
    }
  }

  refundToolForCell(x, y) {
    const key = gridKey(x, y);
    const toolId = this.placedToolByCell.get(key);
    if (!toolId) {
      return;
    }
    const tool = this.findTool(toolId);
    if (tool && tool.remaining !== null) {
      tool.remaining += 1;
    }
    this.placedToolByCell.delete(key);
  }

  removePlacedComponent(x, y, countMove = true) {
    if (!this.grid.getPlacedComponent(x, y)) {
      return false;
    }
    this.grid.clearCell(x, y);
    this.refundToolForCell(x, y);
    if (countMove) {
      this.moves += 1;
    }
    this.gameLoop();
    return true;
  }

  rotateComponent(x, y, countMove = true) {
    const didRotate = this.grid.rotateComponent(x, y, 1);
    if (!didRotate) {
      return false;
    }
    if (countMove) {
      this.moves += 1;
    }
    this.gameLoop();
    return true;
  }

  placeFromTool(x, y, toolId = this.selectedToolId) {
    if (toolId === "eraser") {
      return this.removePlacedComponent(x, y, true);
    }

    const tool = this.findTool(toolId);
    if (!tool || !this.canUseTool(tool)) {
      return false;
    }
    if (!this.grid.isInBounds(x, y) || !this.grid.canPlaceAt(x, y)) {
      return false;
    }

    const existing = this.grid.getPlacedComponent(x, y);
    if (existing) {
      if (existing.type === tool.type && existing.color === tool.color) {
        return this.rotateComponent(x, y, true);
      }
      this.removePlacedComponent(x, y, false);
    }

    const didPlace = this.grid.placeComponent(
      x,
      y,
      tool.type,
      tool.defaultRotation ?? 0,
      tool.color ?? null,
    );

    if (!didPlace) {
      return false;
    }
    if (tool.remaining !== null) {
      tool.remaining -= 1;
    }

    this.placedToolByCell.set(gridKey(x, y), tool.id);
    this.moves += 1;
    this.gameLoop();
    return true;
  }

  gameLoop() {
    const level = this.levels[this.currentLevelIndex];
    this.beamResult = this.beamSimulator.simulateLevel(level.sources, level.targets);
    const wasWon = this.won;
    this.won = this.beamResult.solved;

    if (this.won && !wasWon) {
      const stars = this.getStarsForMoves(this.moves, level.par);
      const bestKey = String(level.id);
      const previousBest = Number(this.bestStarsByLevel[bestKey] ?? 0);
      this.bestStarsByLevel[bestKey] = Math.max(previousBest, stars);
      this.unlockedLevel = Math.max(this.unlockedLevel, Math.min(this.levels.length, this.currentLevelIndex + 2));
      this.saveProgress();
      if (typeof this.onWin === "function") {
        this.onWin(this.getState());
      }
    }

    this.emitState();
  }

  emitState() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.getState());
    }
  }

  getStarsForMoves(moves, par) {
    const normalizedPar = Math.max(1, Number(par) || 1);
    if (moves <= normalizedPar) {
      return 3;
    }
    if (moves <= normalizedPar + 2) {
      return 2;
    }
    return 1;
  }

  getLevelBestStars(levelId) {
    return Number(this.bestStarsByLevel[String(levelId)] ?? 0);
  }

  loadNextLevel() {
    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= this.levels.length || !this.isLevelUnlocked(nextIndex)) {
      return false;
    }
    return this.loadLevel(this.levels[nextIndex].id);
  }

  loadPrevLevel() {
    const prevIndex = this.currentLevelIndex - 1;
    if (prevIndex < 0) {
      return false;
    }
    return this.loadLevel(this.levels[prevIndex].id);
  }

  getState() {
    const level = this.levels[this.currentLevelIndex];
    return {
      level,
      levelIndex: this.currentLevelIndex,
      levelCount: this.levels.length,
      unlockedLevel: this.unlockedLevel,
      moves: this.moves,
      par: level.par,
      stars: this.getStarsForMoves(this.moves, level.par),
      bestStarsForCurrent: this.getLevelBestStars(level.id),
      tools: this.tools.map((tool) => ({ ...tool })),
      selectedToolId: this.selectedToolId,
      won: this.won,
      beamResult: this.beamResult,
      grid: this.grid,
      canGoPrev: this.currentLevelIndex > 0,
      canGoNext:
        this.currentLevelIndex + 1 < this.levels.length && this.isLevelUnlocked(this.currentLevelIndex + 1),
      levelOptions: this.levels.map((entry, index) => ({
        id: entry.id,
        name: entry.name,
        unlocked: this.isLevelUnlocked(index),
        bestStars: this.getLevelBestStars(entry.id),
      })),
    };
  }
}
