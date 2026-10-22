import { expect, test } from "@playwright/test";

const LOADER = "https://ihtfy.com/ads/v1.js";

test("the ad slot appears only after a challenge, in a reserved box, and asks for one ad", async ({ page }) => {
  const loads = [];
  await page.route(LOADER, (route) => {
    loads.push(route.request().url());
    route.fulfill({
      contentType: "text/javascript",
      body: "window.ihtfyAds = { show: (box, key) => (window.__shown ??= []).push(key) };",
    });
  });
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await expect(page.locator(".ad")).toHaveCount(0);
  expect(loads).toEqual([]);

  await page.evaluate(() => {
    const game = window.__game;
    const card = game.line[0];
    game.line = [3, 1, 2].map((amount, i) => ({ ...card, id: `ad-${i}`, counts: { ...card.counts, [game.target]: amount * 10000 } }));
    game.challenge();
  });
  const box = page.locator(".ad-box");
  await expect(box).toHaveAttribute("data-ad-slot", "6470163205");
  await expect(page.locator(".ad p")).toHaveText("Advertisements");
  await expect.poll(() => page.evaluate(() => window.__shown?.length)).toBe(1);
  expect(loads).toHaveLength(1);

  const size = await box.boundingBox();
  expect([size.width, size.height]).toEqual([300, 250]);
  const gap = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".app button")].map((b) => b.getBoundingClientRect().bottom);
    return document.querySelector(".ad-box").getBoundingClientRect().top - Math.max(...buttons) + document.querySelector(".page").scrollTop;
  });
  expect(gap).toBeGreaterThanOrEqual(150);
});
