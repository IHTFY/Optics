import { expect, test } from "@playwright/test";

// The outgoing button is inert while it animates away.
const placeBtn = (page) => page.locator("button.place:not([inert])");
const challengeBtn = (page) => page.getByRole("button", { name: "Challenge" });
const lineCards = (page) => page.locator(".line .slot");

async function start(page) {
  await page.goto("/");
  await expect(lineCards(page)).toHaveCount(1);
  await expect(page.locator(".deck .slot")).toHaveCount(1);
}

/** Tap the line at a horizontal fraction of its width. */
async function tapLine(page, fraction) {
  const box = await page.locator(".line").boundingBox();
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
}

test("tap to position, then place", async ({ page }) => {
  await start(page);
  await expect(placeBtn(page)).toHaveCount(0);
  await expect(challengeBtn(page)).toBeDisabled();

  await tapLine(page, 0.95);
  await expect(page.locator(".line .slot.is-pending")).toHaveCount(1);
  await expect(page.locator(".deck .slot")).toHaveCount(0);
  // Place sits just below the pending card.
  const card = await page.locator(".line .slot.is-pending").boundingBox();
  const place = await placeBtn(page).boundingBox();
  expect(place.y).toBeGreaterThan(card.y + card.height);
  expect(place.x + place.width / 2).toBeCloseTo(card.x + card.width / 2, -1);

  await placeBtn(page).click();
  await expect(lineCards(page)).toHaveCount(2);
  await expect(page.locator(".line .slot.is-pending")).toHaveCount(0);
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await expect(challengeBtn(page)).toBeEnabled();
});

test("tapping the deck takes the card back", async ({ page }) => {
  await start(page);
  await tapLine(page, 0.95);
  await expect(page.locator(".line .slot.is-pending")).toHaveCount(1);
  await page.locator(".deck").click();
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await expect(placeBtn(page)).toHaveCount(0);
});

test("dragging the card into the line", async ({ page, isMobile }) => {
  test.skip(isMobile, "mouse drag is covered on desktop; touch drag below");
  await start(page);
  const card = await page.locator(".deck .slot").boundingBox();
  const line = await page.locator(".line").boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  await page.mouse.move(line.x + 5, line.y + line.height / 2, { steps: 12 });
  await expect(page.locator(".drag-ghost")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  // Dropped left of the only card: pending goes first.
  await expect(lineCards(page).first()).toHaveClass(/is-pending/);
});

test("touch dragging the card into the line", async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== "chromium", "needs CDP touch input");
  await start(page);
  const cdp = await page.context().newCDPSession(page);
  const card = await page.locator(".deck .slot").boundingBox();
  const line = await page.locator(".line").boundingBox();
  const touch = (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  let x = card.x + card.width / 2;
  let y = card.y + card.height / 2;
  await touch("touchStart", x, y);
  const tx = line.x + line.width - 10;
  const ty = line.y + line.height / 2;
  for (let i = 1; i <= 15; i++) {
    await touch("touchMove", x + ((tx - x) * i) / 15, y + ((ty - y) * i) / 15);
    await page.waitForTimeout(16);
  }
  await touch("touchEnd");
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await expect(lineCards(page).last()).toHaveClass(/is-pending/);
});

test("keyboard: arrows move, enter places, c challenges", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await start(page);
  await page.keyboard.press("ArrowRight");
  await expect(lineCards(page).first()).toHaveClass(/is-pending/);
  await page.keyboard.press("ArrowRight");
  await expect(lineCards(page).last()).toHaveClass(/is-pending/);
  await page.keyboard.press("Enter");
  await expect(lineCards(page)).toHaveCount(2);
  await page.keyboard.press("c");
  await expect(page.getByRole("button", { name: "Next round" })).toBeVisible();
});

/** Once the arrow has become a graph, its height (up is positive) above each visible card. */
async function readGraph(page) {
  await expect(page.locator(".wedge")).toHaveAttribute("data-state", "graph");
  return page.evaluate(() => {
    const svg = document.querySelector(".wedge svg").getBoundingClientRect();
    const ends = [...document.querySelectorAll(".wedge svg > line")].map((l) => [
      svg.left + l.x2.baseVal.value,
      svg.top + l.y2.baseVal.value,
    ]);
    return [...document.querySelectorAll(".line .slot")].map((slot) => {
      const r = slot.getBoundingClientRect();
      const end = ends.find(([x]) => Math.abs(x - (r.left + r.width / 2)) < 1);
      return end ? -end[1] : null;
    });
  });
}

/** Read the revealed target percentages and verdict of each card in the line. */
async function readReveal(page) {
  await expect(page.locator(".line .stats").first()).toBeVisible();
  return page.locator(".line .slot").evaluateAll((slots) =>
    slots.map((s) => ({
      pct: parseFloat(s.querySelector(".main").textContent),
      bad: !!s.querySelector(".face.bad"),
      good: !!s.querySelector(".face.good"),
    }))
  );
}

test("a correctly ordered line is judged correct", async ({ page }) => {
  await start(page);
  // Use the exact counts (dev hook) to place every card correctly.
  for (let i = 0; i < 5; i++) {
    await page.evaluate(async () => {
      const { correctSlots } = await import("/src/lib/order.js");
      const g = window.__game;
      const amounts = g.line.map((c) => c.counts[g.target]);
      g.moveTo(correctSlots(amounts, g.pending.counts[g.target])[0]);
    });
    await placeBtn(page).click();
    await expect(lineCards(page)).toHaveCount(i + 2);
  }
  await challengeBtn(page).click();
  const cards = await readReveal(page);
  expect(cards.every((c) => c.good)).toBe(true);
  for (let i = 0; i < cards.length - 1; i++) expect(cards[i].pct).toBeLessThanOrEqual(cards[i + 1].pct);
  // The arrow graphs the amounts: never dropping, and it shines.
  const graph = await readGraph(page);
  expect(graph.filter((y) => y !== null).length).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < graph.length - 1; i++) {
    if (graph[i] !== null && graph[i + 1] !== null) expect(graph[i + 1]).toBeGreaterThanOrEqual(graph[i] - 0.01);
  }
  await expect(page.locator(".wedge .sheen")).toHaveCount(1);
});

test("a misordered line is judged wrong and flags the right cards", async ({ page }) => {
  await start(page);
  // Always place at the left edge; with random cards this is soon wrong.
  let wrong = false;
  for (let i = 0; i < 12 && !wrong; i++) {
    await tapLine(page, 0.01);
    await placeBtn(page).click();
    wrong = await page.evaluate(() => {
      const g = window.__game;
      const a = g.line.map((c) => c.counts[g.target]);
      return a.some((v, j) => j > 0 && a[j - 1] > v);
    });
  }
  expect(wrong).toBe(true);
  await challengeBtn(page).click();
  const cards = await readReveal(page);
  const exact = await page.evaluate(() => {
    const g = window.__game;
    return g.line.map((c) => c.counts[g.target]);
  });
  for (let i = 0; i < exact.length; i++) {
    const outOfOrder = (i > 0 && exact[i - 1] > exact[i]) || (i < exact.length - 1 && exact[i] > exact[i + 1]);
    expect(cards[i].bad).toBe(outOfOrder);
    expect(cards[i].good).toBe(!outOfOrder);
  }
  // The arrow graphs the amounts: it drops exactly where the order breaks.
  const graph = await readGraph(page);
  for (let i = 0; i < exact.length - 1; i++) {
    if (graph[i] === null || graph[i + 1] === null) continue;
    if (exact[i] > exact[i + 1]) expect(graph[i + 1]).toBeLessThan(graph[i]);
    else expect(graph[i + 1]).toBeGreaterThanOrEqual(graph[i] - 0.01);
  }
  await expect(page.locator(".wedge .sheen")).toHaveCount(0);

  // One ✕ between each out-of-order pair.
  const clashes = await page.locator(".line .slot").evaluateAll((slots) => slots.map((s) => !!s.querySelector(".clash")));
  expect(clashes).toEqual(exact.map((a, i) => i < exact.length - 1 && a > exact[i + 1]));
  await expect(page.locator(".line .face.bad.knocked")).toHaveCount(cards.filter((c) => c.bad).length);

  // Sorted view puts the same cards in order; Played restores the game's order.
  const ids = () => page.locator(".line .slot img").evaluateAll((imgs) => imgs.map((i) => i.src));
  const played = await ids();
  await page.getByRole("button", { name: "Sorted" }).click();
  await expect(page.locator(".clash")).toHaveCount(0);
  await expect(page.locator(".line .face.knocked")).toHaveCount(0);
  const sorted = (await readReveal(page)).map((c) => c.pct);
  expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
  expect([...(await ids())].sort()).toEqual([...played].sort());
  const rising = (ys) => ys.every((y, i) => i === 0 || y === null || ys[i - 1] === null || y >= ys[i - 1] - 0.01);
  await expect.poll(async () => rising(await readGraph(page))).toBe(true);
  await page.getByRole("button", { name: "Played" }).click();
  await expect.poll(ids).toEqual(played);
  await expect(page.locator(".clash")).toHaveCount(clashes.filter(Boolean).length);
});

test("help opens and closes", async ({ page }) => {
  await start(page);
  const dialog = page.getByRole("dialog", { name: "How to play" });
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("a correct line has no sorted view", async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const { correctSlots } = await import("/src/lib/order.js");
    const g = window.__game;
    g.moveTo(correctSlots([g.line[0].counts[g.target]], g.pending.counts[g.target])[0]);
  });
  await placeBtn(page).click();
  await challengeBtn(page).click();
  await expect(page.locator(".wedge")).toHaveAttribute("data-state", "graph");
  await expect(page.getByRole("button", { name: "Sorted" })).toHaveCount(0);
});

test("challenge returns an unplaced card to the deck; next round resets", async ({ page }) => {
  await start(page);
  await tapLine(page, 0.95);
  await placeBtn(page).click();
  await tapLine(page, 0.95);
  await expect(page.locator(".line .slot.is-pending")).toHaveCount(1);
  await challengeBtn(page).click();
  await expect(page.locator(".line .slot.is-pending")).toHaveCount(0);
  await expect(lineCards(page)).toHaveCount(2);
  await expect(page.locator(".deck .slot")).toHaveCount(1);

  await page.getByRole("button", { name: "Next round" }).click();
  await expect(lineCards(page)).toHaveCount(1);
  await expect(placeBtn(page)).toHaveCount(0);
  await expect(page.locator(".wedge")).toHaveAttribute("data-state", "flat");
});

test("layout fits the viewport in portrait and landscape", async ({ page }) => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 640, height: 360 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(lineCards(page)).toHaveCount(1);
    await tapLine(page, 0.95);
    await expect(placeBtn(page)).toBeVisible();
    await page.waitForFunction(() => document.getAnimations().length === 0);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    }));
    expect(overflow, JSON.stringify(size)).toEqual({ x: false, y: false });
    for (const el of [placeBtn(page), challengeBtn(page), page.locator(".deck"), page.locator(".line")]) {
      const b = await el.boundingBox();
      expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= size.width + 1 && b.y + b.height <= size.height + 1, JSON.stringify([size, b])).toBe(true);
    }
    const card = await lineCards(page).first().boundingBox();
    expect(card.height, JSON.stringify(size)).toBeGreaterThan(110);
    // At least two whole cards fit across the line.
    const line = await page.locator(".line").boundingBox();
    expect(line.width, JSON.stringify(size)).toBeGreaterThan(card.width * 2 + 20);
  }
});

test("no two cards in a line are within 0.1% of each other", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 8; i++) {
    await tapLine(page, 0.95);
    await placeBtn(page).click();
    await expect(lineCards(page)).toHaveCount(i + 2);
  }
  const amounts = await page.evaluate(() => {
    const g = window.__game;
    return g.line.map((c) => c.counts[g.target]).sort((a, b) => a - b);
  });
  for (let i = 0; i < amounts.length - 1; i++) expect(amounts[i + 1] - amounts[i]).toBeGreaterThanOrEqual(256);
});

test("the graph settles back to the arrow smoothly on the next round", async ({ page }) => {
  await start(page);
  // Put the most of the target color first, so the graph peaks at the left.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const g = window.__game;
      const amount = (c) => c.counts[g.target];
      g.moveTo(amount(g.pending) > amount(g.line[0]) ? 0 : g.line.length);
    });
    await placeBtn(page).click();
    await expect(lineCards(page)).toHaveCount(i + 2);
  }
  await challengeBtn(page).click();
  await readGraph(page);

  // Height of the highest point of the arrow on every frame after Next round.
  await page.evaluate(() => {
    window.__peaks = [];
    const tick = () => {
      const ys = [...document.querySelectorAll(".wedge svg polygon")].flatMap((p) =>
        p.getAttribute("points").split(" ").map((pt) => parseFloat(pt.split(",")[1]))
      );
      window.__peaks.push(-Math.min(...ys));
      window.__raf = requestAnimationFrame(tick);
    };
    tick();
  });
  await page.getByRole("button", { name: "Next round" }).click();
  await expect(page.locator(".wedge")).toHaveAttribute("data-state", "flat");
  await page.waitForTimeout(500);
  const peaks = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__peaks;
  });
  // It only ever comes down: no flash to flat, no jump back up.
  for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThanOrEqual(peaks[i - 1] + 0.5);
});
