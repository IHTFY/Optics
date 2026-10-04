<script>
  import { untrack } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { PALETTE } from "../lib/colors.js";
  import { ms } from "../lib/motion.js";

  // Narrow on the left, wide on the right: less of the target color to more.
  // Once revealed, it bends into a line graph of the amounts, one point above
  // each card, so every drop to the right is a pair in the wrong order.
  let { color, values = null, perfect = false, line = null, delay = 0 } = $props();

  const uid = $props.id();

  let width = $state(0);
  let height = $state(0);
  /** Thickness of the flat arrow's head, from CSS. */
  let flatHead = $state(24);
  /** Card centers in this element's coordinates. */
  let xs = $state.raw([]);
  /**
   * Where the points were when the graph started to flatten. The cards are
   * replaced while it comes down, so it keeps to the old spots until it is flat.
   */
  let frozen = $state.raw(null);
  /** Empty space above this element that the graph may rise into. */
  let room = $state(0);

  // Heights of the points (0 at the bottom, 1 at the top) and how far the
  // arrow has turned into a graph (0 flat, 1 graph), eased together.
  let from = { graph: 0, heights: [] };
  let to = $state.raw({ graph: 0, heights: [] });
  const progress = new Tween(1);

  $effect(() => {
    const next = values ? { graph: 1, heights: scale(values) } : { graph: 0, heights: [] };
    const wait = values ? delay : 0;
    untrack(() => {
      from = current(progress.current);
      to = next;
      frozen = values ? null : (frozen ?? xs);
      progress.set(0, { duration: 0 });
      // Rising waits for the amounts to show; sorting keeps time with the cards.
      const rising = next.graph !== from.graph;
      progress
        .set(1, { delay: ms(rising ? wait : 0), duration: ms(rising ? 900 : 650), easing: cubicInOut })
        .then(() => {
          if (to === next && !values) frozen = null;
        });
    });
  });

  /**
   * Half by amount and half by rank, so the shape follows the percentages
   * yet even a tiny drop is visible.
   */
  function scale(values) {
    const lo = Math.min(...values);
    const span = Math.max(...values) - lo;
    const ranks = [...new Set(values)].sort((a, b) => a - b);
    const top = Math.max(1, ranks.length - 1);
    return values.map((v) => 0.5 * (span ? (v - lo) / span : 0) + 0.5 * (ranks.indexOf(v) / top));
  }

  function current(t) {
    const n = Math.max(from.heights.length, to.heights.length);
    const lerp = (a, b) => a + (b - a) * t;
    return {
      graph: lerp(from.graph, to.graph),
      heights: Array.from({ length: n }, (_, i) => lerp(from.heights[i] ?? 0, to.heights[i] ?? 0)),
    };
  }

  let box = $state();

  // Keep the points over the cards as the line scrolls, resizes or changes.
  function measure() {
    if (!line) return;
    const slots = line.querySelectorAll(":scope > .slot");
    const offset = line.getBoundingClientRect().left + line.clientLeft - line.scrollLeft - box.getBoundingClientRect().left;
    xs = Array.from(slots, (s) => offset + s.offsetLeft + s.offsetWidth / 2);
    room = box.getBoundingClientRect().top - box.parentElement.getBoundingClientRect().top;
  }

  $effect(() => {
    if (!line) return;
    let frame = 0;
    const queue = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(queue);
    resize.observe(line);
    resize.observe(box.parentElement);
    const mutations = new MutationObserver(queue);
    mutations.observe(line, { childList: true });
    line.addEventListener("scroll", queue, { passive: true });
    queue();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      line.removeEventListener("scroll", queue);
    };
  });

  const shape = $derived.by(() => {
    const { graph, heights } = current(progress.current);
    const mix = (a, b) => a + (b - a) * graph;

    const head = mix(flatHead, Math.max(12, flatHead * 0.6));
    const end = width - head;
    const thickness = (x) => mix(2, 2.5) + (mix(flatHead * 0.87, head * 0.45) - mix(2, 2.5)) * Math.max(0, x / end);
    const base = height - head / 2;
    const rise = Math.max(0, base - head / 2 + mix(0, Math.min(room, 140)));
    const y = (h) => base - h * rise;

    // The graph through the card centers, flat beyond the first and last card,
    // clipped to the visible arrow.
    const points = (frozen ?? xs).map((x, i) => [x, y(heights[i] ?? 0)]);
    const at = (x) => {
      if (!points.length || x <= points[0][0]) return points[0]?.[1] ?? base;
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
      }
      return points.at(-1)[1];
    };
    const path = [[0, at(0)], ...points.filter(([x]) => x > 0 && x < end), [end, at(end)]];

    const top = path.map(([x, py]) => `${x},${py - thickness(x) / 2}`);
    const bottom = path.map(([x, py]) => `${x},${py + thickness(x) / 2}`).reverse();
    const segments = path.slice(1).map(([x, py], i) => ({
      x1: path[i][0],
      y1: path[i][1],
      x2: x,
      y2: py,
      width: thickness(path[i][0]),
    }));
    const tipY = at(end);
    // Follow the segment entering the head, including when it is clipped by scrolling.
    const previous = path.at(-2);
    const angle = Math.atan2(tipY - previous[1], end - previous[0]);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const tipX = end + head * dx;
    const tipHeight = tipY + head * dy;
    return {
      band: [...top, ...bottom].join(" "),
      segments,
      tip: `${end + dy * head / 2},${tipY - dx * head / 2} ${tipX},${tipHeight} ${end - dy * head / 2},${tipY + dx * head / 2}`,
    };
  });

  const settled = $derived(progress.current === 1 && to.graph === 1);
  const label = $derived(
    values
      ? `${color} amounts, left to right: ${perfect ? "in order" : "out of order"}`
      : `Order by ${color}, least to most`
  );
</script>

<div
  class="wedge"
  data-state={values ? (settled ? "graph" : "moving") : "flat"}
  bind:this={box}
  bind:clientWidth={width}
  bind:clientHeight={height}
  aria-label={label}
  role="img"
>
  <div class="gauge" bind:clientHeight={flatHead}></div>
  {#if width}
    <svg viewBox="0 0 {width} {height}" style:--fill={PALETTE[color]}>
      <defs>
        <mask id="{uid}-mask" maskUnits="userSpaceOnUse" x="0" y={-room - 20} width={width} height={height + room + 40}>
          {@render arrow("#fff")}
        </mask>
        <linearGradient id="{uid}-sheen" x1="0" x2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.85" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
      </defs>
      {@render arrow("var(--fill)")}
      {#if perfect && settled}
        <g mask="url(#{uid}-mask)">
          <rect class="sheen" x="-160" y={-room - 20} width="160" height={height + room + 40} fill="url(#{uid}-sheen)" style:--travel="{width + 160}px" />
        </g>
      {/if}
    </svg>
  {/if}
</div>

{#snippet arrow(fill)}
  <polygon points={shape.band} style:fill={fill} />
  {#each shape.segments as s, i (i)}
    <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke-width={s.width} style:stroke={fill} />
  {/each}
  <polygon points={shape.tip} style:fill={fill} />
{/snippet}

<style>
  .wedge {
    position: relative;
    flex: none;
    height: clamp(30px, 9vmin, 64px);
  }

  /* The flat arrow's head: as tall as the old arrow. */
  .gauge {
    position: absolute;
    visibility: hidden;
    height: clamp(22px, 5vmin, 40px);
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  polygon,
  line {
    transition:
      fill 450ms ease,
      stroke 450ms ease;
  }

  line {
    stroke-linecap: round;
  }

  .sheen {
    animation: sheen 1100ms cubic-bezier(0.45, 0, 0.3, 1) 150ms both;
  }

  @keyframes sheen {
    to {
      transform: translateX(var(--travel));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sheen {
      animation: none;
      opacity: 0;
    }
  }
</style>
