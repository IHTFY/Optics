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

// Card art must make a fair, interesting game: every color equally likely to
// be big or small, widely spread shares, and most cards with 3+ colors.
test("card art color shares are balanced and widely spread", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const shares = await page.evaluate(async () => {
    const { CARD_WIDTH: W, CARD_HEIGHT: H } = await import("/src/lib/card.js");
    const { drawArt } = await import("/src/lib/art.js");
    const { classify } = await import("/src/lib/quantize.js");
    const { createRng } = await import("/src/lib/rng.js");
    const { inkCss, COLORS } = await import("/src/lib/colors.js");
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const out = [];
    for (let s = 1; s <= 300; s++) {
      ctx.fillStyle = inkCss("background");
      ctx.fillRect(0, 0, W, H);
      drawArt(ctx, createRng(s * 104729 + 7), W, H);
      const { counts } = classify(ctx.getImageData(0, 0, W, H).data);
      const p = COLORS.map((c) => (100 * counts[c]) / (W * H));
      out.push([...p, 100 - p.reduce((a, b) => a + b)]);
    }
    return out;
  });

  const n = shares.length;
  const column = (i) => shares.map((row) => row[i]);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = (xs) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));

  // Every color gets the same share on average.
  const means = [0, 1, 2, 3].map((i) => mean(column(i)));
  for (const m of means) expect(m).toBeGreaterThan(15);
  expect(Math.max(...means) - Math.min(...means)).toBeLessThan(6);

  // Each color ranges from (nearly) absent to dominant.
  for (let i = 0; i < 4; i++) {
    const col = column(i);
    expect(sd(col)).toBeGreaterThan(12);
    expect(col.filter((v) => v < 5).length / n).toBeGreaterThan(0.05);
    expect(col.filter((v) => v > 50).length / n).toBeGreaterThan(0.05);
  }

  // Background varies from none to a sizeable share.
  const background = column(4);
  expect(background.filter((v) => v < 1).length / n).toBeGreaterThan(0.2);
  expect(background.filter((v) => v > 30).length / n).toBeGreaterThan(0.05);
  expect(mean(background)).toBeLessThan(25);

  // Most cards show at least three colors; none shows just one.
  const colorsPresent = shares.map((row) => row.slice(0, 4).filter((v) => v >= 1).length);
  expect(colorsPresent.filter((k) => k >= 3).length / n).toBeGreaterThan(0.85);
  expect(Math.min(...colorsPresent)).toBeGreaterThanOrEqual(2);
});
