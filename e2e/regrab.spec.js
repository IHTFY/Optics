import { expect, test } from "@playwright/test";

test("grabbing the card again while it settles after a drop keeps the drag under the finger", async ({ page, baseURL }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort()
  );
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  const deck = await page.locator(".deck .slot").boundingBox();
  const line = await page.locator(".line").boundingBox();
  await page.mouse.move(deck.x + deck.width / 2, deck.y + deck.height / 2);
  await page.mouse.down();
  await page.mouse.move(line.x + 40, line.y + line.height / 2, { steps: 10 });
  await expect(page.locator(".drag-ghost")).toHaveCount(1);
  await page.waitForTimeout(100);
  await page.mouse.up();
  // Grab and pull again in one task, so the glide of the first drop is certain to still be running.
  const grabbed = await page.evaluate(() => {
    const slot = document.querySelector(".line .slot.is-pending");
    const r = slot.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const init = (px, py) => ({ bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, clientX: px, clientY: py });
    slot.dispatchEvent(new PointerEvent("pointerdown", init(x, y)));
    window.dispatchEvent(new PointerEvent("pointermove", init(x + 15, y + 5)));
    window.dispatchEvent(new PointerEvent("pointermove", init(x + 30, y + 10)));
    return document.querySelectorAll(".drag-ghost").length;
  });
  expect(grabbed).toBe(1);
  // Hold still past the end of the first glide: the ghost must stay while the button is down.
  await page.waitForTimeout(400);
  await expect(page.locator(".drag-ghost")).toHaveCount(1);
  // The card lands where it was last held.
  const slots = await page.evaluate(() => {
    const held = window.__game.slot;
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 }));
    return [held, window.__game.slot];
  });
  expect(slots[1]).toBe(slots[0]);
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await expect(page.locator(".slot.is-pending")).toHaveCount(1);
});
