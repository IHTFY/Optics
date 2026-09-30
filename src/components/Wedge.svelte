<script>
  import { PALETTE } from "../lib/colors.js";

  // Narrow on the left, wide on the right: less of the target color to more.
  let { color, result = null, delay = 0 } = $props();
</script>

<div class="wedge" aria-label="Order by {color}, least to most" role="img">
  <svg viewBox="0 0 1000 60" preserveAspectRatio="none">
    <polygon points="0,29 1000,4 1000,56 0,31" style:fill={PALETTE[color]} />
  </svg>
  <svg class="tip" viewBox="0 0 60 60">
    <polygon points="0,0 60,30 0,60" style:fill={PALETTE[color]} />
  </svg>
  {#key result}
    {#if result}
      <span class="verdict" class:bad={!result.correct} style:animation-delay="{delay}ms">
        {#if result.correct}
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        {:else}
          <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
        {/if}
      </span>
    {/if}
  {/key}
</div>

<style>
  .wedge {
    position: relative;
    display: flex;
    align-items: center;
    height: clamp(22px, 5vmin, 40px);
  }

  svg {
    display: block;
    height: 100%;
  }

  svg:first-child {
    flex: 1;
    min-width: 0;
  }

  .tip {
    flex: none;
    aspect-ratio: 1;
    width: auto;
    margin-left: -1px;
  }

  polygon {
    transition: fill 450ms ease;
  }

  .verdict {
    position: absolute;
    right: 50%;
    top: 50%;
    width: clamp(34px, 8vmin, 56px);
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--good);
    box-shadow:
      0 0 0 4px var(--bg),
      0 6px 18px #0008;
    transform: translate(50%, -50%);
    animation: pop 480ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }

  .verdict.bad {
    background: var(--bad);
  }

  .verdict svg {
    width: 62%;
    height: 62%;
    fill: none;
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @keyframes pop {
    from {
      transform: translate(50%, -50%) scale(0);
    }
    to {
      transform: translate(50%, -50%) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .verdict {
      animation: none;
    }
  }
</style>
