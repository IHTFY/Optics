// Makes public/images/icons/icon-maskable-512x512.png from eyeball.png: the same art, scaled to sit inside
// the maskable safe zone on a full-bleed background, so an installed icon fills whatever shape the phone
// cuts. Run `node scripts/maskable-icon.mjs` after the art changes.
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const SIZE = 512;
// The game's background (`--bg` in src/app.css, and the manifest's background_color).
const BACKGROUND = "#202125";
// Any mask keeps a centered circle of 40% of the icon's width as radius. The art's farthest point stays
// at 36%, so its tips don't touch the edge of a round icon.
const ART_RADIUS = 0.36;

const art = `data:image/png;base64,${(await readFile(new URL("../eyeball.png", import.meta.url))).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(
  async ({ art, SIZE, BACKGROUND, ART_RADIUS }) => {
    const image = new Image();
    image.src = art;
    await image.decode();

    // The distance from the art's center to its farthest drawn pixel.
    const probe = new OffscreenCanvas(image.width, image.height).getContext("2d");
    probe.drawImage(image, 0, 0);
    const { data } = probe.getImageData(0, 0, image.width, image.height);
    let reach = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (data[(y * image.width + x) * 4 + 3] === 0) continue;
        reach = Math.max(reach, Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2));
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const context = canvas.getContext("2d");
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, SIZE, SIZE);
    context.imageSmoothingQuality = "high";
    const scale = (ART_RADIUS * SIZE) / reach;
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
    return canvas.toDataURL("image/png").split(",")[1];
  },
  { art, SIZE, BACKGROUND, ART_RADIUS },
);
await browser.close();

await writeFile(new URL(`../public/images/icons/icon-maskable-${SIZE}x${SIZE}.png`, import.meta.url), Buffer.from(png, "base64"));
