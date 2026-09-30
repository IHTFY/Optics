import { COLORS, INK, inkCss } from "./colors.js";

// Random card art in the spirit of "Illusion": bold, flat, graphic
// compositions drawn only with the four inks (plus the background, which is
// used to cut gaps and outlines back in). Anti-aliasing is fine because every
// pixel is snapped to the nearest ink afterwards, but nothing is drawn
// thinner than ~5px so the snapped result stays clean.
//
// All randomness comes from `rng`, so a seed always reproduces its card.
// Colors are assigned to roles through a shuffled palette with random
// weights, so no color is systematically bigger than another.

const TAU = Math.PI * 2;
const BG = "background";
const MIN = 5; // thinnest feature, in px

export function drawArt(ctx, rng, width, height) {
  // Rarely a composition ends up (almost) single-colored, which makes for a
  // dull card and ties. Redraw those (and, often, two-color cards) with the
  // same rng stream, so the result is still fully determined by the seed.
  for (let attempt = 0; ; attempt++) {
    const pal = makePalette(rng);
    pickWeighted(rng, LAYOUTS)(ctx, rng, width, height, pal);
    if (attempt === 3) return;
    const want = rng.chance(0.6) ? 3 : 2;
    if (colorsPresent(ctx, width, height) >= want) return;
    fillAll(ctx, BG, width, height);
  }
}

/** Number of the four colors covering at least 1% of the card (sampled). */
function colorsPresent(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const inks = COLORS.map((c) => INK[c]);
  const counts = [0, 0, 0, 0];
  let samples = 0;
  for (let y = 1; y < h; y += 4) {
    for (let x = 1; x < w; x += 4) {
      const i = (y * w + x) * 4;
      samples++;
      // Background is black; skip dark pixels.
      if (data[i] + data[i + 1] + data[i + 2] < 200) continue;
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < 4; c++) {
        const d = (data[i] - inks[c][0]) ** 2 + (data[i + 1] - inks[c][1]) ** 2 + (data[i + 2] - inks[c][2]) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      counts[best]++;
    }
  }
  return counts.filter((n) => n >= samples * 0.01).length;
}

// ---------------------------------------------------------------------------
// Palette: a shuffled color order plus random per-card weights.

function makePalette(rng) {
  const order = rng.shuffle(COLORS);
  // Some cards only use three colors; the dropped one is random.
  const colors = rng.chance(0.2) ? order.slice(0, 3) : order;
  const weight = {};
  for (const c of order) weight[c] = 0.06 + rng.next() ** 1.5;
  weight[BG] = rng.chance(0.65) ? rng.range(0.15, 0.8) : 0;
  return buildPalette(rng, colors, weight, weight[BG] > 0);
}

function buildPalette(rng, colors, weight, hasBg) {
  const pal = {
    colors,
    weight,
    hasBg,
    /** The same palette without some inks (used to keep a fill visible on its ground). */
    without(avoid) {
      const avoidList = Array.isArray(avoid) ? avoid : [avoid];
      const rest = colors.filter((c) => !avoidList.includes(c));
      if (rest.length < 2) return pal;
      return buildPalette(rng, rest, weight, hasBg && !avoidList.includes(BG));
    },
    /** Weighted random ink, optionally avoiding some. */
    pick(avoid = [], allowBg = true) {
      const avoidList = Array.isArray(avoid) ? avoid : [avoid];
      const pool = [...colors, ...(allowBg && hasBg ? [BG] : [])].filter(
        (c) => !avoidList.includes(c)
      );
      if (!pool.length) return rng.pick(colors);
      return pickWeighted(rng, pool.map((c) => [c, weight[c]]));
    },
    /** Uniform random color (never background), avoiding some. */
    any(avoid = []) {
      const avoidList = Array.isArray(avoid) ? avoid : [avoid];
      const pool = colors.filter((c) => !avoidList.includes(c));
      return rng.pick(pool.length ? pool : colors);
    },
    /** A repeating sequence of n distinct inks with relative widths. */
    seq(n, bgChance = 0.5) {
      const list = rng.shuffle(colors).slice(0, Math.min(n, colors.length));
      if (hasBg && rng.chance(bgChance)) {
        list.splice(rng.int(1, list.length), 0, BG);
      }
      return list.map((c) => ({ c, wt: Math.max(0.1, weight[c]) }));
    },
  };
  return pal;
}

function pickWeighted(rng, items) {
  let total = 0;
  for (const [, wt] of items) total += wt;
  let r = rng.next() * total;
  for (const [item, wt] of items) {
    r -= wt;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

// ---------------------------------------------------------------------------
// Low-level drawing helpers.

function fillWith(ctx, name) {
  ctx.fillStyle = inkCss(name);
}

function fillAll(ctx, name, w, h) {
  fillWith(ctx, name);
  ctx.fillRect(-2, -2, w + 4, h + 4);
}

/** Fill the current path and stroke it thinly in the same ink to hide seams. */
function solid(ctx, name, seam = 1.2) {
  ctx.fillStyle = inkCss(name);
  ctx.fill();
  if (seam) {
    ctx.strokeStyle = inkCss(name);
    ctx.lineWidth = seam;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

const HEART_STEPS = 64;

const SHAPES = {
  circle(ctx, x, y, r) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  },
  heart(ctx, x, y, r) {
    // Parametric heart, about 2r wide, centered at (x, y).
    const k = r / 16;
    for (let i = 0; i < HEART_STEPS; i++) {
      const t = (i / HEART_STEPS) * TAU;
      const px = x + k * 16 * Math.sin(t) ** 3;
      const py =
        y - k * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - k * 2;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  },
  star(ctx, x, y, r, rot = -Math.PI / 2, points = 5, inner = 0.45) {
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI) / points;
      const rr = i % 2 ? r * inner : r;
      if (i) ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      else ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    ctx.closePath();
  },
  poly(ctx, x, y, r, rot = -Math.PI / 2, sides = 3) {
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * TAU) / sides;
      if (i) ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      else ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
  },
  triangle(ctx, x, y, r, rot) {
    SHAPES.poly(ctx, x, y + r * 0.2, r * 1.15, rot ?? -Math.PI / 2, 3);
  },
  diamond(ctx, x, y, r) {
    ctx.moveTo(x, y - r * 1.15);
    ctx.lineTo(x + r * 0.85, y);
    ctx.lineTo(x, y + r * 1.15);
    ctx.lineTo(x - r * 0.85, y);
    ctx.closePath();
  },
  square(ctx, x, y, r, rot = 0) {
    SHAPES.poly(ctx, x, y, r * 1.2, rot + Math.PI / 4, 4);
  },
  hexagon(ctx, x, y, r, rot = 0) {
    SHAPES.poly(ctx, x, y, r, rot, 6);
  },
  ring(ctx, x, y, r) {
    // Use with evenodd fill/clip.
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
    ctx.moveTo(x + r * 0.5, y);
    ctx.arc(x, y, r * 0.5, 0, TAU, true);
  },
};

/** Smooth random blob around (x, y). */
function blobPath(ctx, rng, x, y, r, lobes = rng.int(5, 9), wobble = rng.range(0.15, 0.4)) {
  const pts = [];
  const rot = rng.range(0, TAU);
  for (let i = 0; i < lobes; i++) {
    const a = rot + (i * TAU) / lobes;
    const rr = r * (1 - wobble / 2 + rng.range(0, wobble));
    pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[lobes - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < lobes; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % lobes]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

function smiley(ctx, x, y, r, face, feature) {
  ctx.beginPath();
  SHAPES.circle(ctx, x, y, r);
  solid(ctx, face);
  fillWith(ctx, feature);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * r * 0.35, y - r * 0.25, r * 0.12, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.strokeStyle = inkCss(feature);
  ctx.lineWidth = Math.max(MIN, r * 0.13);
  ctx.lineCap = "round";
  ctx.arc(x, y + r * 0.02, r * 0.55, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
  ctx.lineCap = "butt";
}

// ---------------------------------------------------------------------------
// Full-card patterns. Each covers the whole card (it may be clipped).

function stripes(ctx, rng, w, h, pal) {
  const bands = pal.seq(rng.pick([2, 3, 3, 3, 4, 4, 4, 4]), 0.45);
  const total = bands.reduce((s, b) => s + b.wt, 0);
  const period = rng.pick([rng.range(28, 70), rng.range(70, 170), rng.range(170, 360)]);
  const angle = rng.pick([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, rng.range(0, Math.PI)]);
  const grow = rng.chance(0.3) ? rng.range(0.6, 3) : 0; // progressively wider bands
  const R = Math.hypot(w, h) / 2 + 4;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  let x = -R - rng.range(0, period);
  let i = 0;
  while (x < R) {
    const b = bands[i++ % bands.length];
    const scale = grow ? 0.35 + (grow * (x + R)) / (2 * R) : 1;
    const bw = Math.max(MIN + 1, (period * scale * b.wt) / total);
    fillWith(ctx, b.c);
    ctx.fillRect(x, -R, bw + 1, 2 * R);
    x += bw;
  }
  ctx.restore();
}

function rings(ctx, rng, w, h, pal) {
  const bands = pal.seq(rng.pick([2, 3, 3, 3, 4, 4, 4, 4]), 0.45);
  const total = bands.reduce((s, b) => s + b.wt, 0);
  const cx = rng.chance(0.5) ? w / 2 : rng.range(-w * 0.3, w * 1.3);
  const cy = rng.chance(0.5) ? h / 2 : rng.range(-h * 0.2, h * 1.2);
  const far = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(w - cx, cy),
    Math.hypot(cx, h - cy),
    Math.hypot(w - cx, h - cy)
  );
  const period = rng.pick([rng.range(30, 80), rng.range(80, 200)]);
  const grow = rng.chance(0.35) ? rng.range(0.6, 2.5) : 0;
  const circle = rng.chance(0.8);
  const sides = rng.pick([4, 6, 3]);
  const rot = rng.range(0, TAU);
  let r = far + rng.range(0, period);
  let i = 0;
  while (r > 0) {
    const b = bands[i++ % bands.length];
    ctx.beginPath();
    if (circle) SHAPES.circle(ctx, cx, cy, r);
    else SHAPES.poly(ctx, cx, cy, r, rot, sides);
    fillWith(ctx, b.c);
    ctx.fill();
    const scale = grow ? 0.3 + (grow * r) / far : 1;
    r -= Math.max(MIN + 1, (period * scale * b.wt) / total);
  }
}

function sunburst(ctx, rng, w, h, pal) {
  const bands = pal.seq(rng.pick([2, 3, 3, 3, 4, 4, 4, 4]), 0.4);
  const total = bands.reduce((s, b) => s + b.wt, 0);
  const cx = rng.chance(0.5) ? w / 2 : rng.range(0, w);
  const cy = rng.chance(0.4) ? h / 2 : rng.pick([rng.range(0, h), -rng.range(0, 60), h + rng.range(0, 60)]);
  const reps = rng.int(3, 14);
  const R = Math.hypot(w, h) * 1.1;
  const twist = rng.chance(0.3) ? rng.range(-1.2, 1.2) : 0; // curved rays
  let a = rng.range(0, TAU);
  const step = TAU / reps;
  for (let k = 0; k < reps; k++) {
    for (const b of bands) {
      const span = (step * b.wt) / total;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      if (twist) {
        const n = 16;
        for (let j = 1; j <= n; j++) {
          const t = j / n;
          const aa = a + twist * t;
          ctx.lineTo(cx + R * t * Math.cos(aa), cy + R * t * Math.sin(aa));
        }
        for (let j = n; j >= 1; j--) {
          const t = j / n;
          const aa = a + span + 0.01 + twist * t;
          ctx.lineTo(cx + R * t * Math.cos(aa), cy + R * t * Math.sin(aa));
        }
      } else {
        ctx.arc(cx, cy, R, a, a + span + 0.01);
      }
      ctx.closePath();
      fillWith(ctx, b.c);
      ctx.fill();
      a += span;
    }
  }
  // A hub hides the busy convergence point.
  if (reps > 5 || rng.chance(0.5)) {
    const hub = rng.range(20, 90);
    const cols = pal.seq(2, 0.3);
    ctx.beginPath();
    SHAPES.circle(ctx, cx, cy, hub);
    solid(ctx, cols[0].c);
    if (hub > 45 && rng.chance(0.5)) {
      ctx.beginPath();
      SHAPES.circle(ctx, cx, cy, hub * 0.55);
      solid(ctx, cols[1].c);
    }
  }
}

function waves(ctx, rng, w, h, pal) {
  const bands = pal.seq(rng.pick([2, 3, 3, 3, 4, 4, 4, 4]), 0.45);
  const total = bands.reduce((s, b) => s + b.wt, 0);
  const vertical = rng.chance(0.3);
  const [W, H] = vertical ? [h, w] : [w, h];
  const period = rng.range(50, 190);
  const amp = rng.range(10, Math.min(70, period * 0.6));
  const wl = W / rng.pick([0.5, 1, 1.5, 2, 3, 4]);
  const kind = rng.pick(["sine", "sine", "zigzag", "square"]);
  const phaseShift = rng.chance(0.4) ? rng.range(0.2, 1.2) : 0;
  const wave = (x, phase) => {
    const t = x / wl + phase;
    if (kind === "sine") return Math.sin(t * TAU);
    const f = t - Math.floor(t);
    if (kind === "zigzag") return 4 * Math.abs(f - 0.5) - 1;
    return f < 0.5 ? 1 : -1;
  };
  ctx.save();
  if (vertical) {
    ctx.translate(w, 0);
    ctx.rotate(Math.PI / 2);
  }
  fillAll(ctx, bands[bands.length - 1].c, W, H);
  let y = -amp - rng.range(0, period);
  let i = 0;
  let phase = rng.next();
  const segs = kind === "sine" ? 48 : 0;
  while (y < H + amp) {
    const b = bands[i++ % bands.length];
    ctx.beginPath();
    ctx.moveTo(-2, H + 4);
    if (segs) {
      for (let s = 0; s <= segs; s++) {
        const x = (s / segs) * (W + 4) - 2;
        ctx.lineTo(x, y + amp * wave(x, phase));
      }
    } else {
      // Exact corners for zigzag/square waves.
      const step = kind === "zigzag" ? wl / 2 : wl / 2;
      let x = -wl - (phase % 1) * wl;
      while (x <= W + wl) {
        if (kind === "zigzag") {
          ctx.lineTo(x, y + amp * wave(x, phase));
        } else {
          const v = amp * wave(x + 0.01, phase);
          ctx.lineTo(x, y + v);
          ctx.lineTo(x + step, y + v);
        }
        x += step;
      }
    }
    ctx.lineTo(W + 4, H + 4);
    ctx.closePath();
    fillWith(ctx, b.c);
    ctx.fill();
    y += Math.max(MIN + 1, (period * b.wt) / total);
    phase += phaseShift / 10;
  }
  ctx.restore();
}

function spiral(ctx, rng, w, h, pal) {
  const cols = pal.seq(rng.pick([2, 3, 3, 3, 3, 3]), 0.4);
  const cx = rng.chance(0.6) ? w / 2 : rng.range(w * 0.2, w * 0.8);
  const cy = rng.chance(0.6) ? h / 2 : rng.range(h * 0.2, h * 0.8);
  fillAll(ctx, cols[0].c, w, h);
  const arms = rng.int(1, 4);
  const gap = rng.range(40, 120); // radial distance between turns of one arm
  const b = gap / TAU;
  const R = Math.hypot(w, h);
  const armCols = cols.slice(1);
  const frac = Math.min(0.8, Math.max(0.2, cols[1].wt / (cols[0].wt + cols[1].wt)));
  const lw = Math.max(MIN + 2, (gap / arms) * frac);
  const dir = rng.chance(0.5) ? 1 : -1;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let k = 0; k < arms; k++) {
    const off = (k * TAU) / arms;
    ctx.beginPath();
    for (let t = 0; b * t < R; t += 0.12) {
      const r = b * t;
      const a = dir * t + off;
      if (t === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.strokeStyle = inkCss(armCols[k % armCols.length].c);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function tiles(ctx, rng, w, h, pal) {
  const cols = rng.pick([1, 2, 2, 3, 3, 4, 4, 5, 6, 8]);
  const s = w / cols;
  const rows = Math.ceil(h / s);
  const oy = (h - rows * s) / 2;
  const motifs = rng.shuffle(["quarter", "half", "tri", "circle", "diamond", "square", "arcs", "leaf"]).slice(
    0,
    rng.pick([1, 1, 2, 3])
  );
  const scheme = rng.pick(["random", "random", "pair", "checker"]);
  const ca = pal.pick();
  const cb2 = pal.pick(ca, false);
  const cc = pal.any([ca, cb2]);
  const byRow = rng.chance(0.5);
  const gap = rng.chance(0.25) ? rng.range(MIN, Math.max(MIN, s * 0.08)) : 0;
  const same = rng.chance(0.5) ? rng.int(0, 3) : -1; // shared rotation
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * s;
      const y = oy + r * s;
      let a, b;
      if (scheme === "random") {
        a = pal.pick();
        b = pal.pick(a);
      } else if (scheme === "pair") {
        // One ground, two alternating motif colors.
        a = ca;
        b = (byRow ? r : r + c) % 2 ? cb2 : cc;
      } else {
        // Checkered ground, one motif color.
        a = (r + c) % 2 ? ca : cb2;
        b = cc;
      }
      fillWith(ctx, a);
      ctx.fillRect(x, y, s + 1, s + 1);
      const motif = rng.pick(motifs);
      const rot = same >= 0 ? same : rng.int(0, 3);
      ctx.save();
      ctx.translate(x + s / 2, y + s / 2);
      ctx.rotate((rot * Math.PI) / 2);
      const k = s / 2 - gap;
      ctx.beginPath();
      switch (motif) {
        case "quarter":
          ctx.moveTo(-k, -k);
          ctx.arc(-k, -k, 2 * k, 0, Math.PI / 2);
          break;
        case "half":
          ctx.moveTo(-k, -k);
          ctx.arc(-k, 0, k, -Math.PI / 2, Math.PI / 2);
          break;
        case "tri":
          ctx.moveTo(-k, -k);
          ctx.lineTo(k, -k);
          ctx.lineTo(-k, k);
          break;
        case "circle":
          SHAPES.circle(ctx, 0, 0, k * rng.pick([0.5, 0.7, 0.85]));
          break;
        case "diamond":
          ctx.moveTo(0, -k);
          ctx.lineTo(k, 0);
          ctx.lineTo(0, k);
          ctx.lineTo(-k, 0);
          break;
        case "square": {
          const q = k * rng.pick([0.4, 0.6]);
          ctx.rect(-q, -q, 2 * q, 2 * q);
          break;
        }
        case "arcs": {
          const t = Math.max(MIN, k * 0.36);
          ctx.moveTo(-k + k + t / 2, -k);
          ctx.arc(-k, -k, k + t / 2, 0, Math.PI / 2);
          ctx.arc(-k, -k, k - t / 2, Math.PI / 2, 0, true);
          ctx.closePath();
          ctx.moveTo(k, k - k - t / 2);
          ctx.arc(k, k, k + t / 2, -Math.PI / 2, Math.PI, true);
          ctx.arc(k, k, k - t / 2, Math.PI, -Math.PI / 2);
          break;
        }
        case "leaf":
          ctx.moveTo(-k, k);
          ctx.quadraticCurveTo(-k, -k, k, -k);
          ctx.quadraticCurveTo(k, k, -k, k);
          break;
      }
      ctx.closePath();
      if (k * 2 >= MIN * 2) solid(ctx, b, 0);
      ctx.restore();
    }
  }
  if (gap) gridLines(ctx, w, h, s, oy, rows, cols, gap);
}

function gridLines(ctx, w, h, s, oy, rows, cols, lw) {
  fillWith(ctx, BG);
  for (let c = 0; c <= cols; c++) ctx.fillRect(c * s - lw / 2, 0, lw, h);
  for (let r = 0; r <= rows; r++) ctx.fillRect(0, oy + r * s - lw / 2, w, lw);
}

function checker(ctx, rng, w, h, pal) {
  const s = rng.pick([rng.range(16, 32), rng.range(32, 70), rng.range(70, 140)]);
  const angle = rng.pick([0, 0, Math.PI / 4, rng.range(0, Math.PI / 2)]);
  const cols = pal.seq(rng.pick([2, 3, 3, 3, 3, 3]), 0.4);
  const mode = rng.pick(["checker", "checker", "weighted", "gradient"]);
  const R = Math.hypot(w, h) / 2 + s;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  const n = Math.ceil(R / s);
  const gx = rng.pick([1, 0.5, 0.34, 0.25]) * rng.pick([1, -1]);
  const gy = rng.pick([1, 0.5, 0.34, 0.25, 0]);
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      let c;
      if (mode === "checker") {
        c = cols[(((i + j) % cols.length) + cols.length) % cols.length].c;
      } else if (mode === "weighted") {
        c = pal.pick();
      } else {
        // Stepped diagonal bands of squares.
        const idx = Math.floor(i * gx + j * gy + 1000 * cols.length);
        c = cols[idx % cols.length].c;
      }
      fillWith(ctx, c);
      ctx.fillRect(i * s, j * s, s + 1, s + 1);
    }
  }
  ctx.restore();
}

function triangles(ctx, rng, w, h, pal) {
  const s = rng.pick([rng.range(40, 80), rng.range(80, 160)]);
  const th = (s * Math.sqrt(3)) / 2;
  const vertical = rng.chance(0.5);
  const [W, H] = vertical ? [h, w] : [w, h];
  const mode = rng.pick(["weighted", "weighted", "rows", "stars"]);
  const cols = pal.seq(rng.pick([2, 3, 3, 3, 4, 4, 4, 4]), 0.3);
  ctx.save();
  if (vertical) {
    ctx.translate(w, 0);
    ctx.rotate(Math.PI / 2);
  }
  const rows = Math.ceil(H / th) + 1;
  const n = Math.ceil(W / (s / 2)) + 3;
  for (let r = 0; r < rows; r++) {
    for (let i = -2; i < n; i++) {
      const up = (i + r) % 2 === 0;
      const x = (i * s) / 2;
      const y0 = r * th;
      ctx.beginPath();
      if (up) {
        ctx.moveTo(x, y0 + th);
        ctx.lineTo(x + s / 2, y0);
        ctx.lineTo(x + s, y0 + th);
      } else {
        ctx.moveTo(x, y0);
        ctx.lineTo(x + s, y0);
        ctx.lineTo(x + s / 2, y0 + th);
      }
      ctx.closePath();
      let c;
      if (mode === "weighted") c = pal.pick();
      else if (mode === "rows") c = cols[(r + (up ? 0 : 1)) % cols.length].c;
      else c = up ? cols[0].c : cols[1 + ((((i + r) >> 1) % (cols.length - 1)) + cols.length) % (cols.length - 1)].c;
      solid(ctx, c);
    }
  }
  ctx.restore();
}

function mondrian(ctx, rng, w, h, pal) {
  const lw = rng.chance(0.6) ? rng.range(MIN + 1, 16) : 0;
  const depth = rng.int(2, 6);
  const rects = [];
  const split = (x, y, rw, rh, d) => {
    const canV = rw > 60;
    const canH = rh > 60;
    if (d <= 0 || (!canV && !canH) || (d < depth - 1 && rng.chance(0.2))) {
      rects.push([x, y, rw, rh]);
      return;
    }
    const vert = canV && (!canH || rng.chance(rw / (rw + rh)));
    const t = rng.range(0.25, 0.75);
    if (vert) {
      split(x, y, rw * t, rh, d - 1);
      split(x + rw * t, y, rw * (1 - t), rh, d - 1);
    } else {
      split(x, y, rw, rh * t, d - 1);
      split(x, y + rh * t, rw, rh * (1 - t), d - 1);
    }
  };
  split(0, 0, w, h, depth);
  const inset = rng.chance(0.3) ? rng.range(0.1, 0.3) : 0;
  const recent = [];
  for (const [x, y, rw, rh] of rects) {
    // Avoid repeating the last two colors so neighbors rarely merge.
    const c = pal.pick(recent.slice(-2));
    recent.push(c);
    fillWith(ctx, c);
    ctx.fillRect(x, y, rw + 1, rh + 1);
    if (inset && rw > 50 && rh > 50 && rng.chance(0.5)) {
      // A nested block or disc inside some cells.
      const c2 = pal.pick(c);
      fillWith(ctx, c2);
      ctx.beginPath();
      if (rng.chance(0.5)) {
        ctx.rect(x + rw * inset, y + rh * inset, rw * (1 - 2 * inset), rh * (1 - 2 * inset));
      } else {
        SHAPES.circle(ctx, x + rw / 2, y + rh / 2, Math.min(rw, rh) * (0.5 - inset));
      }
      ctx.fill();
    }
  }
  if (lw) {
    fillWith(ctx, BG);
    for (const [x, y, rw, rh] of rects) {
      ctx.fillRect(x - lw / 2, y - lw / 2, rw + lw, lw);
      ctx.fillRect(x - lw / 2, y - lw / 2, lw, rh + lw);
    }
  }
}

function bubbles(ctx, rng, w, h, pal) {
  const base = pal.pick();
  fillAll(ctx, base, w, h);
  const maxR = rng.pick([rng.range(30, 60), rng.range(60, 140), rng.range(140, 220)]);
  const minR = rng.range(MIN * 2, Math.max(MIN * 2, maxR * 0.3));
  const coverage = rng.range(0.2, 0.65) * w * h; // target area for bubbles
  const overlap = rng.chance(0.35);
  const spacing = rng.range(2, 10);
  const placed = [];
  const concentric = rng.chance(0.3);
  const colorsOf = pal.seq(rng.pick([2, 3, 3, 3, 3, 3]), 0.2).map((b) => b.c).filter((c) => c !== base);
  if (!colorsOf.length) colorsOf.push(pal.any(base));
  let area = 0;
  for (let tries = 0; tries < 3000 && area < coverage; tries++) {
    const r = minR + (maxR - minR) * rng.next() ** 2.5;
    const x = rng.range(-r * 0.5, w + r * 0.5);
    const y = rng.range(-r * 0.5, h + r * 0.5);
    if (!overlap && placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + r + spacing)) continue;
    placed.push([x, y, r]);
    area += Math.PI * r * r;
    const c = rng.chance(0.75) ? rng.pick(colorsOf) : pal.pick(base);
    ctx.beginPath();
    SHAPES.circle(ctx, x, y, r);
    solid(ctx, c, 0);
    if (concentric && r > 24) {
      const c2 = pal.pick(c);
      ctx.beginPath();
      SHAPES.circle(ctx, x, y, r * rng.pick([0.4, 0.55, 0.7]));
      solid(ctx, c2, 0);
    }
  }
}

function venn(ctx, rng, w, h, pal) {
  const base = pal.pick();
  fillAll(ctx, base, w, h);
  const n = rng.int(3, 7);
  const shape = rng.pick(["circle", "circle", "blob", "square"]);
  const cycle = pal.seq(4, 0).map((b) => b.c).filter((c) => c !== base);
  for (let i = 0; i < n; i++) {
    const r = rng.range(w * 0.18, w * 0.6);
    const x = rng.range(w * 0.1, w * 0.9);
    const y = rng.range(h * 0.1, h * 0.9);
    ctx.beginPath();
    if (shape === "blob") blobPath(ctx, rng, x, y, r);
    else if (shape === "square") SHAPES.square(ctx, x, y, r * 0.8, rng.chance(0.5) ? 0 : Math.PI / 4);
    else SHAPES.circle(ctx, x, y, r);
    solid(ctx, i < cycle.length ? cycle[i] : pal.pick(base), 0);
    if (rng.chance(0.3)) {
      ctx.strokeStyle = inkCss(BG);
      ctx.lineWidth = rng.range(MIN + 1, 14);
      ctx.stroke();
    }
  }
}

function motifs(ctx, rng, w, h, pal) {
  const kind = rng.pick(["heart", "smiley", "star", "circle", "triangle", "diamond", "hexagon", "heart", "smiley"]);
  const base = pal.pick();
  fillAll(ctx, base, w, h);
  const cols = rng.pick([2, 3, 3, 4, 5]);
  const cw = w / cols;
  const rows = Math.ceil(h / cw) + 1;
  const offset = rng.chance(0.6);
  const size = rng.range(0.28, 0.5) * cw;
  const scheme = rng.pick(["cycle", "cycle", "weighted", "weighted", "single"]);
  const seq = pal.seq(3, 0).map((b) => b.c).filter((c) => c !== base);
  if (!seq.length) seq.push(pal.any(base));
  const single = seq[0];
  const tilt = rng.chance(0.3) ? rng.range(-0.4, 0.4) : 0;
  const alt = rng.chance(0.3);
  for (let r = -1; r < rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const x = cw * (c + 0.5) + (offset && r % 2 ? cw / 2 : 0);
      const y = (h - rows * cw) / 2 + cw * (r + 0.5);
      let col;
      if (scheme === "single") col = single;
      else if (scheme === "cycle") col = seq[(((r + c) % seq.length) + seq.length) % seq.length];
      else col = pal.pick(base, false);
      const rot = tilt * (alt && (r + c) % 2 ? -1 : 1);
      drawMotif(ctx, rng, kind, x, y, size, col, pal, rot);
    }
  }
}

function drawMotif(ctx, rng, kind, x, y, r, col, pal, rot = 0) {
  if (kind === "smiley") {
    smiley(ctx, x, y, r, col, pal.pick(col));
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  if (kind === "star") SHAPES.star(ctx, 0, 0, r * 1.15);
  else SHAPES[kind](ctx, 0, 0, r);
  solid(ctx, col, 0);
  ctx.restore();
}

// Patterns, with relative frequency.
const PATTERNS = [
  [stripes, 3],
  [rings, 2.5],
  [sunburst, 2],
  [waves, 2.5],
  [spiral, 1],
  [tiles, 3],
  [checker, 2],
  [triangles, 1.5],
  [mondrian, 2],
  [bubbles, 2],
  [venn, 1.5],
  [motifs, 2.5],
];

// Patterns that work well as the fill of a hero shape or frame.
const FILLS = [
  [stripes, 3],
  [rings, 2],
  [sunburst, 1],
  [waves, 2],
  [checker, 2],
  [tiles, 1],
  [triangles, 1],
  [spiral, 1],
];

// ---------------------------------------------------------------------------
// Layouts: how patterns and shapes are combined on the card.

function single(ctx, rng, w, h, pal) {
  pickWeighted(rng, PATTERNS)(ctx, rng, w, h, pal);
}

function hero(ctx, rng, w, h, pal) {
  // A pattern background with one or a few bold shapes on top.
  const base = rng.chance(0.3) ? pal.pick() : null;
  if (base) fillAll(ctx, base, w, h);
  else pickWeighted(rng, FILLS)(ctx, rng, w, h, pal);

  const kind = rng.pick(["circle", "heart", "star", "triangle", "diamond", "square", "hexagon", "ring", "blob", "smiley", "circle", "heart"]);
  const arrangement = rng.pick(["one", "one", "one", "row", "stack"]);
  const spots = [];
  if (arrangement === "one") {
    spots.push([w / 2 + rng.range(-40, 40), h / 2 + rng.range(-60, 60), rng.range(w * 0.25, w * 0.47)]);
  } else if (arrangement === "row") {
    const n = rng.int(2, 3);
    const r = (h / n) * rng.range(0.28, 0.4);
    for (let i = 0; i < n; i++) spots.push([w / 2, (h * (i + 0.5)) / n, Math.min(r, w * 0.42)]);
  } else {
    const big = rng.range(w * 0.3, w * 0.45);
    spots.push([w / 2, h / 2, big], [w / 2, h / 2, big * rng.range(0.45, 0.65)]);
  }
  const patterned = rng.chance(base ? 0.5 : 0.35);
  // On a plain background, a colored outline keeps the card to 3+ colors.
  const plain = base && !patterned;
  const outline = plain || patterned || rng.chance(0.55) ? rng.range(MIN + 2, 18) : 0;
  const outlineInk = plain ? pal.any(base) : rng.chance(0.6) ? BG : pal.any();
  const avoid = (prev) => [base, prev, plain ? outlineInk : null].filter(Boolean);
  const rot = kind === "triangle" && rng.chance(0.3) ? Math.PI / 2 : undefined;
  let prev = null;
  for (const [x, y, r] of spots) {
    if (kind === "smiley") {
      const face = pal.any(avoid(prev));
      if (outline) {
        ctx.beginPath();
        SHAPES.circle(ctx, x, y, r + outline);
        solid(ctx, outlineInk, 0);
      }
      smiley(ctx, x, y, r, face, pal.pick(face));
      prev = face;
      continue;
    }
    ctx.beginPath();
    if (kind === "blob") blobPath(ctx, rng, x, y, r);
    else if (kind === "star") SHAPES.star(ctx, x, y, r * 1.2, -Math.PI / 2, rng.pick([5, 5, 6, 8]), 0.5);
    else SHAPES[kind](ctx, x, y, r, rot);
    if (outline) {
      ctx.strokeStyle = inkCss(outlineInk);
      ctx.lineWidth = outline * 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    if (patterned) {
      ctx.save();
      ctx.clip(kind === "ring" ? "evenodd" : "nonzero");
      pickWeighted(rng, FILLS)(ctx, rng, w, h, base ? pal.without(base) : pal);
      ctx.restore();
    } else {
      const c = pal.any(avoid(prev));
      ctx.fillStyle = inkCss(c);
      ctx.fill(kind === "ring" ? "evenodd" : "nonzero");
      prev = c;
    }
  }
}

function split(ctx, rng, w, h, pal) {
  // Two patterns meeting along a straight or curved line.
  pickWeighted(rng, FILLS)(ctx, rng, w, h, pal);
  const mode = rng.pick(["half", "diagonal", "wave", "circle"]);
  ctx.save();
  ctx.beginPath();
  if (mode === "half") {
    const t = rng.range(0.35, 0.65);
    if (rng.chance(0.6)) ctx.rect(0, h * t, w, h);
    else ctx.rect(w * t, 0, w, h);
  } else if (mode === "diagonal") {
    const flip = rng.chance(0.5);
    ctx.moveTo(flip ? w : 0, h * rng.range(0.1, 0.5));
    ctx.lineTo(flip ? 0 : w, h * rng.range(0.5, 0.9));
    ctx.lineTo(flip ? 0 : w, h);
    ctx.lineTo(flip ? w : 0, h);
  } else if (mode === "wave") {
    const y0 = h * rng.range(0.35, 0.65);
    const amp = rng.range(20, 70);
    const ph = rng.range(0, TAU);
    const k = rng.pick([1, 1.5, 2]);
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, y0 + amp * Math.sin((x / w) * k * TAU + ph));
    ctx.lineTo(w, h);
  } else {
    SHAPES.circle(ctx, rng.pick([0, w]), rng.pick([0, h]), rng.range(w * 0.6, w * 1.1));
  }
  ctx.closePath();
  const edge = rng.range(MIN + 1, 14);
  ctx.strokeStyle = inkCss(rng.chance(0.6) ? BG : pal.any());
  ctx.lineWidth = edge * 2;
  ctx.stroke();
  ctx.clip();
  pickWeighted(rng, FILLS)(ctx, rng, w, h, pal);
  ctx.restore();
}

function frame(ctx, rng, w, h, pal) {
  // An outer pattern with an inset window showing another pattern.
  pickWeighted(rng, FILLS)(ctx, rng, w, h, pal);
  const m = rng.range(28, 90);
  const window = rng.pick(["rect", "round", "arch", "circle"]);
  const edge = rng.range(MIN + 1, 14);
  ctx.save();
  ctx.beginPath();
  const x0 = m;
  const y0 = m * rng.range(1, 1.6);
  const x1 = w - m;
  const y1 = h - y0;
  if (window === "rect") ctx.rect(x0, y0, x1 - x0, y1 - y0);
  else if (window === "round") ctx.roundRect(x0, y0, x1 - x0, y1 - y0, rng.range(20, 60));
  else if (window === "arch") {
    const r = (x1 - x0) / 2;
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, y0 + r);
    ctx.arc(w / 2, y0 + r, r, Math.PI, 0);
    ctx.lineTo(x1, y1);
  } else SHAPES.circle(ctx, w / 2, h / 2, (x1 - x0) / 2);
  ctx.closePath();
  ctx.strokeStyle = inkCss(rng.chance(0.6) ? BG : pal.any());
  ctx.lineWidth = edge * 2;
  ctx.stroke();
  ctx.clip();
  if (rng.chance(0.2)) fillAll(ctx, pal.pick(), w, h);
  else pickWeighted(rng, PATTERNS)(ctx, rng, w, h, pal);
  ctx.restore();
}

const LAYOUTS = [
  [single, 5],
  [hero, 3],
  [split, 1],
  [frame, 1],
];
