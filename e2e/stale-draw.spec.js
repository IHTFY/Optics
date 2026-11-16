import { expect, test } from "@playwright/test";

test("a draw finishing after Next round cannot replace that round's pending card", async ({ page, baseURL }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort()
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    let seed = 0;
    crypto.getRandomValues = (array) => { array[0] = ++seed; return array; };
    Math.random = () => 0;
    const encode = OffscreenCanvas.prototype.convertToBlob;
    let encoded = 0;
    OffscreenCanvas.prototype.convertToBlob = async function (...args) {
      const held = ++encoded === 3;
      if (held) await new Promise((resolve) => { window.__releaseHeldCard = resolve; });
      const blob = await encode.apply(this, args);
      if (held) window.__heldBlob = blob;
      return blob;
    };
    const create = URL.createObjectURL;
    URL.createObjectURL = (blob) => {
      const src = create.call(URL, blob);
      if (blob === window.__heldBlob) window.__heldSrc = src;
      return src;
    };
    const revoke = URL.revokeObjectURL;
    window.__revoked = [];
    URL.revokeObjectURL = (src) => {
      window.__revoked.push(src);
      revoke.call(URL, src);
    };
  });
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator(".line .slot:not(.is-pending)")).toHaveCount(2);
  await expect(page.locator(".deck .slot")).toHaveCount(0);
  await page.getByRole("button", { name: "Challenge", exact: true }).click();
  await page.getByRole("button", { name: "Next round", exact: true }).click();
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  const nextRoundCard = await page.evaluate(() => {
    const g = window.__game;
    return { id: g.pending.id, seed: g.pending.seed, line: g.line.map((c) => c.id), target: g.target };
  });
  await page.evaluate(() => window.__releaseHeldCard());
  await page.waitForFunction(() => window.__heldSrc !== undefined);
  expect(await page.evaluate(() => ({
    id: window.__game.pending.id,
    seed: window.__game.pending.seed,
    line: window.__game.line.map((c) => c.id),
    target: window.__game.target,
  }))).toEqual(nextRoundCard);
  expect(await page.evaluate(() => window.__revoked.includes(window.__heldSrc))).toBe(true);
  expect(await page.evaluate(() => window.__revoked.includes(window.__game.pending.src))).toBe(false);
});
