import { drawArt } from "./art.js";
import { COLORS, inkCss } from "./colors.js";
import { classify, paint } from "./quantize.js";
import { createRng, randomSeed } from "./rng.js";

// Fixed internal resolution (5:8 like a playing card). Counts never depend
// on the device or on the size the card is displayed at.
export const CARD_WIDTH = 400;
export const CARD_HEIGHT = 640;
export const CARD_PIXELS = CARD_WIDTH * CARD_HEIGHT;

let nextId = 1;

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function toUrl(canvas) {
  if (canvas.convertToBlob) {
    return URL.createObjectURL(await canvas.convertToBlob({ type: "image/png" }));
  }
  return canvas.toDataURL("image/png");
}

/** Render a card from a seed. Returns its image URL and exact pixel counts. */
export async function createCard(seed = randomSeed()) {
  const canvas = makeCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.fillStyle = inkCss("background");
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawArt(ctx, createRng(seed), CARD_WIDTH, CARD_HEIGHT);

  const image = ctx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const { classes, counts } = classify(image.data);
  paint(classes, image.data);
  ctx.putImageData(image, 0, 0);

  return { id: nextId++, seed, src: await toUrl(canvas), counts };
}

export const percent = (count) => (100 * count) / CARD_PIXELS;

export const formatPercent = (count) => `${percent(count).toFixed(1)}%`;

export { COLORS };
