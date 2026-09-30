<script>
  import { fly } from "svelte/transition";
  import { backOut } from "svelte/easing";
  import { COLORS, formatPercent } from "../lib/card.js";
  import { PALETTE } from "../lib/colors.js";
  import { ms } from "../lib/motion.js";

  let { card, target, pending = false, reveal = false, verdict = null, order = 0, ghost = false } =
    $props();

  const others = $derived(COLORS.filter((c) => c !== target));
</script>

<div class="card">
<div
  class="face"
  class:pending
  class:ghost
  class:good={verdict === "good"}
  class:bad={verdict === "bad"}
  style:--order={order}
>
  <img src={card.src} alt="" draggable="false" />
  {#if reveal}
    <div class="stats" in:fly={{ y: 24, duration: ms(380), delay: ms(order * 90), easing: backOut }}>
      <div class="main">
        <i style:background={PALETTE[target]}></i>{formatPercent(card.counts[target])}
      </div>
      <div class="others">
        {#each others as color}
          <span><i style:background={PALETTE[color]}></i>{formatPercent(card.counts[color])}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>
</div>

<style>
  .card {
    container-type: inline-size;
    width: 100%;
    height: 100%;
  }

  .face {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 7cqi;
    overflow: hidden;
    background: #f3efe6;
    box-shadow:
      0 0 0 3cqi #f3efe6,
      0 4px 14px #0006;
    transition:
      transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1.3),
      box-shadow 220ms ease,
      outline-color 220ms ease;
    outline: 3px solid transparent;
    outline-offset: 3px;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .pending {
    outline-color: var(--accent);
    transform: translateY(-3%);
    box-shadow:
      0 0 0 3cqi #f3efe6,
      0 10px 24px #000a;
  }

  .ghost {
    transform: rotate(var(--tilt, 0deg)) scale(1.06);
    box-shadow:
      0 0 0 3cqi #f3efe6,
      0 18px 36px #000c;
    outline-color: var(--accent);
    transition: none;
  }

  .good {
    outline-color: var(--good);
    animation: bump 420ms calc(var(--order) * 90ms + 300ms) both;
  }

  .bad {
    outline-color: var(--bad);
    animation: shake 480ms calc(var(--order) * 90ms + 300ms) both;
  }

  .stats {
    position: absolute;
    inset: auto 0 0 0;
    padding: 5cqi 4cqi 6cqi;
    background: #16171bdd;
    backdrop-filter: blur(4px);
    color: #fff;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .main {
    font-size: 17cqi;
    font-weight: 700;
    line-height: 1.1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3cqi;
  }

  .main i {
    width: 10cqi;
    height: 10cqi;
  }

  .others {
    display: flex;
    justify-content: center;
    gap: 4cqi;
    margin-top: 2cqi;
    font-size: 7cqi;
    white-space: nowrap;
    opacity: 0.85;
  }

  .others span {
    display: inline-flex;
    align-items: center;
    gap: 1.5cqi;
  }

  i {
    display: inline-block;
    width: 5cqi;
    height: 5cqi;
    border-radius: 50%;
    box-shadow: 0 0 0 0.6cqi #fff8;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20%,
    60% {
      transform: translateX(-5%);
    }
    40%,
    80% {
      transform: translateX(5%);
    }
  }

  @keyframes bump {
    0%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .face {
      transition: none;
      animation: none;
    }
  }
</style>
