import { expect, test } from "@playwright/test";

// The image a player sees must contain exactly the pixel counts used for scoring.
test("card image pixels match the scored counts", async ({ page }) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const { createCard, CARD_WIDTH, CARD_HEIGHT } = await import("/src/lib/card.js");
    const { PALETTE, COLORS, hexToRgb } = await import("/src/lib/colors.js");
    const key = ([r, g, b]) => (r << 16) | (g << 8) | b;
    const lookup = new Map(
      ["background", ...COLORS].map((name) => [key(hexToRgb(PALETTE[name])), name])
    );

    const out = [];
    for (let seed = 1; seed <= 40; seed++) {
      const card = await createCard(seed * 7919);
      const img = new Image();
      img.src = card.src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT).data;
      const seen = { background: 0, red: 0, blue: 0, yellow: 0, cyan: 0, other: 0 };
      for (let i = 0; i < data.length; i += 4) {
        seen[lookup.get(key([data[i], data[i + 1], data[i + 2]])) ?? "other"]++;
      }
      out.push({ counts: card.counts, seen, width: img.naturalWidth, height: img.naturalHeight });
    }
    return out;
  });

  for (const { counts, seen, width, height } of results) {
    expect(width).toBe(400);
    expect(height).toBe(640);
    expect(seen.other).toBe(0);
    for (const color of ["red", "blue", "yellow", "cyan"]) {
      expect(seen[color]).toBe(counts[color]);
    }
  }
});

test("the same seed always renders the same card", async ({ page }) => {
  await page.goto("/");
  const [a, b] = await page.evaluate(async () => {
    const { createCard } = await import("/src/lib/card.js");
    return [(await createCard(12345)).counts, (await createCard(12345)).counts];
  });
  expect(a).toEqual(b);
});
