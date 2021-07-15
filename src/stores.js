import { writable } from "svelte/store";

export const gameState = writable("");
export const currentColor = writable(["red", "blue", "yellow", "cyan"][
  Math.floor(Math.random() * 4)
]);