export const DIRECTION_ORDER = Object.freeze(["up", "right", "down", "left"]);

export const DIRECTION_VECTORS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
});

export const COLOR_BITS = Object.freeze({
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
});

const MASK_TO_NAME = Object.freeze({
  0: "black",
  1: "red",
  2: "green",
  3: "yellow",
  4: "blue",
  5: "magenta",
  6: "cyan",
  7: "white",
});

const COLOR_LABELS = Object.freeze({
  black: "Black",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
  magenta: "Magenta",
  cyan: "Cyan",
  white: "White",
});

export function colorLabel(colorName) {
  return COLOR_LABELS[colorName] ?? colorName;
}

export function gridKey(x, y) {
  return `${x},${y}`;
}

export function clampRotation(rotation) {
  const normal = Number(rotation) || 0;
  return ((normal % 4) + 4) % 4;
}

export function rotationToDirection(rotation) {
  return DIRECTION_ORDER[clampRotation(rotation)];
}

export function directionToRotation(direction) {
  const index = DIRECTION_ORDER.indexOf(direction);
  return index < 0 ? 0 : index;
}

export function turnLeft(direction) {
  const index = directionToRotation(direction);
  return DIRECTION_ORDER[(index + 3) % 4];
}

export function turnRight(direction) {
  const index = directionToRotation(direction);
  return DIRECTION_ORDER[(index + 1) % 4];
}

export function colorNameToMask(colorName) {
  if (typeof colorName !== "string") {
    return 0;
  }
  const normalized = colorName.toLowerCase().trim();
  return COLOR_BITS[normalized] ?? 0;
}

export function maskToColorName(mask) {
  const normalizedMask = (Number(mask) || 0) & 0b111;
  return MASK_TO_NAME[normalizedMask] ?? "black";
}

export function mixColorMasks(maskA, maskB) {
  return ((Number(maskA) || 0) | (Number(maskB) || 0)) & 0b111;
}

export function colorMaskToCss(mask, alpha = 1) {
  const normalized = (Number(mask) || 0) & 0b111;
  const r = normalized & COLOR_BITS.red ? 255 : 0;
  const g = normalized & COLOR_BITS.green ? 255 : 0;
  const b = normalized & COLOR_BITS.blue ? 255 : 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function prettyDirection(direction) {
  return direction ? direction.charAt(0).toUpperCase() + direction.slice(1) : "Up";
}
