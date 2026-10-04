import { cubicOut, backOut } from "svelte/easing";
import { crossfade } from "svelte/transition";

export const reducedMotion =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const ms = (duration) => (reducedMotion ? 0 : duration);

/** A card being dealt: slides up and settles from a slight tilt. */
export function deal(node, { delay = 0, duration = 420 } = {}) {
  return {
    delay: ms(delay),
    duration: ms(duration),
    easing: backOut,
    css: (t, u) =>
      `transform: translateY(${u * 40}%) rotate(${u * -8}deg) scale(${0.85 + 0.15 * t}); opacity: ${Math.min(1, t * 2)};`,
  };
}

/** Fade unmatched cards; round collection already handles their movement. */
export function sweep(node, { delay = 0, discard = false } = {}) {
  return {
    delay: ms(delay),
    duration: ms(discard ? 0 : 140),
    easing: cubicOut,
    css: (t) => `opacity: ${t};`,
  };
}

/** Sweep into a pile at the left of the line, then put the pile into the deck. */
export async function collectCards(line, deck) {
  if (reducedMotion) return;
  const target = deck.getBoundingClientRect();
  const table = line.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.dataset.roundCollection = "";
  overlay.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:20";
  const cards = [...line.querySelectorAll(":scope > .slot"), ...deck.querySelectorAll(":scope > .slot")];
  const flights = cards.map((slot, i) => {
    const rect = slot.getBoundingClientRect();
    const clone = slot.querySelector(".card").cloneNode(true);
    clone.style.cssText = `position:absolute;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
    clone.setAttribute("aria-hidden", "true");
    const face = clone.querySelector(".face");
    face.style.cssText = "animation:none;transition:none;translate:none;rotate:none;transform:none;opacity:1";
    overlay.append(clone);
    const depth = Math.min(i, 8);
    const stackX = table.left + 12 + depth * 1.5 - rect.left;
    const stackY = table.top + 22 + depth * 1.5 - rect.top;
    const pile = `translate(${stackX}px, ${stackY}px) rotate(${-3 + depth * 0.6}deg)`;
    const intoDeck = `translate(${target.left + (target.width - rect.width) / 2 - rect.left}px, ${target.top + (target.height - rect.height) / 2 - rect.top}px)`;
    const scale = target.width / rect.width;
    return { clone, pile, intoDeck, scale };
  });
  document.body.append(overlay);
  try {
    await Promise.all(flights.map(({ clone, pile, intoDeck, scale }) => clone.animate([
      { transform: "translate(0, 0) rotate(0deg)", offset: 0, easing: "cubic-bezier(0.22, 0.75, 0.25, 1)" },
      { transform: pile, offset: 0.48 },
      { transform: pile, offset: 0.64, easing: "cubic-bezier(0.55, 0, 0.8, 0.4)" },
      { transform: `${intoDeck} scale(${scale * 0.92}) rotate(0deg)`, opacity: 1, offset: 0.94 },
      { transform: `${intoDeck} scale(${scale * 0.86}) rotate(0deg)`, opacity: 0, offset: 1 },
    ], { duration: 950, fill: "forwards" }).finished));
  } finally {
    overlay.remove();
  }
}

// Moves the pending card between the deck and the line.
export const [send, receive] = crossfade({
  duration: (d) => ms(Math.min(450, 200 + Math.sqrt(d) * 8)),
  easing: cubicOut,
  fallback: (node, params, intro) => (intro ? deal(node, params) : sweep(node, params)),
});
