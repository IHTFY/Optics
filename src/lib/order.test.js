import { describe, expect, it } from "vitest";
import { CARD_PIXELS } from "./card.js";
import { TIE_PIXELS, checkLine, correctSlots, isDistinct, outOfOrder } from "./order.js";

const T = TIE_PIXELS;

describe("TIE_PIXELS", () => {
  it("is 0.1% of a card", () => {
    expect(TIE_PIXELS).toBe(CARD_PIXELS / 1000);
  });
});

describe("outOfOrder", () => {
  it("ignores differences smaller than a tie", () => {
    expect(outOfOrder(1000 + T - 1, 1000)).toBe(false);
    expect(outOfOrder(1000, 1000 + T - 1)).toBe(false);
  });

  it("flags a drop of at least a tie", () => {
    expect(outOfOrder(1000 + T, 1000)).toBe(true);
  });
});

describe("isDistinct", () => {
  it("rejects amounts within a tie of any other", () => {
    expect(isDistinct(1000, [5000, 1000 + T - 1])).toBe(false);
    expect(isDistinct(1000, [5000, 1000 - T + 1])).toBe(false);
  });

  it("accepts amounts at least a tie from all others", () => {
    expect(isDistinct(1000, [1000 + T, 1000 - T])).toBe(true);
    expect(isDistinct(1000, [])).toBe(true);
  });
});

describe("checkLine", () => {
  it("accepts an ascending line", () => {
    expect(checkLine([1 * T, 5 * T, 9 * T]).correct).toBe(true);
  });

  it("accepts near-ties in either order", () => {
    expect(checkLine([3 * T + 200, 3 * T, 4 * T]).correct).toBe(true);
    expect(checkLine([3 * T, 3 * T + 200, 4 * T]).correct).toBe(true);
  });

  it("accepts a single card", () => {
    expect(checkLine([7 * T]).correct).toBe(true);
  });

  it("flags both cards of each out-of-order pair", () => {
    const { correct, bad } = checkLine([10 * T, 50 * T, 20 * T, 30 * T]);
    expect(correct).toBe(false);
    expect([...bad].sort()).toEqual([1, 2]);
  });

  it("flags a descending line entirely", () => {
    expect([...checkLine([3 * T, 2 * T, 1 * T]).bad].sort()).toEqual([0, 1, 2]);
  });
});

describe("correctSlots", () => {
  it("finds the slot between neighbours", () => {
    expect(correctSlots([10 * T, 20 * T, 30 * T], 25 * T)).toEqual([2]);
  });

  it("allows the ends", () => {
    expect(correctSlots([10 * T, 20 * T], 5 * T)).toEqual([0]);
    expect(correctSlots([10 * T, 20 * T], 50 * T)).toEqual([2]);
  });

  it("allows every slot next to an equal card", () => {
    expect(correctSlots([10 * T, 20 * T, 20 * T, 30 * T], 20 * T)).toEqual([1, 2, 3]);
  });

  it("allows both sides of a near-tie", () => {
    expect(correctSlots([10 * T, 20 * T + 100, 30 * T], 20 * T)).toEqual([1, 2]);
  });
});
