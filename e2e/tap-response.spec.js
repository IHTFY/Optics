import { expect, test } from "@playwright/test";

test("placing a card draws no new card until the placed card has been shown", async ({ page, baseURL }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort()
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // The same cards every run. A random streak of three look-alike cards would empty the queue and draw the next card during the key press.
    let seed = 0;
    crypto.getRandomValues = (array) => { array[0] = ++seed; return array; };
    Math.random = () => 0;
    window.__draws = 0;
    window.__drawsBeforeFrame = 0;
    // From a key press or click until the next frame starts.
    let answering = false;
    for (const type of ["keydown", "click"]) {
      addEventListener(type, () => {
        answering = true;
        requestAnimationFrame(() => (answering = false));
      }, { capture: true });
    }
    // Every card is encoded once, as the last step of drawing it.
    const encode = OffscreenCanvas.prototype.convertToBlob;
    OffscreenCanvas.prototype.convertToBlob = function (...args) {
      window.__draws++;
      if (answering) window.__drawsBeforeFrame++;
      return encode.apply(this, args);
    };
  });
  await page.goto("/");
  // The game keeps three cards drawn ahead; card ids count up from 1 in the order drawn.
  const drawnAhead = () => page.waitForFunction(() => window.__game.pending && window.__draws === window.__game.pending.id + 3);

  for (let placed = 1; placed <= 6; placed++) {
    await drawnAhead();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".line .slot:not(.is-pending)")).toHaveCount(placed + 1);
    await expect(page.locator(".deck .slot")).toHaveCount(1);
  }
  await drawnAhead();
  expect(await page.evaluate(() => window.__drawsBeforeFrame)).toBe(0);
});
