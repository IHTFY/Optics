import { expect, test } from "@playwright/test";

const LOADER = "https://ihtfy.com/ads/v1.js";

const HELPERS = `
  window.__reveal = () => {
    const game = window.__game;
    const card = game.line[0];
    game.line = [3, 1, 2].map((amount, i) => ({ ...card, id: \`ad-\${i}\`, counts: { ...card.counts, [game.target]: amount * 10000 } }));
    game.challenge();
  };
`;

const stubLoader = (page, body = "window.ihtfyAds = { show: (box, key) => (window.__shown ??= []).push(key) };") =>
  page.route(LOADER, (route) => route.fulfill({ contentType: "text/javascript", body }));

/** Phone sizes and the desktop size, with the box each should get. */
const SCREENS = [
  [360, 640, "320x100"],
  [390, 750, "320x100"],
  [412, 800, "300x250"],
  [1280, 800, "300x250"],
];

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

  await page.evaluate(HELPERS);
  await page.evaluate(() => window.__reveal());
  const box = page.locator(".ad-box");
  await expect(box).toHaveAttribute("data-ad-slot", "6470163205");
  await expect(page.locator(".ad p")).toHaveText("Advertisements");
  await expect.poll(() => page.evaluate(() => window.__shown?.length)).toBe(1);
  expect(loads).toHaveLength(1);
});

for (const [width, height, size] of SCREENS) {
  test(`at ${width}×${height} the ${size} box, the result, and Next round are all in view, 50px from every control`, async ({ page }) => {
    await stubLoader(page);
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".deck .slot")).toHaveCount(1);
    await page.evaluate(HELPERS);
    await page.evaluate(() => window.__reveal());
    const box = page.locator(".ad-box");
    await expect(box).toHaveAttribute("data-ad-size", size);
    await expect(page.locator(".primary")).toBeVisible();
    await page.waitForTimeout(1200);

    const m = await page.evaluate(() => {
      const rect = (el) => {
        const { top, bottom, left, right } = el.getBoundingClientRect();
        return { top, bottom, left, right };
      };
      const box = rect(document.querySelector(".ad-box"));
      const gap = (r) => Math.max(r.top - box.bottom, box.top - r.bottom, r.left - box.right, box.left - r.right);
      const controls = [...document.querySelectorAll("button, a[href], input")]
        .filter((el) => !el.closest("dialog") && el.getBoundingClientRect().width > 0)
        .map((el) => ({ name: el.textContent.trim() || el.getAttribute("aria-label"), gap: gap(rect(el)), clear: rect(el).bottom <= box.top || rect(el).right <= box.left }));
      return {
        box,
        view: [innerWidth, innerHeight],
        line: rect(document.querySelector(".line")),
        next: rect(document.querySelector(".primary")),
        controls,
        scrolls: document.querySelector(".page").scrollHeight > document.querySelector(".page").clientHeight,
      };
    });
    expect([m.box.right - m.box.left, m.box.bottom - m.box.top]).toEqual(size.split("x").map(Number));
    expect(m.box.top).toBeGreaterThanOrEqual(0);
    expect(m.box.bottom).toBeLessThanOrEqual(m.view[1]);
    expect(m.box.left).toBeGreaterThanOrEqual(0);
    expect(m.box.right).toBeLessThanOrEqual(m.view[0]);
    for (const part of [m.line, m.next]) {
      expect(part.top).toBeGreaterThanOrEqual(0);
      expect(part.bottom).toBeLessThanOrEqual(m.view[1]);
      expect(part.right).toBeLessThanOrEqual(m.view[0]);
      expect(part.bottom <= m.box.top || part.right <= m.box.left, "the result and Next round never sit under or across the box").toBe(true);
    }
    expect(m.scrolls).toBe(false);
    for (const control of m.controls) {
      expect(control.clear, `${control.name} sits above or left of the box, never beside the row it is in`).toBe(true);
      expect(control.gap, `${control.name} is 50px or more from the box`).toBeGreaterThanOrEqual(50);
    }
    expect(m.controls.map((c) => c.name)).toEqual(expect.arrayContaining(["Privacy", "Next round"]));
  });
}

test("an ad filling the box moves nothing", async ({ page }) => {
  // Fills the box the way the shared loader does: an inline-block unit of the box's own size.
  await stubLoader(
    page,
    `window.ihtfyAds = { show(box) {
      const ins = document.createElement("ins");
      const [w, h] = box.dataset.adSize.split("x");
      Object.assign(ins.style, { display: "inline-block", width: w + "px", height: h + "px" });
      setTimeout(() => box.appendChild(ins), 100);
    } };`,
  );
  for (const [width, height] of SCREENS) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".deck .slot")).toHaveCount(1);
    await page.evaluate(HELPERS);
    await page.evaluate(() => window.__reveal());
    await expect(page.locator(".ad-box")).toBeVisible();
    await page.waitForTimeout(1200);
    const rects = () =>
      page.evaluate(() => [".ad", ".ad-box", ".app", ".primary"].map((q) => JSON.stringify(document.querySelector(q).getBoundingClientRect())));
    const before = await rects();
    await expect(page.locator(".ad-box ins")).toHaveCount(1);
    await page.waitForTimeout(200);
    expect(await rects()).toEqual(before);
  }
});

test("no ad on the play screen, and the box goes with the results", async ({ page }) => {
  await stubLoader(page);
  await page.setViewportSize({ width: 390, height: 750 });
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await expect(page.locator(".ad")).toHaveCount(0);
  await page.evaluate(HELPERS);
  await page.evaluate(() => window.__reveal());
  await expect(page.locator(".ad")).toHaveCount(1);
  await page.locator(".primary").click();
  await expect(page.locator(".ad")).toHaveCount(0);
  await expect(page.locator(".challenge")).toBeVisible();
  const [page_, app] = await page.evaluate(() => [
    document.querySelector(".page").clientHeight,
    document.querySelector(".app").getBoundingClientRect().height,
  ]);
  expect(app).toBe(page_);
});

test("the help dialog never holds an ad", async ({ page }) => {
  await stubLoader(page);
  await page.goto("/");
  await page.locator('button[aria-label="How to play"]').click();
  await expect(page.locator("dialog [data-ad-slot], dialog aside")).toHaveCount(0);
});

test("a buyer gets no box and no reserved space", async ({ page }) => {
  // Hides the aside the way the shared loader does for a buyer.
  await stubLoader(
    page,
    `window.ihtfyAds = { show() {} };
     const sheet = new CSSStyleSheet();
     sheet.replaceSync("aside:has([data-ad-slot]) { display: none !important; }");
     document.adoptedStyleSheets = [sheet];`,
  );
  await page.setViewportSize({ width: 390, height: 750 });
  await page.addInitScript(() => localStorage.setItem("ihtfy-ad-free", "x.y"));
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await page.evaluate(HELPERS);
  await page.evaluate(() => window.__reveal());
  await expect(page.locator(".primary")).toBeVisible();
  await expect(page.locator(".ad")).toBeHidden();
  const [page_, app] = await page.evaluate(() => [
    document.querySelector(".page").clientHeight,
    document.querySelector(".app").getBoundingClientRect().height,
  ]);
  expect(app).toBe(page_);
});

test("Enter on the Privacy link follows the link instead of starting the next round", async ({ page }) => {
  await page.route(LOADER, (route) => route.fulfill({ contentType: "text/javascript", body: "window.ihtfyAds = { show() {} };" }));
  await page.route("https://ihtfy.com/privacy/", (route) => route.fulfill({ contentType: "text/html", body: "privacy" }));
  await page.goto("/");
  await expect(page.locator(".deck .slot")).toHaveCount(1);
  await page.evaluate(HELPERS);
  await page.evaluate(() => window.__reveal());
  await page.locator(".ad a").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("https://ihtfy.com/privacy/");
});
