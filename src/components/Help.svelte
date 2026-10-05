<script>
  import { PALETTE } from "../lib/colors.js";

  let { color } = $props();

  let dialog = $state();

  export function open() {
    dialog.showModal();
  }

  const fill = $derived(PALETTE[color]);
  const others = $derived(Object.entries(PALETTE).filter(([c]) => c !== color && c !== "background"));
</script>

{#snippet card(x, y, amount, rotate = 0)}
  <g transform="translate({x} {y}) rotate({rotate} 20 32)">
    <rect width="40" height="64" rx="5" fill="var(--card-paper)" />
    <rect x="4" y="4" width="32" height="56" rx="2" fill={others[0][1]} />
    <rect x="4" y="4" width="32" height="18" rx="2" fill={others[1][1]} />
    <rect x="4" y={60 - 56 * amount} width="32" height={56 * amount} rx="2" fill={fill} />
  </g>
{/snippet}

{#snippet cross(x, y)}
  <g transform="translate({x} {y})">
    <circle r="10" fill="var(--bad)" stroke="var(--panel)" stroke-width="3" />
    <path d="M-4 -4l8 8M4 -4l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
  </g>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="help-title" onclick={(e) => e.target === dialog && dialog.close()}>
  <h2 id="help-title">How to play</h2>
  <button class="close" aria-label="Close" onclick={() => dialog.close()}>
    <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
  </button>

  <ol>
    <li>
      <svg viewBox="0 0 150 100" aria-hidden="true">
        <polygon points="6,11 132,5 132,17 6,13" fill={fill} />
        <polygon points="131,1 145,11 131,21" fill={fill} />
        {@render card(5, 30, 0.15)}
        {@render card(55, 30, 0.4)}
        {@render card(105, 30, 0.75)}
      </svg>
      <p>Order the cards by the arrow's color, from least to most.</p>
    </li>
    <li>
      <svg viewBox="0 0 150 100" aria-hidden="true">
        {@render card(5, 30, 0.2)}
        <rect x="55" y="30" width="40" height="64" rx="5" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" />
        {@render card(105, 30, 0.7)}
        <g class="float">{@render card(55, 20, 0.45, -8)}</g>
      </svg>
      <p>Drag the new card into the line, or tap a spot. Then <b>Place</b>.</p>
    </li>
    <li>
      <svg viewBox="0 0 150 100" aria-hidden="true">
        <polyline points="2,23 25,21 75,5 125,16 134,16" fill="none" stroke={fill} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        <polygon points="133,11 145,16 133,21" fill={fill} />
        {@render card(5, 30, 0.2)}
        {@render card(55, 36, 0.7, 5)}
        {@render card(105, 36, 0.35, -5)}
        {@render cross(100, 30)}
      </svg>
      <p><b>Challenge</b> to reveal the exact amounts. The arrow graphs them; each drop, marked <span class="x">✕</span>, is a pair in the wrong order.</p>
    </li>
  </ol>

  <div class="keys">
    <span><kbd>←</kbd><kbd>→</kbd> Move</span>
    <span><kbd>Enter</kbd> Place</span>
    <span><kbd>C</kbd> Challenge</span>
    <span><kbd>S</kbd> Sorted</span>
    <span><kbd>Esc</kbd> Take back</span>
  </div>

  <div class="support">
    <a href="https://ihtfy.com/support/" target="_blank" rel="noopener">Support ♥</a>
  </div>
</dialog>

<style>
  dialog {
    width: min(400px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 20px 20px 18px;
    border: 1px solid #ffffff14;
    border-radius: 22px;
    background: var(--panel);
    color: var(--text);
    box-shadow: 0 24px 60px #000a;
    overflow-y: auto;
  }

  dialog[open] {
    animation: open 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }

  dialog::backdrop {
    background: #0009;
    backdrop-filter: blur(3px);
  }

  h2 {
    margin: 0 44px 16px 0;
    color: var(--brand);
    font-size: 0.85rem;
    font-weight: 400;
    letter-spacing: 0.3em;
    text-transform: uppercase;
  }

  .close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .close:hover {
    color: var(--text);
    background: #ffffff10;
  }

  .close svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 14px;
    counter-reset: step;
  }

  li {
    display: grid;
    grid-template-columns: 112px 1fr;
    align-items: center;
    gap: 14px;
    counter-increment: step;
  }

  li svg {
    width: 112px;
    display: block;
    padding: 6px;
    border-radius: 14px;
    background: var(--surface);
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  p::before {
    content: counter(step);
    display: inline-grid;
    place-items: center;
    width: 1.4em;
    height: 1.4em;
    margin-right: 0.45em;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 0.8em;
    font-weight: 700;
    vertical-align: 0.1em;
  }

  b {
    color: var(--accent);
    font-weight: 600;
  }

  .x {
    color: var(--bad);
    font-weight: 700;
  }

  .float {
    animation: float 2.4s ease-in-out infinite;
  }

  .keys {
    display: none;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #ffffff14;
    font-size: 0.8rem;
    color: var(--muted);
  }

  @media (hover: hover) and (pointer: fine) {
    .keys {
      display: flex;
    }
  }

  .support {
    margin: 14px 0 0;
    text-align: center;
    font-size: 0.8rem;
  }

  .support a {
    color: var(--muted);
  }

  .support a:hover,
  .support a:focus-visible {
    color: var(--text);
  }

  kbd {
    display: inline-block;
    min-width: 1.7em;
    margin-right: 3px;
    padding: 1px 5px;
    border: 1px solid #ffffff2a;
    border-bottom-width: 2px;
    border-radius: 5px;
    background: #ffffff0a;
    color: var(--text);
    font: inherit;
    text-align: center;
  }

  @keyframes open {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open],
    .float {
      animation: none;
    }
  }
</style>
