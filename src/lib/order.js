/**
 * Cards show their amounts to 0.1%, so two cards closer than that look equal.
 * That is 0.1% of a 400x640 card (256,000 pixels). Cards in a line are always
 * drawn at least this far apart, and anything closer is scored as a tie.
 */
export const TIE_PIXELS = 256;

/** Whether `a` should come after `b`, ignoring differences too small to see. */
export function outOfOrder(a, b) {
  return a - b >= TIE_PIXELS;
}

/** Whether `amount` is clearly different from every amount in `others`. */
export function isDistinct(amount, others) {
  return others.every((other) => Math.abs(amount - other) >= TIE_PIXELS);
}

/**
 * The line must go from least to most of the target color, left to right.
 * Amounts within a tie of each other may be in either order. Returns the
 * positions of every card in an out-of-order neighbouring pair.
 */
export function checkLine(amounts) {
  const bad = new Set();
  for (let i = 0; i < amounts.length - 1; i++) {
    if (outOfOrder(amounts[i], amounts[i + 1])) {
      bad.add(i);
      bad.add(i + 1);
    }
  }
  return { correct: bad.size === 0, bad };
}

/** Insertion positions where a card with `amount` keeps the line in order. */
export function correctSlots(amounts, amount) {
  const slots = [];
  for (let i = 0; i <= amounts.length; i++) {
    const before = i === 0 ? -Infinity : amounts[i - 1];
    const after = i === amounts.length ? Infinity : amounts[i];
    if (!outOfOrder(before, amount) && !outOfOrder(amount, after)) slots.push(i);
  }
  return slots;
}
