(() => {
  "use strict";

  const GRID_WIDTH = 16;
  const GRID_HEIGHT = 12;
  const WALL = 1;
  const FLOOR = 0;

  const STORAGE_PROGRESS_KEY = "mote_creator_seed_progress_v1";
  const STORAGE_HUB_KEY = "mote_creator_seed_hub_v1";
  const CUSTOM_SEED_PREFIX = "99";

  const DIRECTION_PRIORITY = [
    { x: 0, y: 0 }, // allow staying in place
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function deepCloneLevel(level) {
    return {
      ...level,
      start: { ...level.start },
      goal: { ...level.goal },
      grid: level.grid.map((row) => row.slice())
    };
  }

  function buildLevelFromInteriorRows(rows, seedLabel, complexity = 1) {
    if (!Array.isArray(rows) || rows.length !== GRID_HEIGHT - 2) {
      throw new Error("Tutorial level must provide 10 interior rows.");
    }

    const grid = Array.from({ length: GRID_HEIGHT }, () =>
      Array.from({ length: GRID_WIDTH }, () => WALL)
    );

    let start = null;
    let goal = null;

    for (let y = 0; y < rows.length; y += 1) {
      const row = rows[y];
      if (row.length !== GRID_WIDTH - 2) {
        throw new Error("Tutorial interior row must be 14 characters wide.");
      }
      for (let x = 0; x < row.length; x += 1) {
        const ch = row[x];
        const gx = x + 1;
        const gy = y + 1;
        if (ch === "#") {
          grid[gy][gx] = WALL;
          continue;
        }
        grid[gy][gx] = FLOOR;
        if (ch === "S") {
          start = { x: gx, y: gy };
        } else if (ch === "G") {
          goal = { x: gx, y: gy };
        }
      }
    }

    if (!start || !goal) {
      throw new Error("Tutorial level requires both start (S) and goal (G).");
    }

    const rawLevel = {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      grid,
      start,
      goal
    };
    const analyzer = new LevelGenerator(seedLabel);
    if (!analyzer.isLevelSolvable(rawLevel)) {
      throw new Error("Tutorial layout is unsolvable.");
    }
    return analyzer.decorateLevel(rawLevel, complexity, seedLabel, "tutorial");
  }

  function hashSeedToUint(seed) {
    const text = String(seed ?? 0);
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  class DeterministicRNG {
    constructor(seed) {
      this.state = hashSeedToUint(seed) || 0x9e3779b9;
    }

    next() {
      // xorshift32
      let x = this.state;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      this.state = x >>> 0;
      return (this.state >>> 0) / 4294967296;
    }

    int(min, maxInclusive) {
      const minInt = Math.ceil(min);
      const maxInt = Math.floor(maxInclusive);
      return Math.floor(this.next() * (maxInt - minInt + 1)) + minInt;
    }

    pick(array) {
      if (!array.length) {
        return null;
      }
      return array[this.int(0, array.length - 1)];
    }

    chance(probability) {
      return this.next() < probability;
    }
  }

  class LevelSerializer {
    static encodeCustom(levelData) {
      if (
        levelData.width !== GRID_WIDTH ||
        levelData.height !== GRID_HEIGHT
      ) {
        throw new Error("Custom seed export currently supports 16x12 levels.");
      }

      let payload = 0n;
      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const bit = levelData.grid[y][x] === WALL ? 1n : 0n;
          payload = (payload << 1n) | bit;
        }
      }

      const startIndex = BigInt(levelData.start.y * GRID_WIDTH + levelData.start.x);
      const goalIndex = BigInt(levelData.goal.y * GRID_WIDTH + levelData.goal.x);
      payload = (payload << 8n) | startIndex;
      payload = (payload << 8n) | goalIndex;
      payload = (payload << 4n) | 1n; // format version

      return `${CUSTOM_SEED_PREFIX}${payload.toString(10)}`;
    }

    static decodeCustom(seedText) {
      const value = String(seedText).trim();
      if (
        !value.startsWith(CUSTOM_SEED_PREFIX) ||
        value.length < 24 ||
        !/^\d+$/.test(value)
      ) {
        return null;
      }

      let payload;
      try {
        payload = BigInt(value.slice(CUSTOM_SEED_PREFIX.length));
      } catch (_err) {
        return null;
      }

      const version = Number(payload & 0b1111n);
      if (version !== 1) {
        return null;
      }
      payload >>= 4n;

      const goalIndex = Number(payload & 0xffn);
      payload >>= 8n;
      const startIndex = Number(payload & 0xffn);
      payload >>= 8n;

      if (
        startIndex < 0 ||
        startIndex >= GRID_WIDTH * GRID_HEIGHT ||
        goalIndex < 0 ||
        goalIndex >= GRID_WIDTH * GRID_HEIGHT ||
        startIndex === goalIndex
      ) {
        return null;
      }

      const grid = Array.from({ length: GRID_HEIGHT }, () =>
        Array.from({ length: GRID_WIDTH }, () => FLOOR)
      );

      for (let index = GRID_WIDTH * GRID_HEIGHT - 1; index >= 0; index -= 1) {
        const bit = Number(payload & 1n);
        payload >>= 1n;
        const x = index % GRID_WIDTH;
        const y = Math.floor(index / GRID_WIDTH);
        grid[y][x] = bit === 1 ? WALL : FLOOR;
      }

      for (let x = 0; x < GRID_WIDTH; x += 1) {
        grid[0][x] = WALL;
        grid[GRID_HEIGHT - 1][x] = WALL;
      }
      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        grid[y][0] = WALL;
        grid[y][GRID_WIDTH - 1] = WALL;
      }

      const start = {
        x: startIndex % GRID_WIDTH,
        y: Math.floor(startIndex / GRID_WIDTH)
      };
      const goal = {
        x: goalIndex % GRID_WIDTH,
        y: Math.floor(goalIndex / GRID_WIDTH)
      };

      grid[start.y][start.x] = FLOOR;
      grid[goal.y][goal.x] = FLOOR;

      return {
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
        grid,
        start,
        goal,
        seed: value,
        isCustom: true
      };
    }
  }

  // Module 3: Deterministic Level Generator
  class LevelGenerator {
    constructor(seed) {
      this.seed = String(seed ?? 1);
      this.width = GRID_WIDTH;
      this.height = GRID_HEIGHT;
    }

    createFilledGrid(fillValue = WALL) {
      return Array.from({ length: this.height }, () =>
        Array.from({ length: this.width }, () => fillValue)
      );
    }

    isInterior(x, y) {
      return x >= 1 && y >= 1 && x <= this.width - 2 && y <= this.height - 2;
    }

    neighbors4(x, y) {
      return [
        { x, y: y - 1 },
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y + 1 }
      ];
    }

    countOpenNeighbors(grid, x, y) {
      let count = 0;
      for (const next of this.neighbors4(x, y)) {
        if (
          next.x >= 0 &&
          next.y >= 0 &&
          next.x < this.width &&
          next.y < this.height &&
          grid[next.y][next.x] === FLOOR
        ) {
          count += 1;
        }
      }
      return count;
    }

    carveFloor(grid, x, y) {
      if (this.isInterior(x, y)) {
        grid[y][x] = FLOOR;
      }
    }

    pickStartGoal(rng) {
      let start = {
        x: rng.int(1, 3),
        y: rng.int(1, this.height - 2)
      };
      let goal = {
        x: rng.int(this.width - 4, this.width - 2),
        y: rng.int(1, this.height - 2)
      };

      let guard = 0;
      while (manhattan(start, goal) < Math.floor(this.width * 0.7) && guard < 25) {
        start = { x: rng.int(1, 3), y: rng.int(1, this.height - 2) };
        goal = {
          x: rng.int(this.width - 4, this.width - 2),
          y: rng.int(1, this.height - 2)
        };
        guard += 1;
      }
      return { start, goal };
    }

    carvePrimaryPath(grid, start, goal, rng, complexity) {
      const path = [{ ...start }];
      const visited = new Set([`${start.x},${start.y}`]);
      let current = { ...start };
      this.carveFloor(grid, current.x, current.y);
      this.carveFloor(grid, goal.x, goal.y);

      const maxSteps = this.width * this.height * 3;
      for (let step = 0; step < maxSteps; step += 1) {
        if (current.x === goal.x && current.y === goal.y) {
          return path;
        }

        const options = this.neighbors4(current.x, current.y).filter((next) =>
          this.isInterior(next.x, next.y)
        );

        if (!options.length) {
          break;
        }

        let best = options[0];
        let bestScore = Number.POSITIVE_INFINITY;

        for (const option of options) {
          const revisitPenalty = visited.has(`${option.x},${option.y}`) ? 2.5 : 0;
          const distanceScore = manhattan(option, goal) * 1.2;
          const jitter = rng.next() * (0.9 + complexity * 0.2);
          const score = distanceScore + revisitPenalty + jitter;
          if (score < bestScore) {
            bestScore = score;
            best = option;
          }
        }

        current = { ...best };
        this.carveFloor(grid, current.x, current.y);
        path.push({ ...current });
        visited.add(`${current.x},${current.y}`);

        if (rng.chance(0.15 + complexity * 0.02)) {
          const side = rng.pick(this.neighbors4(current.x, current.y));
          if (side && this.isInterior(side.x, side.y)) {
            this.carveFloor(grid, side.x, side.y);
          }
        }
      }

      // deterministic fallback corridor to ensure a route to goal
      while (current.x !== goal.x) {
        current.x += goal.x > current.x ? 1 : -1;
        this.carveFloor(grid, current.x, current.y);
        path.push({ ...current });
      }
      while (current.y !== goal.y) {
        current.y += goal.y > current.y ? 1 : -1;
        this.carveFloor(grid, current.x, current.y);
        path.push({ ...current });
      }
      return path;
    }

    growRooms(grid, path, rng, complexity) {
      const roomCount = 3 + complexity * 2;
      for (let i = 0; i < roomCount; i += 1) {
        const anchor = rng.pick(path) || { x: 2, y: 2 };
        const radiusX = 1 + rng.int(1, 1 + complexity);
        const radiusY = 1 + rng.int(1, 1 + complexity);

        for (let y = anchor.y - radiusY; y <= anchor.y + radiusY; y += 1) {
          for (let x = anchor.x - radiusX; x <= anchor.x + radiusX; x += 1) {
            if (!this.isInterior(x, y)) {
              continue;
            }
            if (rng.chance(0.85)) {
              grid[y][x] = FLOOR;
            }
          }
        }
      }
    }

    carveBranches(grid, path, rng, complexity) {
      const branches = 5 + complexity * 5;
      for (let i = 0; i < branches; i += 1) {
        const anchor = rng.pick(path);
        if (!anchor) {
          continue;
        }

        let x = anchor.x;
        let y = anchor.y;
        let dir = rng.pick([
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 }
        ]);

        const length = 2 + rng.int(0, 3 + complexity);
        for (let step = 0; step < length; step += 1) {
          x += dir.x;
          y += dir.y;
          if (!this.isInterior(x, y)) {
            break;
          }

          this.carveFloor(grid, x, y);
          if (rng.chance(0.25)) {
            const turn = rng.pick([
              { x: -dir.y, y: dir.x },
              { x: dir.y, y: -dir.x }
            ]);
            if (turn) {
              dir = turn;
            }
          }
        }
      }
    }

    addStrategicObstacles(grid, start, goal, path, rng, complexity) {
      const protectedSet = new Set();
      for (const cell of path) {
        protectedSet.add(`${cell.x},${cell.y}`);
      }
      protectedSet.add(`${start.x},${start.y}`);
      protectedSet.add(`${goal.x},${goal.y}`);

      const targetWalls = 6 + complexity * 6;
      let added = 0;
      const attempts = 500;

      for (let i = 0; i < attempts && added < targetWalls; i += 1) {
        const x = rng.int(1, this.width - 2);
        const y = rng.int(1, this.height - 2);
        const key = `${x},${y}`;

        if (protectedSet.has(key) || grid[y][x] === WALL) {
          continue;
        }
        if (manhattan({ x, y }, start) <= 1 || manhattan({ x, y }, goal) <= 1) {
          continue;
        }

        const openNeighbors = this.countOpenNeighbors(grid, x, y);
        if (openNeighbors < 2) {
          continue;
        }

        grid[y][x] = WALL;
        if (!this.isLevelSolvable({ grid, start, goal })) {
          grid[y][x] = FLOOR;
        } else {
          added += 1;
        }
      }
    }

    calculateMetrics(levelData, complexity) {
      const pathLength = this.shortestPathLength(
        levelData.grid,
        levelData.start,
        levelData.goal
      );
      let floorCount = 0;
      let intersectionCount = 0;
      for (let y = 1; y < this.height - 1; y += 1) {
        for (let x = 1; x < this.width - 1; x += 1) {
          if (levelData.grid[y][x] === FLOOR) {
            floorCount += 1;
            if (this.countOpenNeighbors(levelData.grid, x, y) >= 3) {
              intersectionCount += 1;
            }
          }
        }
      }
      const interiorCells = (this.width - 2) * (this.height - 2);
      const obstacleDensity = 1 - floorCount / interiorCells;
      const branchiness = floorCount > 0 ? intersectionCount / floorCount : 0;

      // More open maps are usually easier; dense, linear maps are harder.
      const difficulty = clamp(
        Math.round(
          pathLength / 14 +
            obstacleDensity * 7 +
            (1 - branchiness) * 2.5 +
            complexity * 0.6
        ),
        1,
        10
      );

      let difficultyLabel = "Easy";
      if (difficulty >= 8) {
        difficultyLabel = "Expert";
      } else if (difficulty >= 6) {
        difficultyLabel = "Hard";
      } else if (difficulty >= 4) {
        difficultyLabel = "Normal";
      }

      const lightBudget = clamp(
        Math.round(10 + complexity + pathLength / 12 - obstacleDensity * 6),
        6,
        20
      );

      return {
        pathLength,
        obstacleDensity,
        branchiness,
        difficulty,
        difficultyLabel,
        lightBudget
      };
    }

    buildFallbackLevel(complexity) {
      const grid = this.createFilledGrid(WALL);
      for (let y = 1; y < this.height - 1; y += 1) {
        for (let x = 1; x < this.width - 1; x += 1) {
          grid[y][x] = FLOOR;
        }
      }

      const start = { x: 2, y: Math.floor(this.height / 2) };
      const goal = { x: this.width - 3, y: Math.floor(this.height / 2) };

      const fallback = { width: this.width, height: this.height, grid, start, goal };
      const metrics = this.calculateMetrics(fallback, complexity);
      return { ...fallback, complexity, ...metrics, seed: this.seed };
    }

    decorateLevel(levelData, complexity, seedValue, sourceType) {
      const metrics = this.calculateMetrics(levelData, complexity);
      return {
        ...levelData,
        complexity,
        ...metrics,
        seed: String(seedValue),
        sourceType
      };
    }

    generate(complexity = 3) {
      const normalizedComplexity = clamp(Number(complexity) || 3, 1, 5);
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const rng = new DeterministicRNG(
          `${this.seed}|${normalizedComplexity}|${attempt}`
        );
        const grid = this.createFilledGrid(WALL);
        const { start, goal } = this.pickStartGoal(rng);
        const path = this.carvePrimaryPath(grid, start, goal, rng, normalizedComplexity);
        this.growRooms(grid, path, rng, normalizedComplexity);
        this.carveBranches(grid, path, rng, normalizedComplexity);
        this.addStrategicObstacles(
          grid,
          start,
          goal,
          path,
          rng,
          normalizedComplexity
        );

        const candidate = { width: this.width, height: this.height, grid, start, goal };
        if (this.isLevelSolvable(candidate)) {
          return this.decorateLevel(
            candidate,
            normalizedComplexity,
            this.seed,
            "generated"
          );
        }
      }
      return this.buildFallbackLevel(normalizedComplexity);
    }

    shortestPathLength(grid, start, goal) {
      const queue = [{ x: start.x, y: start.y, dist: 0 }];
      const seen = new Set([`${start.x},${start.y}`]);
      while (queue.length > 0) {
        const node = queue.shift();
        if (node.x === goal.x && node.y === goal.y) {
          return node.dist;
        }
        for (const next of this.neighbors4(node.x, node.y)) {
          if (
            next.x < 0 ||
            next.y < 0 ||
            next.x >= this.width ||
            next.y >= this.height
          ) {
            continue;
          }
          if (grid[next.y][next.x] === WALL) {
            continue;
          }
          const key = `${next.x},${next.y}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          queue.push({ x: next.x, y: next.y, dist: node.dist + 1 });
        }
      }
      return -1;
    }

    isLevelSolvable(levelData) {
      return (
        this.shortestPathLength(levelData.grid, levelData.start, levelData.goal) !== -1
      );
    }
  }

  // Module 2: Mote AI & Light Physics
  class LightSource {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.maxIntensity = 7.5;
      this.intensity = this.maxIntensity;
      this.maxLifetime = 3400;
      this.lifetime = this.maxLifetime;
    }

    update(deltaMs) {
      this.lifetime = Math.max(0, this.lifetime - deltaMs);
      const t = this.lifetime / this.maxLifetime;
      this.intensity = this.maxIntensity * t * t;
    }

    getIntensityAt(distance) {
      if (this.lifetime <= 0) {
        return 0;
      }
      return this.intensity / (1 + distance * distance);
    }

    get alive() {
      return this.lifetime > 0.001;
    }
  }

  class MoteAI {
    constructor(gridPosition) {
      this.x = gridPosition.x;
      this.y = gridPosition.y;
      this.previous = null;
      this.recentCells = [];
    }

    reset(gridPosition) {
      this.x = gridPosition.x;
      this.y = gridPosition.y;
      this.previous = null;
      this.recentCells = [];
    }

    recentPenalty(x, y) {
      let penalty = 0;
      for (let i = 0; i < this.recentCells.length; i += 1) {
        const node = this.recentCells[i];
        if (node.x === x && node.y === y) {
          penalty += (this.recentCells.length - i) * 0.06;
        }
      }
      if (this.previous && this.previous.x === x && this.previous.y === y) {
        penalty += 0.25;
      }
      return penalty;
    }

    calculateMove(lightGrid, levelData) {
      let best = { x: this.x, y: this.y };
      let bestScore = Number.POSITIVE_INFINITY;

      for (const offset of DIRECTION_PRIORITY) {
        const nx = this.x + offset.x;
        const ny = this.y + offset.y;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= levelData.width ||
          ny >= levelData.height
        ) {
          continue;
        }
        if (levelData.grid[ny][nx] === WALL) {
          continue;
        }

        const lightValue = lightGrid[ny][nx];
        const score = lightValue + this.recentPenalty(nx, ny);
        if (score < bestScore - 1e-6) {
          bestScore = score;
          best = { x: nx, y: ny };
        }
      }
      return best;
    }

    commitMove(nextPos) {
      if (nextPos.x === this.x && nextPos.y === this.y) {
        return false;
      }

      this.previous = { x: this.x, y: this.y };
      this.recentCells.push({ x: this.x, y: this.y });
      if (this.recentCells.length > 8) {
        this.recentCells.shift();
      }
      this.x = nextPos.x;
      this.y = nextPos.y;
      return true;
    }
  }

  // Module 1: Core Game Engine & Rendering
  class GameEngine {
    constructor(canvasId, seed) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext("2d");

      this.editorUI = null;
      this.onStateChange = null;
      this.onWin = null;
      this.isEditMode = false;

      this.currentLevel = null;
      this.initialLevel = null;
      this.levelMeta = null;
      this.mote = null;
      this.lights = [];

      this.moves = 0;
      this.lightsPlaced = 0;
      this.won = false;
      this.message = "";
      this.messageUntil = 0;

      this.moveIntervalMs = 250;
      this.moveAccumulator = 0;
      this.lastFrameTime = performance.now();
      this.lightGrid = [];

      this.canvas.addEventListener("click", (event) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.handleClick(x, y);
      });

      const initialSeed = String(seed || 4242);
      const initialGenerator = new LevelGenerator(initialSeed);
      const initialLevel = initialGenerator.generate(3);
      this.loadLevel(initialLevel, {
        sourceType: "generated",
        seed: initialSeed,
        title: "Generated"
      });

      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }

    setEditorUI(editorUI) {
      this.editorUI = editorUI;
    }

    setMessage(text, durationMs = 1800) {
      this.message = text;
      this.messageUntil = performance.now() + durationMs;
      this.emitStateChange();
    }

    emitStateChange() {
      if (typeof this.onStateChange === "function") {
        this.onStateChange();
      }
    }

    gridDimensions() {
      return {
        width: this.currentLevel?.width || GRID_WIDTH,
        height: this.currentLevel?.height || GRID_HEIGHT
      };
    }

    tileSize() {
      const dims = this.gridDimensions();
      return Math.floor(
        Math.min(this.canvas.width / dims.width, this.canvas.height / dims.height)
      );
    }

    toTileCoordinates(pixelX, pixelY) {
      const tile = this.tileSize();
      const x = Math.floor(pixelX / tile);
      const y = Math.floor(pixelY / tile);
      return { x, y };
    }

    isWalkable(x, y) {
      if (!this.currentLevel) {
        return false;
      }
      return (
        x >= 0 &&
        y >= 0 &&
        x < this.currentLevel.width &&
        y < this.currentLevel.height &&
        this.currentLevel.grid[y][x] === FLOOR
      );
    }

    loadLevel(levelData, levelMeta = {}) {
      this.currentLevel = deepCloneLevel(levelData);
      this.initialLevel = deepCloneLevel(levelData);
      this.levelMeta = {
        sourceType: levelMeta.sourceType || levelData.sourceType || "generated",
        seed: String(levelMeta.seed || levelData.seed || "0"),
        title: levelMeta.title || "Level",
        id: levelMeta.id || null,
        complexity: levelData.complexity ?? levelMeta.complexity ?? 3
      };

      this.currentLevel.seed = this.levelMeta.seed;
      this.currentLevel.sourceType = this.levelMeta.sourceType;
      this.currentLevel.complexity = this.levelMeta.complexity;

      this.mote = new MoteAI(this.currentLevel.start);
      this.lights = [];
      this.moves = 0;
      this.lightsPlaced = 0;
      this.won = false;
      this.moveAccumulator = 0;
      this.lightGrid = this.createLightGrid();
      this.emitStateChange();
    }

    createLightGrid() {
      if (!this.currentLevel) {
        return [];
      }
      return Array.from({ length: this.currentLevel.height }, () =>
        Array.from({ length: this.currentLevel.width }, () => 0)
      );
    }

    calculateLightGrid() {
      const grid = this.createLightGrid();
      if (!this.currentLevel) {
        return grid;
      }

      for (let y = 0; y < this.currentLevel.height; y += 1) {
        for (let x = 0; x < this.currentLevel.width; x += 1) {
          let value = 0;
          for (const light of this.lights) {
            const dx = x - light.x;
            const dy = y - light.y;
            const distance = Math.hypot(dx, dy);
            value += light.getIntensityAt(distance);
          }
          grid[y][x] = value;
        }
      }
      return grid;
    }

    frame(now) {
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.update(delta);
      this.draw();
      requestAnimationFrame(this.frame);
    }

    update(deltaMs) {
      if (!this.currentLevel) {
        return;
      }

      for (const light of this.lights) {
        light.update(deltaMs);
      }
      this.lights = this.lights.filter((light) => light.alive);
      this.lightGrid = this.calculateLightGrid();

      if (this.isEditMode || this.won) {
        return;
      }

      this.moveAccumulator += deltaMs;
      while (this.moveAccumulator >= this.moveIntervalMs) {
        this.moveAccumulator -= this.moveIntervalMs;
        const next = this.mote.calculateMove(this.lightGrid, this.currentLevel);
        const moved = this.mote.commitMove(next);
        if (moved) {
          this.moves += 1;
          this.emitStateChange();
        }
        if (
          this.mote.x === this.currentLevel.goal.x &&
          this.mote.y === this.currentLevel.goal.y
        ) {
          this.won = true;
          this.emitStateChange();
          if (typeof this.onWin === "function") {
            this.onWin({
              seed: this.currentLevel.seed,
              lightsPlaced: this.lightsPlaced,
              lightBudget: this.currentLevel.lightBudget,
              moves: this.moves,
              complexity: this.currentLevel.complexity,
              sourceType: this.currentLevel.sourceType
            });
          }
          break;
        }
      }
    }

    handleClick(pixelX, pixelY) {
      if (!this.currentLevel) {
        return;
      }

      const tile = this.toTileCoordinates(pixelX, pixelY);
      if (
        tile.x < 0 ||
        tile.y < 0 ||
        tile.x >= this.currentLevel.width ||
        tile.y >= this.currentLevel.height
      ) {
        return;
      }

      if (this.isEditMode && this.editorUI) {
        this.editorUI.handleEditorClick(tile.x, tile.y);
        return;
      }

      if (this.won) {
        return;
      }

      this.placeLight(tile.x, tile.y);
    }

    placeLight(tileX, tileY) {
      if (!this.isWalkable(tileX, tileY)) {
        this.setMessage("Cannot place light on wall.");
        return;
      }
      if (this.lightsPlaced >= this.currentLevel.lightBudget) {
        this.setMessage("Light budget depleted.");
        return;
      }

      this.lights.push(new LightSource(tileX, tileY));
      this.lightsPlaced += 1;
      this.emitStateChange();
    }

    resetLevel() {
      if (!this.initialLevel) {
        return;
      }
      const preservedMeta = { ...this.levelMeta };
      this.loadLevel(this.initialLevel, preservedMeta);
      this.setMessage("Level reset.");
    }

    applyEditorChanges() {
      if (!this.currentLevel) {
        return;
      }

      this.currentLevel.grid[this.currentLevel.start.y][this.currentLevel.start.x] = FLOOR;
      this.currentLevel.grid[this.currentLevel.goal.y][this.currentLevel.goal.x] = FLOOR;

      const analyzer = new LevelGenerator(this.currentLevel.seed || "edited");
      if (!analyzer.isLevelSolvable(this.currentLevel)) {
        this.setMessage("Edited map is unsolvable. Add a path.");
        return false;
      }

      const decorated = analyzer.decorateLevel(
        this.currentLevel,
        this.currentLevel.complexity || 3,
        this.currentLevel.seed || "edited",
        "custom"
      );

      this.currentLevel = deepCloneLevel(decorated);
      this.initialLevel = deepCloneLevel(decorated);
      this.mote.reset(this.currentLevel.start);
      this.lights = [];
      this.moves = 0;
      this.lightsPlaced = 0;
      this.won = false;
      this.emitStateChange();
      return true;
    }

    drawCellRect(x, y, color) {
      const tile = this.tileSize();
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x * tile, y * tile, tile, tile);
    }

    draw() {
      if (!this.currentLevel) {
        return;
      }

      const ctx = this.ctx;
      const tile = this.tileSize();
      const level = this.currentLevel;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#090f1e";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      for (let y = 0; y < level.height; y += 1) {
        for (let x = 0; x < level.width; x += 1) {
          if (level.grid[y][x] === WALL) {
            this.drawCellRect(x, y, "#1a2236");
          } else {
            const glow = clamp(this.lightGrid[y][x] / 4.2, 0, 1);
            const floorBlue = Math.round(26 + glow * 30);
            const floorGreen = Math.round(22 + glow * 40);
            this.drawCellRect(x, y, `rgb(14, ${floorGreen}, ${floorBlue})`);
          }
        }
      }

      ctx.strokeStyle = "rgba(90, 120, 180, 0.2)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= level.width; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * tile + 0.5, 0);
        ctx.lineTo(x * tile + 0.5, level.height * tile);
        ctx.stroke();
      }
      for (let y = 0; y <= level.height; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * tile + 0.5);
        ctx.lineTo(level.width * tile, y * tile + 0.5);
        ctx.stroke();
      }

      const goalCx = level.goal.x * tile + tile * 0.5;
      const goalCy = level.goal.y * tile + tile * 0.5;
      const pulse = (Math.sin(performance.now() / 250) + 1) * 0.5;
      ctx.strokeStyle = `rgba(130, 255, 193, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(goalCx, goalCy, tile * 0.25 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(120, 255, 200, 0.16)";
      ctx.beginPath();
      ctx.arc(goalCx, goalCy, tile * 0.17, 0, Math.PI * 2);
      ctx.fill();

      for (const light of this.lights) {
        const alpha = clamp(light.intensity / light.maxIntensity, 0, 1);
        const cx = light.x * tile + tile * 0.5;
        const cy = light.y * tile + tile * 0.5;
        const gradient = ctx.createRadialGradient(
          cx,
          cy,
          tile * 0.1,
          cx,
          cy,
          tile * 2.4
        );
        gradient.addColorStop(0, `rgba(190, 245, 255, ${0.38 * alpha})`);
        gradient.addColorStop(0.42, `rgba(140, 220, 255, ${0.16 * alpha})`);
        gradient.addColorStop(1, "rgba(100, 180, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, tile * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(220, 248, 255, ${0.55 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, tile * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }

      const moteCx = this.mote.x * tile + tile * 0.5;
      const moteCy = this.mote.y * tile + tile * 0.5;
      ctx.fillStyle = "#eaf7ff";
      ctx.beginPath();
      ctx.arc(moteCx, moteCy, tile * 0.24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#98d9ff";
      ctx.beginPath();
      ctx.arc(moteCx + 3, moteCy - 2, tile * 0.06, 0, Math.PI * 2);
      ctx.fill();

      const startCx = level.start.x * tile + tile * 0.5;
      const startCy = level.start.y * tile + tile * 0.5;
      ctx.strokeStyle = "rgba(107, 231, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startCx - tile * 0.22, startCy);
      ctx.lineTo(startCx + tile * 0.22, startCy);
      ctx.moveTo(startCx, startCy - tile * 0.22);
      ctx.lineTo(startCx, startCy + tile * 0.22);
      ctx.stroke();

      if (this.isEditMode) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.56)";
        ctx.fillRect(0, 0, level.width * tile, 28);
        ctx.fillStyle = "#8ab9ff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("EDIT MODE: click tiles to modify map", 10, 19);
      }

      if (this.won) {
        ctx.fillStyle = "rgba(12, 22, 40, 0.68)";
        ctx.fillRect(0, level.height * tile - 40, level.width * tile, 40);
        ctx.fillStyle = "#8affc1";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Goal reached!", 12, level.height * tile - 14);
      }

      if (this.message && performance.now() < this.messageUntil) {
        ctx.fillStyle = "rgba(12, 18, 33, 0.75)";
        ctx.fillRect(0, 0, level.width * tile, 28);
        ctx.fillStyle = "#ffddaa";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(this.message, 10, 19);
      }
    }
  }

  // Module 5: Game State Manager & Level Progression
  class GameStateManager {
    constructor() {
      this.levelCatalog = this.buildCatalog();
      this.progress = this.loadProgress();
      this.seedHub = this.loadSeedHub();
    }

    buildCatalog() {
      const tutorials = [
        {
          id: "tutorial-1",
          title: "Tutorial 1",
          seed: "10001",
          complexity: 1,
          layoutRows: [
            "S............G",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            ".............."
          ]
        },
        {
          id: "tutorial-2",
          title: "Tutorial 2",
          seed: "10002",
          complexity: 1,
          layoutRows: [
            "S.....#.......",
            ".###..#..###..",
            "...#..#....#..",
            "...#..####.#..",
            "...#.......#..",
            "...#####.###..",
            ".......#......",
            ".#####.#.####.",
            ".....#.#.....G",
            ".....#........"
          ]
        },
        {
          id: "tutorial-3",
          title: "Tutorial 3",
          seed: "10003",
          complexity: 2,
          layoutRows: [
            "S..#......#...",
            "##.#.####.#.##",
            "...#.#..#.#...",
            ".###.#..#.###.",
            "...#.#..#.....",
            ".#.#.####.###.",
            ".#.#......#...",
            ".#.######.#.##",
            ".#........#..G",
            ".############."
          ]
        }
      ];
      const generated = [
        { id: "challenge-1", title: "Challenge 1", seed: "44587", complexity: 2 },
        { id: "challenge-2", title: "Challenge 2", seed: "55992", complexity: 3 },
        { id: "challenge-3", title: "Challenge 3", seed: "61873", complexity: 3 },
        { id: "challenge-4", title: "Challenge 4", seed: "74210", complexity: 4 },
        { id: "challenge-5", title: "Challenge 5", seed: "87061", complexity: 4 },
        { id: "challenge-6", title: "Challenge 6", seed: "93340", complexity: 5 }
      ];
      return tutorials.concat(generated);
    }

    loadProgress() {
      const fallback = {
        unlockedIndex: 0,
        bestByLevelId: {}
      };
      try {
        const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
        if (!raw) {
          return fallback;
        }
        const parsed = JSON.parse(raw);
        return {
          unlockedIndex: Number(parsed.unlockedIndex ?? 0),
          bestByLevelId: parsed.bestByLevelId ?? {}
        };
      } catch (_err) {
        return fallback;
      }
    }

    saveProgress() {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(this.progress));
    }

    loadSeedHub() {
      try {
        const raw = localStorage.getItem(STORAGE_HUB_KEY);
        if (!raw) {
          return [];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (_err) {
        // ignore parse errors
      }
      return [];
    }

    saveSeedHub() {
      localStorage.setItem(STORAGE_HUB_KEY, JSON.stringify(this.seedHub));
    }

    unlockNextLevel(currentLevelId) {
      const idx = this.levelCatalog.findIndex((level) => level.id === currentLevelId);
      if (idx === -1) {
        return;
      }
      if (this.progress.unlockedIndex <= idx) {
        this.progress.unlockedIndex = clamp(
          idx + 1,
          0,
          this.levelCatalog.length - 1
        );
        this.saveProgress();
      }
    }

    getLevelList() {
      return this.levelCatalog.map((level, index) => ({
        ...level,
        unlocked: index <= this.progress.unlockedIndex
      }));
    }

    getLevelById(levelId) {
      return this.levelCatalog.find((entry) => entry.id === levelId) || null;
    }

    getInitialLevel() {
      return this.levelCatalog[0];
    }

    getNextUnlockedAfter(levelId) {
      const idx = this.levelCatalog.findIndex((entry) => entry.id === levelId);
      if (idx < 0) {
        return null;
      }
      for (let i = idx + 1; i < this.levelCatalog.length; i += 1) {
        if (i <= this.progress.unlockedIndex) {
          return this.levelCatalog[i];
        }
      }
      return null;
    }

    recordBest(levelKey, result) {
      const efficiency = result.lightsPlaced * 100 + result.moves;
      const previous = this.progress.bestByLevelId[levelKey];
      if (!previous || efficiency < previous.efficiency) {
        this.progress.bestByLevelId[levelKey] = {
          lightsPlaced: result.lightsPlaced,
          moves: result.moves,
          efficiency
        };
        this.saveProgress();
      }
    }

    getBest(levelKey) {
      return this.progress.bestByLevelId[levelKey] || null;
    }

    addSeedToHub(seed, source = "custom") {
      const value = String(seed).trim();
      if (!value) {
        return;
      }
      this.seedHub = this.seedHub.filter((entry) => entry.seed !== value);
      this.seedHub.unshift({
        seed: value,
        source,
        createdAt: new Date().toISOString()
      });
      this.seedHub = this.seedHub.slice(0, 30);
      this.saveSeedHub();
    }

    getSeedHubList() {
      return this.seedHub.slice();
    }
  }

  // Module 4: Puzzle Editor & Seed Hub UI
  class EditorUI {
    constructor(gameEngine, gameStateManager) {
      this.gameEngine = gameEngine;
      this.gameStateManager = gameStateManager;
      this.activeTool = "wall";

      this.editorPanel = document.getElementById("editorPanel");
      this.editModeBtn = document.getElementById("editModeBtn");
      this.saveSeedBtn = document.getElementById("saveSeedBtn");
      this.clearInteriorBtn = document.getElementById("clearInteriorBtn");
      this.seedInput = document.getElementById("seedInput");
      this.complexitySelect = document.getElementById("complexitySelect");
      this.toolButtons = Array.from(document.querySelectorAll(".tool-btn"));

      this.onSeedSaved = null;

      this.bindEvents();
    }

    bindEvents() {
      this.editModeBtn.addEventListener("click", () => this.toggleEditMode());

      this.toolButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.activeTool = button.dataset.tool;
          this.toolButtons.forEach((node) => node.classList.remove("active"));
          button.classList.add("active");
        });
      });

      this.saveSeedBtn.addEventListener("click", () => {
        const seed = this.saveCurrentAsSeed();
        if (seed) {
          this.seedInput.value = seed;
          this.gameEngine.setMessage("Saved current layout as numeric seed.");
        }
      });

      this.clearInteriorBtn.addEventListener("click", () => this.clearInterior());
    }

    toggleEditMode(forceValue) {
      const newState =
        typeof forceValue === "boolean"
          ? forceValue
          : !this.gameEngine.isEditMode;
      this.gameEngine.isEditMode = newState;

      this.editorPanel.classList.toggle("hidden", !newState);
      this.editModeBtn.textContent = newState
        ? "Exit Edit Mode"
        : "Enter Edit Mode";

      if (!newState) {
        const ok = this.gameEngine.applyEditorChanges();
        if (!ok) {
          this.gameEngine.isEditMode = true;
          this.editorPanel.classList.remove("hidden");
          this.editModeBtn.textContent = "Exit Edit Mode";
        } else {
          this.gameEngine.setMessage("Edit changes applied.");
        }
      } else {
        this.gameEngine.setMessage("Editor enabled.");
      }
    }

    handleEditorClick(x, y) {
      const level = this.gameEngine.currentLevel;
      if (!level) {
        return;
      }

      if (
        x <= 0 ||
        y <= 0 ||
        x >= level.width - 1 ||
        y >= level.height - 1
      ) {
        return;
      }

      if (this.activeTool === "wall") {
        if ((x === level.start.x && y === level.start.y) || (x === level.goal.x && y === level.goal.y)) {
          return;
        }
        level.grid[y][x] = WALL;
      } else if (this.activeTool === "erase") {
        level.grid[y][x] = FLOOR;
      } else if (this.activeTool === "start") {
        level.start = { x, y };
        level.grid[y][x] = FLOOR;
      } else if (this.activeTool === "goal") {
        level.goal = { x, y };
        level.grid[y][x] = FLOOR;
      }

      if (level.start.x === level.goal.x && level.start.y === level.goal.y) {
        level.goal = { x: level.width - 2, y: level.height - 2 };
        level.grid[level.goal.y][level.goal.x] = FLOOR;
      }

      this.gameEngine.emitStateChange();
    }

    clearInterior() {
      const level = this.gameEngine.currentLevel;
      if (!level) {
        return;
      }
      for (let y = 1; y < level.height - 1; y += 1) {
        for (let x = 1; x < level.width - 1; x += 1) {
          level.grid[y][x] = FLOOR;
        }
      }
      level.grid[level.start.y][level.start.x] = FLOOR;
      level.grid[level.goal.y][level.goal.x] = FLOOR;
      this.gameEngine.emitStateChange();
    }

    saveCurrentAsSeed() {
      const level = this.gameEngine.currentLevel;
      if (!level) {
        return null;
      }
      const seed = LevelSerializer.encodeCustom(level);
      this.gameStateManager.addSeedToHub(seed, "custom");
      if (typeof this.onSeedSaved === "function") {
        this.onSeedSaved(seed);
      }
      return seed;
    }

    loadLevelFromSeed(seedText) {
      const value = String(seedText ?? "").trim();
      const complexity = clamp(Number(this.complexitySelect.value) || 3, 1, 5);
      if (!value) {
        return { ok: false, reason: "empty" };
      }

      const customLevel = LevelSerializer.decodeCustom(value);
      if (customLevel) {
        const analyzer = new LevelGenerator(value);
        if (!analyzer.isLevelSolvable(customLevel)) {
          return { ok: false, reason: "unsolvable" };
        }
        const decorated = analyzer.decorateLevel(
          customLevel,
          complexity,
          value,
          "custom"
        );
        this.gameEngine.loadLevel(decorated, {
          sourceType: "custom",
          seed: value,
          title: "Custom Seed"
        });
        return { ok: true, sourceType: "custom", seed: value };
      }

      const generator = new LevelGenerator(value);
      const generated = generator.generate(complexity);
      this.gameEngine.loadLevel(generated, {
        sourceType: "generated",
        seed: value,
        title: "Generated Seed",
        complexity
      });
      return { ok: true, sourceType: "generated", seed: value };
    }
  }

  class App {
    constructor() {
      this.gameState = new GameStateManager();
      this.currentLevelDescriptor = null;
      this.currentBestKey = "manual";

      this.cacheElements();

      this.gameEngine = new GameEngine("gameCanvas", 4242);
      this.editor = new EditorUI(this.gameEngine, this.gameState);
      this.gameEngine.setEditorUI(this.editor);

      this.editor.onSeedSaved = () => {
        this.renderSeedHub();
      };

      this.gameEngine.onStateChange = () => {
        this.refreshStatusBar();
      };

      this.gameEngine.onWin = (result) => {
        this.handleWin(result);
      };

      this.bindUIEvents();
      this.renderLevelSelect();
      this.renderSeedHub();

      const initial = this.gameState.getInitialLevel();
      if (initial) {
        this.loadCatalogLevel(initial.id);
      }
    }

    cacheElements() {
      this.seedInput = document.getElementById("seedInput");
      this.complexitySelect = document.getElementById("complexitySelect");
      this.loadSeedBtn = document.getElementById("loadSeedBtn");
      this.randomSeedBtn = document.getElementById("randomSeedBtn");
      this.resetBtn = document.getElementById("resetBtn");
      this.levelSelect = document.getElementById("levelSelect");
      this.loadSelectedLevelBtn = document.getElementById("loadSelectedLevelBtn");
      this.seedHubList = document.getElementById("seedHubList");

      this.currentLevelLabel = document.getElementById("currentLevelLabel");
      this.difficultyLabel = document.getElementById("difficultyLabel");
      this.lightsLabel = document.getElementById("lightsLabel");
      this.movesLabel = document.getElementById("movesLabel");
      this.bestLabel = document.getElementById("bestLabel");

      this.victoryOverlay = document.getElementById("victoryOverlay");
      this.victoryText = document.getElementById("victoryText");
      this.nextLevelBtn = document.getElementById("nextLevelBtn");
      this.closeVictoryBtn = document.getElementById("closeVictoryBtn");
    }

    bindUIEvents() {
      this.loadSeedBtn.addEventListener("click", () => {
        this.loadFromSeedInput();
      });

      this.seedInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.loadFromSeedInput();
        }
      });

      this.randomSeedBtn.addEventListener("click", () => {
        const seed = String(Math.floor(Math.random() * 900000) + 100000);
        this.seedInput.value = seed;
        this.loadFromSeedInput();
      });

      this.resetBtn.addEventListener("click", () => {
        this.gameEngine.resetLevel();
      });

      this.loadSelectedLevelBtn.addEventListener("click", () => {
        const selected = this.levelSelect.value;
        if (selected) {
          this.loadCatalogLevel(selected);
        }
      });

      this.nextLevelBtn.addEventListener("click", () => {
        this.victoryOverlay.classList.add("hidden");
        if (!this.currentLevelDescriptor?.id) {
          return;
        }
        const next = this.gameState.getNextUnlockedAfter(this.currentLevelDescriptor.id);
        if (next) {
          this.loadCatalogLevel(next.id);
        }
      });

      this.closeVictoryBtn.addEventListener("click", () => {
        this.victoryOverlay.classList.add("hidden");
      });
    }

    loadFromSeedInput() {
      const input = this.seedInput.value.trim();
      const result = this.editor.loadLevelFromSeed(input);
      if (!result.ok) {
        if (result.reason === "empty") {
          this.gameEngine.setMessage("Enter a seed.");
        } else if (result.reason === "unsolvable") {
          this.gameEngine.setMessage("Seed produced unsolvable map.");
        } else {
          this.gameEngine.setMessage("Unable to load seed.");
        }
        return;
      }

      this.currentLevelDescriptor = {
        id: null,
        title: result.sourceType === "custom" ? "Custom Seed" : "Generated Seed",
        seed: result.seed,
        complexity: Number(this.complexitySelect.value) || 3
      };
      this.currentBestKey = `manual:${result.seed}`;
      this.gameState.addSeedToHub(result.seed, result.sourceType);
      this.renderSeedHub();
      this.refreshStatusBar();
    }

    loadCatalogLevel(levelId) {
      const descriptor = this.gameState.getLevelById(levelId);
      if (!descriptor) {
        return;
      }

      const locked =
        this.gameState.getLevelList().find((entry) => entry.id === levelId)?.unlocked ===
        false;
      if (locked) {
        this.gameEngine.setMessage("Level is locked.");
        return;
      }

      this.seedInput.value = descriptor.seed;
      this.complexitySelect.value = String(descriptor.complexity);
      if (descriptor.layoutRows) {
        try {
          const level = buildLevelFromInteriorRows(
            descriptor.layoutRows,
            descriptor.seed,
            descriptor.complexity
          );
          this.gameEngine.loadLevel(level, {
            sourceType: "tutorial",
            seed: descriptor.seed,
            title: descriptor.title,
            id: descriptor.id,
            complexity: descriptor.complexity
          });
        } catch (_err) {
          this.gameEngine.setMessage("Failed to load tutorial level.");
          return;
        }
      } else {
        const result = this.editor.loadLevelFromSeed(descriptor.seed);
        if (!result.ok) {
          this.gameEngine.setMessage("Failed to load catalog level.");
          return;
        }
      }

      this.currentLevelDescriptor = descriptor;
      this.currentBestKey = descriptor.id;
      this.refreshStatusBar();
      this.renderLevelSelect();
    }

    refreshStatusBar() {
      const level = this.gameEngine.currentLevel;
      if (!level) {
        return;
      }

      let levelTitle = this.currentLevelDescriptor?.title || "Manual Level";
      if (this.currentLevelDescriptor?.id) {
        levelTitle += ` (${this.currentLevelDescriptor.seed})`;
      } else {
        levelTitle += ` (${level.seed})`;
      }

      this.currentLevelLabel.textContent = levelTitle;
      this.difficultyLabel.textContent = `${level.difficultyLabel} (${level.difficulty}/10)`;
      this.lightsLabel.textContent = `${this.gameEngine.lightsPlaced} / ${level.lightBudget}`;
      this.movesLabel.textContent = String(this.gameEngine.moves);

      const best = this.gameState.getBest(this.currentBestKey);
      this.bestLabel.textContent = best
        ? `${best.lightsPlaced} lights, ${best.moves} moves`
        : "-";
    }

    renderLevelSelect() {
      const levels = this.gameState.getLevelList();
      const previousValue = this.levelSelect.value;
      this.levelSelect.innerHTML = "";

      for (const level of levels) {
        const option = document.createElement("option");
        option.value = level.id;
        const lockMark = level.unlocked ? "" : " (locked)";
        option.textContent = `${level.title} • seed ${level.seed}${lockMark}`;
        option.disabled = !level.unlocked;
        this.levelSelect.appendChild(option);
      }

      if (previousValue && levels.some((entry) => entry.id === previousValue)) {
        this.levelSelect.value = previousValue;
      } else if (this.currentLevelDescriptor?.id) {
        this.levelSelect.value = this.currentLevelDescriptor.id;
      }
    }

    renderSeedHub() {
      const entries = this.gameState.getSeedHubList();
      this.seedHubList.innerHTML = "";
      if (!entries.length) {
        const li = document.createElement("li");
        li.textContent = "No saved seeds yet.";
        this.seedHubList.appendChild(li);
        return;
      }

      for (const entry of entries) {
        const li = document.createElement("li");
        const code = document.createElement("code");
        code.textContent = entry.seed;

        const loadButton = document.createElement("button");
        loadButton.className = "secondary";
        loadButton.textContent = "Load";
        loadButton.addEventListener("click", () => {
          this.seedInput.value = entry.seed;
          this.loadFromSeedInput();
        });

        const copyButton = document.createElement("button");
        copyButton.className = "secondary";
        copyButton.textContent = "Copy";
        copyButton.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(entry.seed);
            this.gameEngine.setMessage("Seed copied.");
          } catch (_err) {
            this.gameEngine.setMessage("Clipboard unavailable.");
          }
        });

        li.appendChild(code);
        li.appendChild(loadButton);
        li.appendChild(copyButton);
        this.seedHubList.appendChild(li);
      }
    }

    handleWin(result) {
      if (this.currentLevelDescriptor?.id) {
        this.gameState.recordBest(this.currentBestKey, result);
        this.gameState.unlockNextLevel(this.currentLevelDescriptor.id);
        this.renderLevelSelect();
      } else {
        this.gameState.recordBest(this.currentBestKey, result);
      }
      this.renderSeedHub();
      this.refreshStatusBar();

      const lightsLeft = result.lightBudget - result.lightsPlaced;
      this.victoryText.textContent =
        `Seed ${result.seed} solved in ${result.moves} moves. ` +
        `${result.lightsPlaced}/${result.lightBudget} lights used ` +
        `(remaining ${lightsLeft}).`;
      this.victoryOverlay.classList.remove("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    new App();
  });
})();
