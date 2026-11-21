import { expect, test } from "@playwright/test";

const LOADER = "https://ihtfy.com/ads/v1.js";

/** Reveals a three-card line holding 3.9%, 11.7%, and 47.3% of the target color. */
async function reveal(page) {
  await page.route(LOADER, (route) => route.fulfill({ contentType: "text/javascript", body: "window.ihtfyAds = { show() {} };" }));
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await page.evaluate(() => {
    const game = window.__game;
    const card = game.line[0];
    game.line = [10000, 30000, 121000].map((amount, i) => ({ ...card, id: `pct-${i}`, counts: { ...card.counts, [game.target]: amount } }));
    game.challenge();
  });
  await expect(page.locator(".line .stats")).toHaveCount(3);
}

const mains = (page) => page.locator(".line .stats .main").allTextContents();

test("revealed percentages use US English formatting in a US English browser", async ({ page }) => {
  await reveal(page);
  expect((await mains(page)).map((text) => text.trim())).toEqual(["3.9%", "11.7%", "47.3%"]);
});

test.describe("in a French browser", () => {
  test.use({ locale: "fr-FR" });

  test("revealed percentages use a decimal comma and a space before the sign, and the copy stays English", async ({ page }) => {
    await reveal(page);
    // Browsers differ on which no-break space French puts before the sign.
    expect((await mains(page)).map((text) => text.trim().replace(/[  ]/, " "))).toEqual(["3,9 %", "11,7 %", "47,3 %"]);
    const others = await page.locator(".line .stats .others span").allTextContents();
    expect(others).toHaveLength(9);
    for (const text of others) expect(text.trim()).toMatch(/^\d{1,3},\d[  ]%$/);
    await expect(page.getByRole("button", { name: "Next round" })).toBeVisible();
  });
});

for (const [rootFont, least] of [
  [16, { main: 16, others: 12 }],
  [24, { main: 22, others: 13 }],
]) {
  test(`on a 320×480 phone with a ${rootFont}px default font, every revealed percentage is readable and inside its card`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await reveal(page);
    await page.evaluate((size) => (document.documentElement.style.fontSize = `${size}px`), rootFont);
    await page.waitForTimeout(1200);
    const cards = await page.locator(".line .slot").evaluateAll((slots) =>
      slots.map((slot) => {
        // The box of an element's content, which is wider than the element itself when the text overflows it.
        const content = (el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const { left, right, top } = range.getBoundingClientRect();
          return { left, right, top };
        };
        const { left, right, top, height } = slot.getBoundingClientRect();
        const size = (q) => parseFloat(getComputedStyle(slot.querySelector(q)).fontSize);
        return {
          card: { left, right, top, height },
          stats: slot.querySelector(".stats").getBoundingClientRect().height,
          main: size(".main"),
          others: size(".others"),
          texts: [slot.querySelector(".main"), ...slot.querySelectorAll(".others span")].map(content),
        };
      }),
    );
    expect(cards).toHaveLength(3);
    for (const { card, stats, main, others, texts } of cards) {
      expect(main).toBeGreaterThanOrEqual(least.main);
      expect(others).toBeGreaterThanOrEqual(least.others);
      for (const text of texts) {
        expect(text.left).toBeGreaterThanOrEqual(card.left);
        expect(text.right).toBeLessThanOrEqual(card.right);
        expect(text.top).toBeGreaterThanOrEqual(card.top);
      }
      // The numbers never take over the card: most of the art stays in view.
      expect(stats).toBeLessThanOrEqual(card.height * 0.6);
    }
  });
}
