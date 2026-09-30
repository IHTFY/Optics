<script>
  import { onMount, tick } from "svelte";
  import { flip } from "svelte/animate";
  import Card from "./components/Card.svelte";
  import Wedge from "./components/Wedge.svelte";
  import { Game } from "./lib/game.svelte.js";
  import { ms, receive, send } from "./lib/motion.js";

  const game = new Game();

  let lineEl = $state();
  let deckEl = $state();
  let ghostEl = $state();

  // Pointer that went down on the pending card; becomes a drag once it moves.
  let press = null;
  let drag = $state(null);
  let suppressClick = false;

  const revealDelay = $derived(Math.min(1600, game.line.length * 90 + 350));

  onMount(() => {
    game.newRound();
    if (import.meta.env.DEV) window.__game = game;

    // Let a vertical mouse wheel scroll the line sideways on desktop.
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && lineEl.scrollWidth > lineEl.clientWidth) {
        e.preventDefault();
        lineEl.scrollLeft += e.deltaY;
      }
    };
    lineEl.addEventListener("wheel", onWheel, { passive: false });
    return () => lineEl.removeEventListener("wheel", onWheel);
  });

  // Keep the pending card in view when it moves by tap or keyboard.
  $effect(() => {
    game.slot;
    if (drag) return;
    tick().then(() => {
      lineEl
        ?.querySelector(".is-pending")
        ?.scrollIntoView({ behavior: ms(1) ? "smooth" : "auto", block: "nearest", inline: "nearest" });
    });
  });

  // After a challenge, bring the first misplaced card into view.
  $effect(() => {
    if (!game.result || game.result.correct) return;
    const first = Math.min(...game.result.bad);
    tick().then(() => {
      lineEl.children[first]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  });

  /** Layout of the committed cards as if the pending card were not in the line. */
  function lineGeometry() {
    const style = getComputedStyle(lineEl);
    const first = lineEl.querySelector(".slot");
    const width = first ? first.offsetWidth : 0;
    const gap = parseFloat(style.columnGap) || 0;
    const start = lineEl.getBoundingClientRect().left + parseFloat(style.paddingLeft) - lineEl.scrollLeft;
    return { width, step: width + gap, start };
  }

  /** Slot nearest to a card whose centre is at `x`. */
  function slotNear(x) {
    const { width, step, start } = lineGeometry();
    if (!step) return 0;
    return Math.max(0, Math.min(game.line.length, Math.round((x - start - width / 2) / step)));
  }

  /** Slot for a tap: before the first displayed card whose centre is right of `x`. */
  function slotForTap(x) {
    const committed = lineEl.querySelectorAll(".slot:not(.is-pending)");
    const rectLeft = lineEl.getBoundingClientRect().left - lineEl.scrollLeft;
    let i = 0;
    for (const el of committed) {
      if (x < rectLeft + el.offsetLeft + el.offsetWidth / 2) break;
      i++;
    }
    return i;
  }

  function onLineClick(e) {
    if (suppressClick || game.phase !== "play") return;
    if (e.target.closest(".is-pending")) return;
    game.moveTo(slotForTap(e.clientX));
  }

  function onDeckClick() {
    if (suppressClick) return;
    game.moveTo(null);
  }

  function onPointerDown(e) {
    if (game.phase !== "play" || e.button > 0 || press) return;
    const rect = e.currentTarget.getBoundingClientRect();
    press = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    if (!press || e.pointerId !== press.id) return;
    if (!drag) {
      if (Math.hypot(e.clientX - press.x0, e.clientY - press.y0) < 6) return;
      drag = { ...press, x: e.clientX, y: e.clientY, tilt: 0 };
      requestAnimationFrame(dragFrame);
    }
    const dx = e.clientX - drag.x;
    drag.tilt = Math.max(-10, Math.min(10, drag.tilt * 0.7 + dx * 0.6));
    drag.x = e.clientX;
    drag.y = e.clientY;
  }

  function dragFrame() {
    if (!drag) return;
    const line = lineEl.getBoundingClientRect();
    const margin = line.height * 0.35;
    const overLine = drag.y > line.top - margin && drag.y < line.bottom + margin;

    if (overLine) {
      // Scroll the line when dragging near its edges.
      const edge = Math.min(64, line.width / 5);
      if (drag.x < line.left + edge) lineEl.scrollLeft -= ((line.left + edge - drag.x) / edge) * 14;
      else if (drag.x > line.right - edge) lineEl.scrollLeft += ((drag.x - line.right + edge) / edge) * 14;

      const center = drag.x - drag.offsetX + drag.width / 2;
      const slot = slotNear(center);
      if (slot !== game.slot) game.moveTo(slot);
    } else {
      const deck = deckEl.getBoundingClientRect();
      const overDeck =
        drag.x > deck.left - 20 && drag.x < deck.right + 20 && drag.y > deck.top - 20 && drag.y < deck.bottom + 20;
      if (overDeck && game.slot !== null) game.moveTo(null);
    }
    drag.tilt *= 0.9;
    requestAnimationFrame(dragFrame);
  }

  async function onPointerUp(e) {
    if (!press || e.pointerId !== press.id) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    press = null;
    if (!drag) return;

    suppressClick = true;
    setTimeout(() => (suppressClick = false));

    // Glide the ghost into the pending card's spot, then drop it.
    const ghost = ghostEl;
    await tick();
    const target = document.querySelector(".slot.is-pending");
    if (ghost && target && ms(1)) {
      const from = ghost.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      await ghost.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` },
        ],
        { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" }
      ).finished;
    }
    drag = null;
  }

  function onKeydown(e) {
    if (e.target.closest?.("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (game.phase === "play") {
      if (key === "arrowleft") game.step(-1);
      else if (key === "arrowright") game.step(1);
      else if (key === "escape") game.moveTo(null);
      else if (key === "enter" && !e.target.closest?.("button")) game.place();
      else if (key === "c") game.challenge();
      else return;
    } else if (game.phase === "reveal") {
      if (key === "enter" && !e.target.closest?.("button")) game.newRound();
      else return;
    } else return;
    e.preventDefault();
  }

  const verdict = (i) => (game.result ? (game.result.bad.has(i) ? "bad" : "good") : null);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app" class:dragging={drag}>
  <header>
    <h1>Optics</h1>
    <a aria-label="GitHub" href="https://github.com/IHTFY/optics">
      <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor">
        <path
          d="M16 0C7.2 0 0 7.2 0 16c0 7.1 4.6 13 11 15 .8 .14 1.1-.34 1.1-.76 0-.38-.02-1.6-.02-3-4 .74-5.1-.98-5.4-1.9-.18-.46-.96-1.9-1.6-2.3-.56-.3-1.4-1-.02-1.1 1.3-.02 2.2 1.2 2.5 1.6 1.4 2.4 3.7 1.7 4.7 1.3 .14-1 .56-1.7 1-2.1-3.6-.4-7.3-1.8-7.3-7.9 0-1.7 .62-3.2 1.6-4.3-.16-.4-.72-2 .16-4.2 0 0 1.3-.42 4.4 1.6 1.3-.36 2.6-.54 4-.54 1.4 0 2.7 .18 4 .54 3.1-2.1 4.4-1.6 4.4-1.6 .88 2.2 .32 3.8 .16 4.2 1 1.1 1.6 2.5 1.6 4.3 0 6.1-3.7 7.5-7.3 7.9 .58 .5 1.1 1.5 1.1 3 0 2.1-.02 3.9-.02 4.4 0 .42 .3 .92 1.1 .76A16 16 0 0 0 32 16c0-8.8-7.2-16-16-16z"
        />
      </svg>
    </a>
  </header>

  <section class="board">
    <Wedge color={game.target} result={game.result} delay={revealDelay} />
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="line" class:choosing={game.phase === "play" && game.pending} bind:this={lineEl} onclick={onLineClick}>
      {#each game.row as item, i (item.card.id)}
        <div
          class="slot"
          class:is-pending={item.pending}
          class:lifted={item.pending && drag}
          animate:flip={{ duration: ms(280) }}
          in:receive={{ key: item.card.id }}
          out:send={{ key: item.card.id, delay: i * 40 }}
          onpointerdown={item.pending ? onPointerDown : undefined}
        >
          <Card
            card={item.card}
            target={game.target}
            pending={item.pending}
            reveal={game.phase === "reveal"}
            verdict={verdict(i)}
            order={i}
          />
        </div>
      {/each}
    </div>
  </section>

  <section class="hand">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="deck" bind:this={deckEl} onclick={onDeckClick}>
      {#if game.pending && game.slot === null}
        <div
          class="slot is-pending"
          class:lifted={drag}
          class:resting={game.phase !== "play"}
          in:receive={{ key: game.pending.id }}
          out:send={{ key: game.pending.id }}
          onpointerdown={onPointerDown}
        >
          <Card card={game.pending} target={game.target} />
        </div>
      {/if}
    </div>

    <div class="controls">
      {#if game.phase === "reveal"}
        <button class="primary" onclick={() => game.newRound()}>Next round</button>
      {:else}
        <button class="primary" disabled={!game.canPlace} onclick={() => game.place()}>Place</button>
        <button class="secondary" disabled={!game.canChallenge} onclick={() => game.challenge()}>
          Challenge
        </button>
      {/if}
    </div>
  </section>

  {#if drag}
    <div
      class="drag-ghost"
      bind:this={ghostEl}
      style:left="{drag.x - drag.offsetX}px"
      style:top="{drag.y - drag.offsetY}px"
      style:width="{drag.width}px"
      style:height="{drag.height}px"
      style:--tilt="{drag.tilt}deg"
    >
      <Card card={game.pending} target={game.target} ghost />
    </div>
  {/if}
</div>

<style>
  .app {
    --gap: clamp(10px, 2.5vmin, 20px);
    height: 100%;
    display: grid;
    grid-template:
      "header" auto
      "board" 1fr
      "hand" auto / minmax(0, 1fr);
    gap: var(--gap);
    padding: max(var(--gap), env(safe-area-inset-top)) max(var(--gap), env(safe-area-inset-right))
      max(var(--gap), env(safe-area-inset-bottom)) max(var(--gap), env(safe-area-inset-left));
    overflow: hidden;
  }

  .app.dragging {
    cursor: grabbing;
    user-select: none;
    -webkit-user-select: none;
  }

  header {
    grid-area: header;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    margin: 0;
    color: var(--brand);
    font-size: clamp(1.1rem, 4vmin, 1.8rem);
    font-weight: 200;
    letter-spacing: 0.35em;
    text-transform: uppercase;
  }

  header a {
    color: var(--muted);
    display: grid;
    padding: 4px;
    transition: color 150ms;
  }

  header a:hover {
    color: var(--brand);
  }

  .board {
    grid-area: board;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: calc(var(--gap) / 2);
  }

  .line {
    flex: 1 1 auto;
    min-height: 0;
    max-height: min(76vw + 40px, 520px);
    display: flex;
    gap: clamp(8px, 2.2vmin, 18px);
    padding: 18px 14px 22px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: #555 transparent;
    border-radius: 18px;
    background: #ffffff08;
    touch-action: pan-x;
  }

  .line.choosing {
    cursor: pointer;
  }

  .slot {
    flex: none;
    height: 100%;
    aspect-ratio: 5 / 8;
    border-radius: 7%;
  }

  .slot.is-pending {
    cursor: grab;
    touch-action: none;
  }

  .slot.lifted {
    outline: 2px dashed var(--accent);
    outline-offset: 4px;
  }

  .slot.lifted :global(.face) {
    opacity: 0;
  }

  .hand {
    grid-area: hand;
    display: flex;
    gap: var(--gap);
    height: clamp(130px, 29dvh, 300px);
  }

  .deck {
    flex: none;
    height: 100%;
    aspect-ratio: 5 / 8;
    border-radius: 7%;
    padding: 0;
    outline: 2px dashed #ffffff22;
    outline-offset: 4px;
  }

  .slot.resting {
    opacity: 0.5;
    transform: scale(0.94);
    transition:
      opacity 300ms,
      transform 300ms;
  }

  .controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(var(--gap) * 0.8);
    min-width: 0;
  }

  button {
    min-height: 52px;
    border-radius: 14px;
    border: 2px solid transparent;
    font-size: clamp(1rem, 3.2vmin, 1.25rem);
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    touch-action: manipulation;
    transition:
      transform 120ms ease,
      background-color 200ms,
      opacity 200ms,
      box-shadow 200ms;
  }

  button:active:not(:disabled) {
    transform: scale(0.96);
  }

  button:disabled {
    background: transparent;
    border-color: #ffffff1f;
    color: #ffffff4d;
    box-shadow: none;
    cursor: default;
  }

  button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }

  .primary {
    background: var(--accent);
    color: #1d1400;
    box-shadow: 0 6px 18px #ff9f1c33;
  }

  .secondary {
    background: transparent;
    color: var(--text);
    border-color: #ffffff40;
  }

  .secondary:not(:disabled):hover {
    border-color: var(--text);
  }

  .drag-ghost {
    position: fixed;
    z-index: 10;
    pointer-events: none;
  }

  /* Landscape: hand on the left, line fills the rest. */
  @media (min-aspect-ratio: 5 / 4) {
    .app {
      grid-template:
        "header board" auto
        "hand board" 1fr / auto minmax(0, 1fr);
    }

    .hand {
      flex-direction: column;
      height: auto;
      min-height: 0;
      width: clamp(120px, 20vw, 220px);
    }

    .deck {
      flex: 1 1 0;
      min-height: 0;
      max-height: 340px;
      height: auto;
      width: auto;
      max-width: 100%;
      align-self: center;
    }

    .controls {
      flex: none;
      justify-content: flex-end;
    }

    .board {
      justify-content: center;
    }

    .line {
      max-height: min(100%, 420px);
    }
  }
</style>
