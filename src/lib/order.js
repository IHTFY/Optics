/**
 * The line must go from least to most of the target color, left to right.
 * Equal amounts may be in either order. Returns the positions of every card
 * in an out-of-order neighbouring pair.
 */
export function checkLine(amounts) {
  const bad = new Set();
  for (let i = 0; i < amounts.length - 1; i++) {
    if (amounts[i] > amounts[i + 1]) {
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
    if (before <= amount && amount <= after) slots.push(i);
  }
  return slots;
}
