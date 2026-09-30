import { COLORS, inkCss } from "./colors.js";

// Draws a random composition using only the four ink colors on top of the
// background. Anti-aliasing is fine: pixels are snapped afterwards.
export function drawArt(ctx, rng, width, height) {
  const style = rng.pick(Object.values(STYLES));
  style(ctx, rng, width, height);
}

const STYLES = {
  circles(ctx, rng, w, h) {
    for (const name of rng.shuffle(COLORS)) {
      ctx.fillStyle = inkCss(name);
      ctx.beginPath();
      ctx.arc(rng.range(0, w), rng.range(0, h), rng.range(w * 0.1, w * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  rects(ctx, rng, w, h) {
    for (const name of rng.shuffle(COLORS)) {
      ctx.save();
      ctx.fillStyle = inkCss(name);
      ctx.translate(rng.range(0, w), rng.range(0, h));
      ctx.rotate(rng.range(0, Math.PI * 2));
      ctx.fillRect(0, 0, rng.range(w * 0.1, w * 0.7), rng.range(h * 0.05, h * 0.4));
      ctx.restore();
    }
  },
};
