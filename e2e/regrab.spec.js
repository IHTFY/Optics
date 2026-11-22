import { expect, test } from "@playwright/test";

// The glide of a dropped card is stretched, so a second press is certain to land inside it.
const GLIDE_SLOWDOWN = 8;

async function open(page, baseURL) {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort()
  );
  await page.addInitScript((slowdown) => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.classList.contains("drag-ghost")) options = { ...options, duration: options.duration * slowdown };
      return animate.call(this, keyframes, options);
    };
  }, GLIDE_SLOWDOWN);
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
}

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

// Release over the line, `below` pixels under its middle, so the card glides back up to its slot.
async function dropInLine(page, below = 0) {
  const deck = centerOf(await page.locator(".deck .slot").boundingBox());
  const line = await page.locator(".line").boundingBox();
  await page.mouse.move(deck.x, deck.y);
  await page.mouse.down();
  await page.mouse.move(line.x + 40, line.y + line.height / 2 + below, { steps: 10 });
  await expect(page.locator(".drag-ghost")).toHaveCount(1);
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector(".drag-ghost")?.getAnimations().length === 1);
}

test("grabbing the card again while it settles after a drop keeps the drag under the finger", async ({ page, baseURL }) => {
  await open(page, baseURL);
  await dropInLine(page);

  // The first glide is running. Press the visible card with real input and pull it.
  // The card is still flying into the line, so wait until it stops before pressing at its spot.
  const pending = page.locator(".line .slot.is-pending");
  let slot;
  await expect(async () => {
    const before = await pending.boundingBox();
    await page.waitForTimeout(60);
    slot = await pending.boundingBox();
    expect(slot).toEqual(before);
  }).toPass();
  const grab = centerOf(slot);
  await page.mouse.move(grab.x, grab.y);
  // The first glide is still running at the moment of the press.
  expect(await page.locator(".drag-ghost").evaluate((el) => el.getAnimations().length)).toBe(1);
  await page.mouse.down();
  await page.mouse.move(grab.x + 15, grab.y + 5, { steps: 3 });
  await page.mouse.move(grab.x + 30, grab.y + 10, { steps: 3 });
  const ghost = page.locator(".drag-ghost");
  await expect(ghost).toHaveCount(1);
  // The new drag is not the gliding one: it has no animation and sits under the pointer.
  expect(await ghost.evaluate((el) => el.getAnimations().length)).toBe(0);
  // The card is grabbed where the visible one was (the glide has nearly reached the slot), so the finger stays on it.
  const underPointer = async () => {
    const box = await ghost.boundingBox();
    expect(grab.x + 30).toBeGreaterThan(box.x);
    expect(grab.x + 30).toBeLessThan(box.x + box.width);
    expect(grab.y + 10).toBeGreaterThan(box.y);
    expect(grab.y + 10).toBeLessThan(box.y + box.height);
    return box;
  };
  const held = await underPointer();

  // Hold still well past the end of the first glide: the drag must stay under the finger.
  await page.waitForTimeout(180 * GLIDE_SLOWDOWN + 200);
  await expect(ghost).toHaveCount(1);
  expect(await underPointer()).toEqual(held);

  await page.mouse.up();
  await expect(ghost).toHaveCount(0);
  // The card is in the line or the deck exactly where the game has it.
  const placed = await page.evaluate(() => {
    const pending = document.querySelectorAll(".slot.is-pending");
    const index = [...document.querySelectorAll(".line .slot")].findIndex((el) => el.classList.contains("is-pending"));
    return { pending: pending.length, matches: (window.__game.slot ?? -1) === index };
  });
  expect(placed).toEqual({ pending: 1, matches: true });
});

test("grabbing the gliding card where it is, away from its slot, starts a drag from that spot", async ({ page, baseURL }) => {
  await open(page, baseURL);
  const line = await page.locator(".line").boundingBox();
  // Let go as low as the line still takes the card, so the glide back to the slot is long.
  await dropInLine(page, line.height * 0.8);

  // Hold the glide near its start so the card stays put under the press, well below its slot.
  const ghost = page.locator(".drag-ghost");
  await ghost.evaluate((el) => {
    const glide = el.getAnimations()[0];
    glide.pause();
    glide.currentTime = 50;
  });
  const pending = page.locator(".line .slot.is-pending");
  let slot;
  await expect(async () => {
    const before = await pending.boundingBox();
    await page.waitForTimeout(60);
    slot = await pending.boundingBox();
    expect(slot).toEqual(before);
  }).toPass();
  const glideBox = await ghost.boundingBox();
  // Press the low end of the visible card, below its slot and inside the window, so the press cannot reach the slot.
  const grab = { x: glideBox.x + glideBox.width / 2, y: Math.min(glideBox.y + glideBox.height - 20, page.viewportSize().height - 10) };
  expect(grab.y).toBeGreaterThan(slot.y + slot.height);
  expect(grab.y).toBeGreaterThan(glideBox.y + 40);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  // Before the pointer moves, the card stays where it was pressed instead of jumping to its slot.
  await page.waitForTimeout(100);
  await expect(ghost).toHaveCount(1);
  const pressed = await ghost.boundingBox();
  expect(Math.abs(pressed.x - glideBox.x)).toBeLessThan(2);
  expect(Math.abs(pressed.y - glideBox.y)).toBeLessThan(2);
  await page.mouse.move(grab.x + 15, grab.y - 5, { steps: 3 });
  await page.mouse.move(grab.x + 30, grab.y - 10, { steps: 3 });

  // The new drag has no animation and holds the card where it was pressed.
  await expect(ghost).toHaveCount(1);
  expect(await ghost.evaluate((el) => el.getAnimations().length)).toBe(0);
  const underPointer = async () => {
    const box = await ghost.boundingBox();
    expect(Math.abs(box.x - (glideBox.x + 30))).toBeLessThan(2);
    expect(Math.abs(box.y - (glideBox.y - 10))).toBeLessThan(2);
  };
  await underPointer();
  await page.waitForTimeout(200);
  await expect(ghost).toHaveCount(1);
  await underPointer();

  await page.mouse.up();
  await expect(ghost).toHaveCount(0);
});

test("a card dropped near the edge of a long line stays in the slot it was released over", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page, baseURL);
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      window.__game.moveTo(0);
      window.__game.place();
    });
    await expect(page.locator(".deck .slot")).toHaveCount(1);
  }
  await expect
    .poll(() => page.evaluate(() => document.querySelector(".line").scrollWidth - document.querySelector(".line").clientWidth))
    .toBeGreaterThan(200);

  // Pull the card to the right edge of the line and hold until the line scrolls.
  const deck = centerOf(await page.locator(".deck .slot").boundingBox());
  const line = await page.locator(".line").boundingBox();
  const scrollLeft = () => page.evaluate(() => document.querySelector(".line").scrollLeft);
  await page.mouse.move(deck.x, deck.y);
  await page.mouse.down();
  await page.mouse.move(line.x + line.width - 20, line.y + line.height / 2, { steps: 10 });
  await expect.poll(scrollLeft).toBeGreaterThan(20);
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector(".drag-ghost")?.getAnimations().length === 1);

  // While the card glides, nothing scrolls the line or moves the card to another slot.
  const during = await page.evaluate(() => ({ scroll: document.querySelector(".line").scrollLeft, slot: window.__game.slot }));
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ({ scroll: document.querySelector(".line").scrollLeft, slot: window.__game.slot }))).toEqual(during);
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  expect(await page.evaluate(() => window.__game.slot)).toBe(during.slot);
});
