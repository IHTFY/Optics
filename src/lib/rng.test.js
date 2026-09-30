import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";

describe("createRng", () => {
  it("is deterministic per seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a.next)).toEqual(Array.from({ length: 5 }, b.next));
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
