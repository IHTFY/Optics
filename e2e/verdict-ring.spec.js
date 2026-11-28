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
      // Four cards with two out of order, so the line holds both right and wrong cards.
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

// Wrong cards shake and then lean out of line, so the layout check above isn't enough: follow each card's drawn
// shape through that motion.
const MOTION_SIZES = [[320, 568], [360, 640], [390, 844], [844, 390]];
// Two next to each other that lean toward each other ([1, 9, 2, 8, 3]) are the tightest pair.
const LINES = { "wrong cards side by side": [5, 9, 1, 7], "wrong cards leaning together": [1, 9, 2, 8, 3] };

for (const [width, height] of MOTION_SIZES) {
  for (const [name, amounts] of Object.entries(LINES)) {
    test(`verdict ring stays off the next card's art while ${name} move at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.locator(".deck .slot")).toHaveCount(1);
      await page.evaluate((amounts) => {
        const game = window.__game;
        const card = game.line[0];
        game.line = amounts.map((amount, i) => ({
          ...card, id: `ring-${i}`, counts: { ...card.counts, [game.target]: amount * 10000 },
        }));
      }, amounts);

      const worst = await page.evaluate(async () => {
        // Where a card face is drawn: its slot's place in the line, then the face's own translate, rotate, scale and
        // transform about its transform origin.
        const shape = (face) => {
          const style = getComputedStyle(face);
          const [w, h] = [face.offsetWidth, face.offsetHeight];
          const slot = face.closest(".slot").getBoundingClientRect();
          const [ox, oy] = style.transformOrigin.split(" ").map(parseFloat);
          const [tx, ty = "0px"] = style.translate === "none" ? ["0px"] : style.translate.split(" ");
          const length = (v, size) => (v.endsWith("%") ? (parseFloat(v) / 100) * size : parseFloat(v));
          const [sx, sy = sx] = style.scale === "none" ? ["1"] : style.scale.split(" ");
          const matrix = new DOMMatrix()
            .translate(slot.left + face.offsetLeft + ox, slot.top + face.offsetTop + oy)
            .translate(length(tx, w), length(ty, h))
            .rotate(style.rotate === "none" ? 0 : parseFloat(style.rotate))
            .scale(Number(sx), Number(sy))
            .multiply(new DOMMatrix(style.transform === "none" ? undefined : style.transform))
            .translate(-ox, -oy);
          // The rounded corners, sampled along the outline, clockwise.
          const r = parseFloat(style.borderTopLeftRadius);
          const points = [];
          for (const [cx, cy, from] of [[w - r, r, -90], [w - r, h - r, 0], [r, h - r, 90], [r, r, 180]]) {
            for (let k = 0; k <= 8; k++) {
              const a = ((from + k * 90 / 8) * Math.PI) / 180;
              const p = matrix.transformPoint({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
              points.push([p.x, p.y]);
            }
          }
          const ring = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
          return { points, ring: ring * Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)) };
        };
        const inside = (p, poly) => poly.every((a, i) => {
          const b = poly[(i + 1) % poly.length];
          return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
        });
        const toSegment = (p, a, b) => {
          const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
          const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
          return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
        };
        // Distance between two shapes; negative when they overlap.
        const apart = (A, B) => {
          if (A.some((p) => inside(p, B)) || B.some((p) => inside(p, A))) return -1;
          let d = Infinity;
          for (const [P, Q] of [[A, B], [B, A]]) {
            for (let i = 0; i < P.length; i++) for (const q of Q) d = Math.min(d, toSegment(q, P[i], P[(i + 1) % P.length]));
          }
          return d;
        };

        window.__game.challenge();
        // Hold the cards' own motion (shake, bump, lean) from its first frame, let the revealed line finish flying
        // in, then step through that motion in fixed increments, so a slow machine can't skip the frames that matter.
        const ownMotion = () => document.getAnimations().filter((a) => a.effect.target.matches(".line .face"));
        while (!ownMotion().some((a) => a.animationName?.endsWith("shake"))) await new Promise(requestAnimationFrame);
        const animations = ownMotion();
        animations.forEach((a) => a.pause());
        const from = animations.map((a) => a.currentTime);
        const settled = () => !document.querySelector(".line .slot[inert]") &&
          [...document.querySelectorAll(".line .slot")].every((slot) => !slot.getAnimations().length);
        while (!settled()) await new Promise(requestAnimationFrame);
        const faces = [...document.querySelectorAll(".line .slot .face")];
        let worst = { clear: Infinity, faces: faces.length };
        for (let t = 0; t <= 2500; t += 10) {
          animations.forEach((a, i) => { a.currentTime = from[i] + t; });
          const shapes = faces.map(shape);
          for (let i = 1; i < shapes.length; i++) {
            const [a, b] = [shapes[i - 1], shapes[i]];
            const rings = [faces[i - 1], faces[i]].map((face, k) => (face.matches(".good, .bad") ? [a, b][k].ring : 0));
            const clear = apart(a.points, b.points) - Math.max(...rings);
            if (clear < worst.clear) worst = { ...worst, clear: +clear.toFixed(2), cards: [i - 1, i], at: t };
          }
        }
        return worst;
      });

      expect(worst.faces).toBe(amounts.length);
      expect(worst.clear, JSON.stringify(worst)).toBeGreaterThanOrEqual(0);
    });
  }
}
