import { describe, expect, it } from "vitest";
import { classify, paint } from "./quantize.js";
import { hexToRgb, PALETTE } from "./colors.js";

const rgba = (...pixels) => new Uint8ClampedArray(pixels.flatMap((p) => [...p, 255]));

describe("classify", () => {
  it("counts pure ink pixels exactly", () => {
    const { counts } = classify(
      rgba([255, 0, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255], [0, 0, 0], [255, 0, 0])
    );
    expect(counts).toEqual({ red: 2, blue: 1, yellow: 1, cyan: 1 });
  });

  it("snaps anti-aliased blends to the nearest ink", () => {
    const { classes } = classify(rgba([200, 30, 10], [40, 40, 220], [230, 240, 20], [20, 20, 20]));
    expect([...classes]).toEqual([1, 2, 3, 0]);
  });

  it("assigns every pixel to exactly one class", () => {
    const pixels = Array.from({ length: 1000 }, (_, i) => [(i * 37) % 256, (i * 91) % 256, (i * 53) % 256]);
    const { classes, counts } = classify(rgba(...pixels));
    const background = [...classes].filter((c) => c === 0).length;
    const total = Object.values(counts).reduce((a, b) => a + b, 0) + background;
    expect(total).toBe(1000);
  });
});

describe("paint", () => {
  it("paints snapped classes with the display palette", () => {
    const out = paint(new Uint8Array([0, 1]));
    expect([...out.slice(0, 3)]).toEqual(hexToRgb(PALETTE.background));
    expect([...out.slice(4, 7)]).toEqual(hexToRgb(PALETTE.red));
    expect(out[7]).toBe(255);
  });

});
