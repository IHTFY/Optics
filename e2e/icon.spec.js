import { expect, test } from "@playwright/test";

// A phone cuts a maskable icon to its own shape. The W3C safe zone is a centered circle of 40% of the icon's
// width as radius, but Android shows a maskable icon as an adaptive icon, whose mask is only guaranteed to
// keep a circle of 33 of 108 units, about 30.6% of the width.
test("the maskable icon fills the square and keeps its art in the safe zone", async ({ page }) => {
  await page.goto("/");
  const icon = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/images/icons/icon-maskable-512x512.png";
    await image.decode();
    const context = new OffscreenCanvas(image.width, image.height).getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const pixel = (x, y) => [...data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)];
    const background = pixel(0, 0);
    let reach = 0;
    let transparent = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const color = pixel(x, y);
        if (color[3] < 255) transparent++;
        if (color.some((channel, i) => channel !== background[i]))
          reach = Math.max(reach, Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2));
      }
    }
    return { width: image.width, height: image.height, background, transparent, reach };
  });

  expect(icon).toMatchObject({ width: 512, height: 512, background: [0x20, 0x21, 0x25, 255], transparent: 0 });
  // The art is there, and all of it is inside the circle.
  expect(icon.reach).toBeGreaterThan(0.25 * 512);
  expect(icon.reach).toBeLessThanOrEqual((33 / 108) * 512);
});
