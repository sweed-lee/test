(function initPhysicsModule() {
  "use strict";

  window.ChronoSync = window.ChronoSync || {};

  const gridKey = window.ChronoSync.gridKey;

  class PhysicsEngine {
    constructor() {
      this.recordedPath = []; // [{ tick, x, y, action }]
      this.currentTick = 0;
    }

    resetRecording() {
      this.recordedPath = [];
      this.currentTick = 0;
    }

    setReplayPath(path) {
      this.recordedPath = Array.isArray(path) ? path.map((step) => ({ ...step })) : [];
      this.currentTick = 0;
    }

    recordPlayerState(tick, playerX, playerY, action) {
      this.recordedPath.push({
        tick,
        x: playerX,
        y: playerY,
        action: this.normalizeAction(action)
      });
    }

    getCloneStateAtTick(tick) {
      if (tick < 0 || this.recordedPath.length === 0) {
        return null;
      }
      if (tick < this.recordedPath.length) {
        return { ...this.recordedPath[tick] };
      }
      const last = this.recordedPath[this.recordedPath.length - 1];
      return {
        tick,
        x: last.x,
        y: last.y,
        action: "NONE"
      };
    }

    getRecordedActionAtTick(tick) {
      if (tick < 0 || tick >= this.recordedPath.length) {
        return "NONE";
      }
      return this.normalizeAction(this.recordedPath[tick].action);
    }

    normalizeAction(action) {
      switch (action) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          return action;
        default:
          return "NONE";
      }
    }

    actionToVector(action) {
      switch (this.normalizeAction(action)) {
        case "UP":
          return { dx: 0, dy: -1 };
        case "DOWN":
          return { dx: 0, dy: 1 };
        case "LEFT":
          return { dx: -1, dy: 0 };
        case "RIGHT":
          return { dx: 1, dy: 0 };
        default:
          return { dx: 0, dy: 0 };
      }
    }

    checkCollision(entity, gridObject) {
      return entity.x === gridObject.x && entity.y === gridObject.y;
    }

    attemptMove(entity, action, level) {
      const normalized = this.normalizeAction(action);
      if (normalized === "NONE") {
        return { moved: false, action: "NONE", blocked: false };
      }

      const { dx, dy } = this.actionToVector(normalized);
      const targetX = entity.x + dx;
      const targetY = entity.y + dy;

      const blocked = this.isMovementBlocked(entity, targetX, targetY, normalized, level);
      if (blocked) {
        return { moved: false, action: normalized, blocked: true };
      }

      entity.x = targetX;
      entity.y = targetY;
      return { moved: true, action: normalized, blocked: false };
    }

    isMovementBlocked(entity, targetX, targetY, action, level) {
      if (targetX < 0 || targetY < 0 || targetX >= level.width || targetY >= level.height) {
        return true;
      }

      if (level.walls.has(gridKey(targetX, targetY))) {
        return true;
      }

      const blocker = level.blockersByPos.get(gridKey(targetX, targetY));
      if (blocker) {
        if (blocker.blocks === "both" || blocker.blocks === entity.type) {
          return true;
        }
      }

      const door = level.doorsByPos.get(gridKey(targetX, targetY));
      if (door && !door.open) {
        return true;
      }

      const gate = level.oneWayByPos.get(gridKey(targetX, targetY));
      if (gate && gate.direction !== action.toLowerCase()) {
        return true;
      }

      return false;
    }

    processCloneInteractions(tick, levelObjects, cloneEntity) {
      if (!cloneEntity || !cloneEntity.active) {
        return;
      }
      this.processInteractions([cloneEntity], levelObjects, tick);
    }

    processInteractions(entities, level) {
      const activeEntities = entities.filter(Boolean);

      // Toggle doors when an entity newly steps onto a button.
      for (let i = 0; i < activeEntities.length; i += 1) {
        const entity = activeEntities[i];
        const button = level.buttonsByPos.get(gridKey(entity.x, entity.y)) || null;

        if (button && entity.lastButtonId !== button.id) {
          this.toggleLinkedDoors(button.linkedDoorIds, level);
          entity.lastButtonId = button.id;
        } else if (!button) {
          entity.lastButtonId = null;
        }
      }

      for (let i = 0; i < level.buttons.length; i += 1) {
        const button = level.buttons[i];
        button.pressed = activeEntities.some((entity) => this.checkCollision(entity, button));
      }

      for (let i = 0; i < level.plates.length; i += 1) {
        const plate = level.plates[i];
        plate.pressed = activeEntities.some((entity) => this.checkCollision(entity, plate));
      }

      // Plate doors are derived state, recomputed every tick.
      for (let i = 0; i < level.doors.length; i += 1) {
        const door = level.doors[i];
        if (door.trigger !== "plate") {
          continue;
        }
        door.open = door.linkedPlateIds.some((plateId) => {
          const plate = level.platesById.get(plateId);
          return Boolean(plate && plate.pressed);
        });
      }
    }

    toggleLinkedDoors(doorIds, level) {
      for (let i = 0; i < doorIds.length; i += 1) {
        const door = level.doorsById.get(doorIds[i]);
        if (!door) {
          continue;
        }
        door.open = !door.open;
      }
    }
  }

  window.ChronoSync.PhysicsEngine = PhysicsEngine;
})();
