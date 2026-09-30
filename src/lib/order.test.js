import { describe, expect, it } from "vitest";
import { checkLine, correctSlots } from "./order.js";

describe("checkLine", () => {
  it("accepts an ascending line", () => {
    expect(checkLine([1, 5, 9]).correct).toBe(true);
  });

  it("accepts ties in either order", () => {
    expect(checkLine([3, 3, 4]).correct).toBe(true);
  });

  it("accepts a single card", () => {
    expect(checkLine([7]).correct).toBe(true);
  });

  it("flags both cards of each out-of-order pair", () => {
    const { correct, bad } = checkLine([10, 50, 20, 30]);
    expect(correct).toBe(false);
    expect([...bad].sort()).toEqual([1, 2]);
  });

  it("flags a descending line entirely", () => {
    expect([...checkLine([3, 2, 1]).bad].sort()).toEqual([0, 1, 2]);
  });
});

describe("correctSlots", () => {
  it("finds the slot between neighbours", () => {
    expect(correctSlots([10, 20, 30], 25)).toEqual([2]);
  });

  it("allows the ends", () => {
    expect(correctSlots([10, 20], 5)).toEqual([0]);
    expect(correctSlots([10, 20], 50)).toEqual([2]);
  });

  it("allows every slot next to an equal card", () => {
    expect(correctSlots([10, 20, 20, 30], 20)).toEqual([1, 2, 3]);
  });
});
