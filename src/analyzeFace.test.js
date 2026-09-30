import { describe, expect, it } from "vitest";
import analyzeFace from "./analyzeFace.js";

function fakeCanvas(pixels, width, height) {
  const data = new Uint8ClampedArray(pixels.flat());
  return {
    width,
    height,
    getContext: () => ({ getImageData: () => ({ data }) }),
  };
}

describe("analyzeFace", () => {
  it("counts each color by channel thresholds", () => {
    const canvas = fakeCanvas(
      [
        [255, 0, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 0, 255],
        [0, 255, 255, 255],
      ],
      2,
      2
    );
    expect(analyzeFace(canvas)).toEqual({
      red: 25,
      blue: 25,
      yellow: 25,
      cyan: 25,
    });
  });
});
