import { expect, test } from "@playwright/test";

// The verdict ring around a challenged card is an outline, and the cards sit --line-gap apart. A ring that reaches
// farther than that gap paints over its neighbor's art; one with a negative offset would sit on its own art.
const SIZES = [[320, 568], [360, 640], [390, 844], [412, 915], [800, 360], [1280, 800]];

for (const [width, height] of SIZES) {
  test(`verdict ring stays between the art of neighboring cards at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".deck .slot")).toHaveCount(1);
    await page.evaluate(() => {
      const game = window.__game;
      const card = game.line[0];
      // Three cards in the wrong order, so the line holds both right and wrong cards.
      game.line = [5, 9, 1, 7].map((amount, i) => ({
        ...card, id: `ring-${i}`, counts: { ...card.counts, [game.target]: amount * 10000 },
      }));
      game.challenge();
    });
    await expect(page.locator(".line .face.bad").first()).toBeVisible();
    await expect(page.locator(".line .face.good").first()).toBeVisible();
    // The colors fade in, so wait until both rings are drawn and differ.
    await expect.poll(() => page.evaluate(() => {
      const color = (selector) => getComputedStyle(document.querySelector(selector)).outlineColor;
      const [good, bad] = [color(".line .face.good"), color(".line .face.bad")];
      return good !== bad && ![good, bad].includes("rgba(0, 0, 0, 0)");
    })).toBe(true);

    // Layout boxes (offsetLeft, offsetWidth) ignore the shake and bump transforms.
    const rings = await page.locator(".line .slot").evaluateAll((slots) =>
      slots.flatMap((slot, i) => {
        const face = slot.querySelector(".face");
        const verdict = face.classList.contains("bad") ? "bad" : face.classList.contains("good") ? "good" : null;
        const prev = slots[i - 1];
        if (!verdict || !prev) return [];
        const style = getComputedStyle(face);
        return [{
          card: i,
          verdict,
          offset: parseFloat(style.outlineOffset),
          reach: parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth),
          gap: slot.offsetLeft - (prev.offsetLeft + prev.offsetWidth),
        }];
      })
    );

    expect(rings.map((r) => r.verdict)).toEqual(expect.arrayContaining(["good", "bad"]));
    for (const ring of rings) {
      expect(ring.offset, JSON.stringify(ring)).toBeGreaterThan(0);
      expect(ring.reach, JSON.stringify(ring)).toBeLessThanOrEqual(ring.gap);
    }
  });
}
