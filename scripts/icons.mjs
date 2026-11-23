// Makes every icon from eyeball.svg: the favicon, the manifest icons, and the maskable icon, whose art sits
// inside the maskable safe zone on a full-bleed background, so an installed icon fills whatever shape the
// phone cuts. Run `node scripts/icons.mjs` after the art changes.
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// The game's background (`--bg` in src/app.css, and the manifest's background_color).
const BACKGROUND = "#181a1e";
// Android shows a maskable icon as an adaptive icon, whose mask is only guaranteed to keep a centered
// circle of 33 of 108 units (about 30.6% of the width) as radius, tighter than the W3C 40% safe zone. The
// art's farthest point stays at 30%, so the eye's tips aren't cut off.
const ART_RADIUS = 0.3;
// The plain icons are transparent, with the eye across nearly their whole width.
const MARGIN = 0.02;

const ICONS = [
  { file: "favicon.png", size: 128 },
  { file: "images/icons/icon-192x192.png", size: 192 },
  { file: "images/icons/icon-512x512.png", size: 512 },
  { file: "images/icons/icon-maskable-512x512.png", size: 512, maskable: true },
];

// The trace stacks its colors, each layer also covering the ones above it, and the iris layer's outline
// comes out a hair wider than the others, which shows as a light rim on the dark background. The iris
// never reaches the eye's outline, so iris color that close to the outside is cut away. The eye is drawn
// without smoothing at 8 times the size, cut, then halved three times, so edges are smoothed evenly.
const OVERSAMPLE = 8;
const IRIS = [0xfe, 0xf7, 0xea];
// How close to the outside iris color is cut, in pixels of the finished icon.
const RIM = 0.75;
const svg = (await readFile(new URL("../eyeball.svg", import.meta.url), "utf8")).replace("<svg ", '<svg shape-rendering="crispEdges" ');
const art = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const pngs = await page.evaluate(
  async ({ art, ICONS, BACKGROUND, ART_RADIUS, MARGIN, OVERSAMPLE, IRIS, RIM }) => {
    function cutRim(context, size) {
      const image = context.getImageData(0, 0, size, size);
      const { data } = image;
      const reach = Math.round(RIM * OVERSAMPLE);
      // Pixels within `reach` of the outside: the outside grown along rows, then along columns.
      const grow = (from, step, count, stride) => {
        const out = new Uint8Array(from.length);
        for (let line = 0; line < count; line++) {
          let last = -Infinity;
          for (let i = 0; i < count; i++) {
            const at = line * stride + i * step;
            if (from[at]) last = i;
            if (i - last <= reach) out[at] = 1;
          }
          last = Infinity;
          for (let i = count - 1; i >= 0; i--) {
            const at = line * stride + i * step;
            if (from[at]) last = i;
            if (last - i <= reach) out[at] = 1;
          }
        }
        return out;
      };
      const outside = new Uint8Array(size * size);
      for (let i = 0; i < outside.length; i++) outside[i] = data[i * 4 + 3] < 128 ? 1 : 0;
      const near = grow(grow(outside, 1, size, size), size, size, 1);
      for (let i = 0; i < near.length; i++) {
        if (near[i] && IRIS.every((v, c) => Math.abs(data[i * 4 + c] - v) <= 2)) data[i * 4 + 3] = 0;
      }
      context.putImageData(image, 0, 0);
    }

    const image = new Image();
    image.src = art;
    await image.decode();
    const { naturalWidth: w, naturalHeight: h } = image;

    return ICONS.map(({ size, maskable }) => {
      let canvas = document.createElement("canvas");
      canvas.width = canvas.height = size * OVERSAMPLE;
      // The eye's tips are the ends of its width, so its reach from the center is half the width.
      const scale = (OVERSAMPLE * (maskable ? (ART_RADIUS * size) / (w / 2) : (size * (1 - 2 * MARGIN)) / w));
      const big = canvas.getContext("2d", { willReadFrequently: true });
      big.drawImage(image, (canvas.width - w * scale) / 2, (canvas.height - h * scale) / 2, w * scale, h * scale);
      cutRim(big, canvas.width);
      while (canvas.width > size) {
        const half = document.createElement("canvas");
        half.width = half.height = canvas.width / 2;
        half.getContext("2d").drawImage(canvas, 0, 0, half.width, half.height);
        canvas = half;
      }
      if (maskable) {
        const filled = document.createElement("canvas");
        filled.width = filled.height = size;
        const context = filled.getContext("2d");
        context.fillStyle = BACKGROUND;
        context.fillRect(0, 0, size, size);
        context.drawImage(canvas, 0, 0);
        canvas = filled;
      }
      return canvas.toDataURL("image/png").split(",")[1];
    });
  },
  { art, ICONS, BACKGROUND, ART_RADIUS, MARGIN, OVERSAMPLE, IRIS, RIM },
);
await browser.close();

for (const [i, { file }] of ICONS.entries()) {
  await writeFile(new URL(`../public/${file}`, import.meta.url), Buffer.from(pngs[i], "base64"));
}
