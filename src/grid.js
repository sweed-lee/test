import {
  clampRotation,
  colorNameToMask,
  gridKey,
  mixColorMasks,
  rotationToDirection,
  turnLeft,
  turnRight,
} from "./constants.js";

function reflectDirection(direction, isSlashMirror) {
  if (isSlashMirror) {
    switch (direction) {
      case "up":
        return "right";
      case "right":
        return "up";
      case "down":
        return "left";
      case "left":
        return "down";
      default:
        return null;
    }
  }

  switch (direction) {
    case "up":
      return "left";
    case "left":
      return "up";
    case "down":
      return "right";
    case "right":
      return "down";
    default:
      return null;
  }
}

export class Component {
  constructor(type, rotation = 0, color = null, locked = false) {
    this.type = type;
    this.rotation = clampRotation(rotation);
    this.color = color;
    this.locked = Boolean(locked);
  }

  clone() {
    return new Component(this.type, this.rotation, this.color, this.locked);
  }

  interact(beam) {
    const incomingMask = beam.colorMask ?? 0;
    const normalizedRotation = clampRotation(this.rotation);
    const isSlashMirror = normalizedRotation % 2 === 1;

    switch (this.type) {
      case "mirror": {
        const reflected = reflectDirection(beam.dir, isSlashMirror);
        return reflected ? [{ dir: reflected, colorMask: incomingMask }] : [];
      }

      case "splitter": {
        const reflected = reflectDirection(beam.dir, isSlashMirror);
        const outgoing = [{ dir: beam.dir, colorMask: incomingMask }];
        if (reflected && reflected !== beam.dir) {
          outgoing.push({ dir: reflected, colorMask: incomingMask });
        }
        return outgoing;
      }

      case "filter": {
        const tintMask = colorNameToMask(this.color);
        const mixed = mixColorMasks(incomingMask, tintMask);
        return mixed === 0 ? [] : [{ dir: beam.dir, colorMask: mixed }];
      }

      case "blocker":
        return [];

      case "prism": {
        if (incomingMask === 0) {
          return [];
        }
        const forward = rotationToDirection(normalizedRotation);
        const left = turnLeft(forward);
        const right = turnRight(forward);
        const result = [];

        if (incomingMask & colorNameToMask("red")) {
          result.push({ dir: forward, colorMask: colorNameToMask("red") });
        }
        if (incomingMask & colorNameToMask("green")) {
          result.push({ dir: left, colorMask: colorNameToMask("green") });
        }
        if (incomingMask & colorNameToMask("blue")) {
          result.push({ dir: right, colorMask: colorNameToMask("blue") });
        }
        return result;
      }

      case "combiner":
        // The simulator handles combining because it depends on multiple beam visits.
        return [];

      default:
        return [{ dir: beam.dir, colorMask: incomingMask }];
    }
  }
}

export class GameGrid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.fixedComponents = new Map();
    this.placedComponents = new Map();
    this.reservedCells = new Set();
  }

  isInBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  reserveCell(x, y) {
    if (this.isInBounds(x, y)) {
      this.reservedCells.add(gridKey(x, y));
    }
  }

  isCellReserved(x, y) {
    return this.reservedCells.has(gridKey(x, y));
  }

  canPlaceAt(x, y) {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    const key = gridKey(x, y);
    return !this.fixedComponents.has(key) && !this.reservedCells.has(key);
  }

  placeFixedComponent(x, y, componentType, rotation = 0, color = null) {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    const key = gridKey(x, y);
    this.fixedComponents.set(key, new Component(componentType, rotation, color, true));
    return true;
  }

  placeComponent(x, y, componentType, rotation = 0, color = null) {
    if (!this.canPlaceAt(x, y)) {
      return false;
    }
    const key = gridKey(x, y);
    this.placedComponents.set(key, new Component(componentType, rotation, color, false));
    return true;
  }

  getComponent(x, y) {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    const key = gridKey(x, y);
    return this.fixedComponents.get(key) ?? this.placedComponents.get(key) ?? null;
  }

  getPlacedComponent(x, y) {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    return this.placedComponents.get(gridKey(x, y)) ?? null;
  }

  getFixedComponent(x, y) {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    return this.fixedComponents.get(gridKey(x, y)) ?? null;
  }

  clearCell(x, y) {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    const key = gridKey(x, y);
    if (this.placedComponents.has(key)) {
      this.placedComponents.delete(key);
      return true;
    }
    return false;
  }

  rotateComponent(x, y, step = 1) {
    const component = this.getPlacedComponent(x, y);
    if (!component) {
      return false;
    }
    component.rotation = clampRotation(component.rotation + step);
    return true;
  }

  clearPlaced() {
    this.placedComponents.clear();
  }

  getPlacedEntries() {
    return Array.from(this.placedComponents.entries());
  }

  getFixedEntries() {
    return Array.from(this.fixedComponents.entries());
  }

  static parseKey(key) {
    const [x, y] = key.split(",").map((value) => Number(value));
    return { x, y };
  }
}
