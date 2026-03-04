(function initLevelManagerModule() {
  "use strict";

  window.ChronoSync = window.ChronoSync || {};

  function gridKey(x, y) {
    return `${x},${y}`;
  }

  class Button {
    constructor(config) {
      this.id = config.id;
      this.x = config.x;
      this.y = config.y;
      this.linkedDoorIds = Array.isArray(config.linkedDoorIds) ? [...config.linkedDoorIds] : [];
      this.pressed = false;
    }
  }

  class Door {
    constructor(config) {
      this.id = config.id;
      this.x = config.x;
      this.y = config.y;
      this.trigger = config.trigger || "toggle"; // toggle or plate
      this.defaultOpen = Boolean(config.defaultOpen);
      this.open = Boolean(config.defaultOpen);
      this.linkedPlateIds = Array.isArray(config.linkedPlateIds) ? [...config.linkedPlateIds] : [];
    }
  }

  class PressurePlate {
    constructor(config) {
      this.id = config.id;
      this.x = config.x;
      this.y = config.y;
      this.linkedDoorIds = Array.isArray(config.linkedDoorIds) ? [...config.linkedDoorIds] : [];
      this.pressed = false;
    }
  }

  class OneWayGate {
    constructor(config) {
      this.x = config.x;
      this.y = config.y;
      this.direction = config.direction || "right"; // up/down/left/right
    }
  }

  class Blocker {
    constructor(config) {
      this.x = config.x;
      this.y = config.y;
      this.blocks = config.blocks || "both"; // player, clone, both
    }
  }

  class LevelManager {
    constructor() {
      this.levels = Array.isArray(window.CHRONO_LEVELS) ? window.CHRONO_LEVELS : [];
      this.currentLevelIndex = 0;
      this.puzzleElements = {
        Button,
        Door,
        PressurePlate,
        OneWayGate,
        Blocker
      };
    }

    getLevelCount() {
      return this.levels.length;
    }

    loadLevel(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) {
        throw new Error(`Invalid level index: ${index}`);
      }

      this.currentLevelIndex = index;
      const definition = this.levels[index];
      const parsedMap = this.parseMap(definition.map);

      const level = {
        id: definition.id || index + 1,
        name: definition.name || `Level ${index + 1}`,
        hint: definition.hint || "",
        mapRows: parsedMap.mapRows,
        width: parsedMap.width,
        height: parsedMap.height,
        walls: parsedMap.walls,
        start: parsedMap.start,
        goal: parsedMap.goal,
        recordTicks: definition.recordTicks || 70,
        syncTicks: definition.syncTicks || 220,
        buttons: (definition.buttons || []).map((item) => new Button(item)),
        doors: (definition.doors || []).map((item) => new Door(item)),
        plates: (definition.plates || []).map((item) => new PressurePlate(item)),
        oneWayGates: (definition.oneWayGates || []).map((item) => new OneWayGate(item)),
        blockers: (definition.blockers || []).map((item) => new Blocker(item))
      };

      this.buildLevelIndexes(level);
      this.resetDynamicElements(level);
      return level;
    }

    parseMap(mapRows) {
      if (!Array.isArray(mapRows) || mapRows.length === 0) {
        throw new Error("Level map must be a non-empty array of strings.");
      }

      const width = mapRows[0].length;
      const height = mapRows.length;
      const walls = new Set();
      let start = null;
      let goal = null;

      for (let y = 0; y < height; y += 1) {
        const row = mapRows[y];
        if (typeof row !== "string" || row.length !== width) {
          throw new Error("All map rows must be strings with equal width.");
        }

        for (let x = 0; x < width; x += 1) {
          const char = row[x];
          if (char === "#") {
            walls.add(gridKey(x, y));
          } else if (char === "S") {
            start = { x, y };
          } else if (char === "G") {
            goal = { x, y };
          }
        }
      }

      if (!start || !goal) {
        throw new Error("Each level must define one start (S) and one goal (G).");
      }

      return {
        mapRows: [...mapRows],
        width,
        height,
        walls,
        start,
        goal
      };
    }

    buildLevelIndexes(level) {
      level.buttonsByPos = new Map();
      level.platesByPos = new Map();
      level.doorsByPos = new Map();
      level.doorsById = new Map();
      level.platesById = new Map();
      level.oneWayByPos = new Map();
      level.blockersByPos = new Map();

      level.buttons.forEach((button) => {
        level.buttonsByPos.set(gridKey(button.x, button.y), button);
      });
      level.plates.forEach((plate) => {
        level.platesByPos.set(gridKey(plate.x, plate.y), plate);
        level.platesById.set(plate.id, plate);
      });
      level.doors.forEach((door) => {
        level.doorsByPos.set(gridKey(door.x, door.y), door);
        level.doorsById.set(door.id, door);
      });
      level.oneWayGates.forEach((gate) => {
        level.oneWayByPos.set(gridKey(gate.x, gate.y), gate);
      });
      level.blockers.forEach((blocker) => {
        level.blockersByPos.set(gridKey(blocker.x, blocker.y), blocker);
      });
    }

    resetDynamicElements(level) {
      level.buttons.forEach((button) => {
        button.pressed = false;
      });
      level.plates.forEach((plate) => {
        plate.pressed = false;
      });
      level.doors.forEach((door) => {
        door.open = Boolean(door.defaultOpen);
      });
    }

    checkWinCondition(player, goal) {
      return player.x === goal.x && player.y === goal.y;
    }
  }

  window.ChronoSync.gridKey = gridKey;
  window.ChronoSync.LevelManager = LevelManager;
})();
