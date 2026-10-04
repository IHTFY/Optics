import { expect, test } from '@playwright/test';

async function reveal(page) {
  await page.goto('/');
  await expect(page.locator('.deck .slot')).toHaveCount(1);
  await page.evaluate(() => {
    const game = window.__game;
    const card = game.line[0];
    game.line = [8, 2, 7, 3, 6, 4, 5, 1].map((amount, i) => ({
      ...card, id: `polish-${i}`, counts: { ...card.counts, [game.target]: amount * 10000 },
    }));
    game.challenge();
  });
  await expect(page.locator('.wedge')).toHaveAttribute('data-state', 'graph');
}

test('arrowhead follows the visible line segment while scrolling', async ({ page }) => {
  await reveal(page);
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    await page.locator('.line').evaluate((line, fraction) => {
      line.scrollLeft = (line.scrollWidth - line.clientWidth) * fraction;
    }, fraction);
    await expect.poll(() => page.evaluate(() => {
      const svg = document.querySelector('.wedge svg');
      const segments = svg.querySelectorAll(':scope > line');
      const line = segments[segments.length - 1];
      const head = svg.querySelector(':scope > polygon:last-child').points;
      const baseX = (head[0].x + head[2].x) / 2;
      const baseY = (head[0].y + head[2].y) / 2;
      const dx = line.x2.baseVal.value - line.x1.baseVal.value;
      const dy = line.y2.baseVal.value - line.y1.baseVal.value;
      const hx = head[1].x - baseX;
      const hy = head[1].y - baseY;
      return Math.abs(dx * hy - dy * hx) / (Math.hypot(dx, dy) * Math.hypot(hx, hy));
    })).toBeLessThan(0.001);
  }
});

test('played and sorted can be dragged and still clicked', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile && browserName !== 'chromium', 'touch input requires CDP');
  await reveal(page);
  const played = page.getByRole('button', { name: 'Played', exact: true });
  const sorted = page.getByRole('button', { name: 'Sorted', exact: true });
  const a = await played.boundingBox();
  const b = await sorted.boundingBox();
  const x = a.x + a.width / 2;
  const y = a.y + a.height / 2;
  const toX = b.x + b.width / 2;
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (toX - x) * i / 10, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(toX, y, { steps: 10 });
    await page.mouse.up();
  }
  await expect(sorted).toHaveAttribute('aria-pressed', 'true');
  await played.click();
  await expect(played).toHaveAttribute('aria-pressed', 'true');
  await sorted.click();
  await expect(sorted).toHaveAttribute('aria-pressed', 'true');
});

test('next round gathers cards and returns them to the deck before dealing', async ({ page }) => {
  await reveal(page);
  await page.getByRole('button', { name: 'Next round' }).click();
  const collection = page.locator('[data-round-collection]');
  await expect(collection).toBeVisible();
  await expect(collection.locator('.card')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Next round' })).toBeDisabled();
  await expect(page.locator('.line .slot').first()).toBeHidden();
  await expect(collection).toHaveCount(0);
  await expect(page.locator('.line .slot')).toHaveCount(1);
  await expect(page.locator('.deck .slot')).toHaveCount(1);
});

test('reduced motion skips card collection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await reveal(page);
  await page.getByRole('button', { name: 'Next round' }).click();
  await expect(page.locator('[data-round-collection]')).toHaveCount(0);
  await expect(page.locator('.line .slot')).toHaveCount(1);
});
