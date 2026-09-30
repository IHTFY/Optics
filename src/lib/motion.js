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

/** Cards swept off the table at the end of a round. */
export function sweep(node, { delay = 0 } = {}) {
  return {
    delay: ms(delay),
    duration: ms(300),
    easing: cubicOut,
    css: (t, u) => `transform: translateY(${-u * 30}%) scale(${1 - u * 0.1}); opacity: ${t};`,
  };
}

// Moves the pending card between the deck and the line.
export const [send, receive] = crossfade({
  duration: (d) => ms(Math.min(450, 200 + Math.sqrt(d) * 8)),
  easing: cubicOut,
  fallback: (node, params, intro) => (intro ? deal(node, params) : sweep(node, params)),
});
