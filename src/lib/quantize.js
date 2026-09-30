import { COLORS, INK, PALETTE, hexToRgb } from "./colors.js";

// Class 0 is the background, classes 1-4 follow COLORS.
const CLASSES = ["background", ...COLORS];
const INK_RGB = CLASSES.map((name) => INK[name]);
const PALETTE_RGB = CLASSES.map((name) => hexToRgb(PALETTE[name]));

/**
 * Snap every RGBA pixel to the nearest ink class. Canvas shapes are always
 * anti-aliased, so edge pixels are blends; snapping removes them so each
 * pixel belongs to exactly one color and the counts are exact integers.
 */
export function classify(rgba) {
  const n = rgba.length / 4;
  const classes = new Uint8Array(n);
  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < INK_RGB.length; c++) {
      const [ir, ig, ib] = INK_RGB[c];
      const d = (r - ir) ** 2 + (g - ig) ** 2 + (b - ib) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    classes[i] = best;
    counts[best]++;
  }
  return {
    classes,
    counts: Object.fromEntries(COLORS.map((name, i) => [name, counts[i + 1]])),
  };
}

/** Write the display palette for each class into an RGBA buffer. */
export function paint(classes, rgba = new Uint8ClampedArray(classes.length * 4)) {
  for (let i = 0; i < classes.length; i++) {
    const [r, g, b] = PALETTE_RGB[classes[i]];
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}
