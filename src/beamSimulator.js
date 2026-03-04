import {
  colorNameToMask,
  DIRECTION_VECTORS,
  gridKey,
  maskToColorName,
  mixColorMasks,
  rotationToDirection,
} from "./constants.js";

export class BeamSimulator {
  constructor(grid) {
    this.grid = grid;
  }

  setGrid(grid) {
    this.grid = grid;
  }

  static mixColors(color1, color2) {
    const mixedMask = mixColorMasks(colorNameToMask(color1), colorNameToMask(color2));
    return maskToColorName(mixedMask);
  }

  calculateBeamPath(sourceX, sourceY, initialDir, initialColor) {
    return this.simulateLevel(
      [{ x: sourceX, y: sourceY, dir: initialDir, color: initialColor }],
      [],
    );
  }

  simulateLevel(sources, targets) {
    const queue = [];
    const visitedStates = new Set();
    const segments = [];
    const hitColorsByCell = new Map();
    const illuminationByCell = new Map();
    const combinerStates = new Map();

    const maxSteps = Math.max(300, this.grid.width * this.grid.height * 64);
    let steps = 0;

    const enqueueBeam = (x, y, dir, colorMask) => {
      if (!this.grid.isInBounds(x, y)) {
        return;
      }
      if (!DIRECTION_VECTORS[dir]) {
        return;
      }
      const normalizedMask = colorMask & 0b111;
      if (normalizedMask === 0) {
        return;
      }
      const stateKey = `${x},${y},${dir},${normalizedMask}`;
      if (visitedStates.has(stateKey)) {
        return;
      }
      visitedStates.add(stateKey);
      queue.push({ x, y, dir, colorMask: normalizedMask });
    };

    for (const source of sources) {
      enqueueBeam(source.x, source.y, source.dir, colorNameToMask(source.color));
    }

    while (queue.length > 0 && steps < maxSteps) {
      steps += 1;
      const beam = queue.shift();
      const vector = DIRECTION_VECTORS[beam.dir];
      const nextX = beam.x + vector.x;
      const nextY = beam.y + vector.y;

      segments.push({
        x1: beam.x + 0.5,
        y1: beam.y + 0.5,
        x2: nextX + 0.5,
        y2: nextY + 0.5,
        colorMask: beam.colorMask,
      });

      if (!this.grid.isInBounds(nextX, nextY)) {
        continue;
      }

      const cellKey = gridKey(nextX, nextY);
      if (!hitColorsByCell.has(cellKey)) {
        hitColorsByCell.set(cellKey, new Set());
      }
      hitColorsByCell.get(cellKey).add(beam.colorMask);
      illuminationByCell.set(
        cellKey,
        mixColorMasks(illuminationByCell.get(cellKey) ?? 0, beam.colorMask),
      );

      const component = this.grid.getComponent(nextX, nextY);
      if (!component) {
        enqueueBeam(nextX, nextY, beam.dir, beam.colorMask);
        continue;
      }

      if (component.type === "combiner") {
        if (!combinerStates.has(cellKey)) {
          combinerStates.set(cellKey, { inputMask: 0, emittedMask: 0 });
        }
        const combinerState = combinerStates.get(cellKey);
        combinerState.inputMask = mixColorMasks(combinerState.inputMask, beam.colorMask);
        if (combinerState.inputMask !== combinerState.emittedMask) {
          combinerState.emittedMask = combinerState.inputMask;
          enqueueBeam(
            nextX,
            nextY,
            rotationToDirection(component.rotation),
            combinerState.emittedMask,
          );
        }
        continue;
      }

      const outgoing = component.interact({ dir: beam.dir, colorMask: beam.colorMask });
      for (const outputBeam of outgoing) {
        enqueueBeam(nextX, nextY, outputBeam.dir, outputBeam.colorMask);
      }
    }

    const targetStates = targets.map((target, index) => {
      const key = gridKey(target.x, target.y);
      const requiredMask = colorNameToMask(target.color);
      const hitSet = hitColorsByCell.get(key);
      const isActive = Boolean(hitSet && hitSet.has(requiredMask));

      return {
        index,
        x: target.x,
        y: target.y,
        requiredColor: target.color,
        requiredMask,
        active: isActive,
        hitMask: illuminationByCell.get(key) ?? 0,
      };
    });

    return {
      segments,
      hitColorsByCell,
      illuminationByCell,
      targetStates,
      solved: targetStates.length > 0 && targetStates.every((target) => target.active),
      truncated: steps >= maxSteps,
      steps,
    };
  }
}
