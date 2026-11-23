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
        <rect x="6" y="8.5" width="126" height="5" fill={fill} />
        <polygon points="131,1 145,11 131,21" fill={fill} />
        {@render card(5, 30, 0.15)}
        {@render card(55, 30, 0.4)}
        {@render card(105, 30, 0.75)}
      </svg>
      <div>
        <h3>Least to most</h3>
        <p>Order the cards by the arrow's color, from least to most.</p>
      </div>
    </li>
    <li>
      <svg viewBox="0 0 150 100" aria-hidden="true">
        {@render card(5, 30, 0.2)}
        <rect x="55" y="30" width="40" height="64" rx="5" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" />
        {@render card(105, 30, 0.7)}
        <g class="float">{@render card(55, 20, 0.45, -8)}</g>
      </svg>
      <div>
        <h3>Place</h3>
        <p>Drag the new card into the line, or tap a spot. Then <b>Place</b>.</p>
      </div>
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
      <div>
        <h3>Challenge</h3>
        <p><b>Challenge</b> to reveal the exact amounts. The arrow graphs them; each drop, marked <span class="x">✕</span>, is a pair in the wrong order.</p>
      </div>
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
    <a href="https://ihtfy.com/projects/" target="_blank" rel="noopener">More games</a>
    <a href="https://ihtfy.com/privacy/" target="_blank" rel="noopener">Privacy</a>
  </div>
</dialog>

<style>
  dialog {
    width: min(400px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 18px 20px 18px;
    border: 3px solid var(--card-paper);
    border-radius: 16px;
    background: var(--panel);
    color: var(--text);
    box-shadow: 0 24px 60px #000a;
    overflow-y: auto;
  }

  dialog[open] {
    animation: open 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }

  /* The print bed, with printed rainbows in two corners in the card colors (a backdrop sees no page variables in older browsers). Opaque, so nothing behind needs blurring. */
  dialog::backdrop {
    --arc: min(30vw, 30vh, 220px);
    background:
      radial-gradient(
          circle at 100% 0,
          #f31e28 0 calc(var(--arc) * 0.42),
          #fbc002 0 calc(var(--arc) * 0.75),
          #03b7ce 0 var(--arc),
          transparent 0
        ),
      radial-gradient(
          circle at 0 100%,
          #f31e28 0 calc(var(--arc) * 0.42),
          #fbc002 0 calc(var(--arc) * 0.75),
          #03b7ce 0 var(--arc),
          transparent 0
        ),
      #0e1011;
  }

  h2 {
    margin: 0 92px 14px 0;
    padding-bottom: 12px;
    border-bottom: 3px solid var(--card-paper);
    color: var(--text);
    font-family: var(--display);
    font-size: 1.9rem;
    font-weight: 400;
    line-height: 1.1;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .close {
    position: absolute;
    top: 16px;
    right: 18px;
    width: 44px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px solid var(--card-paper);
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }

  .close:hover {
    background: #ffffff14;
  }

  .close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.6;
    stroke-linecap: round;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    counter-reset: step;
  }

  li {
    display: grid;
    grid-template-columns: 104px 1fr;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    counter-increment: step;
  }

  li + li {
    border-top: 2px solid #fbf4e866;
  }

  li svg {
    width: 104px;
    display: block;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin: 0 0 4px;
    font-family: var(--display);
    font-size: 1.3rem;
    font-weight: 400;
    line-height: 1.2;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  h3::before {
    content: counter(step);
    flex: none;
    display: grid;
    place-items: center;
    width: 1.3em;
    height: 1.3em;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 0.9em;
  }

  p {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.4;
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
    margin-top: 4px;
    padding-top: 14px;
    border-top: 2px solid #fbf4e866;
    font-size: 0.8rem;
    color: var(--muted);
  }

  @media (hover: hover) and (pointer: fine) {
    .keys {
      display: flex;
    }
  }

  .support {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 14px 0 0;
  }

  .support a {
    padding: 8px 6px;
    border: 2px solid var(--card-paper);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--display);
    font-size: 1.05rem;
    letter-spacing: 0.03em;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
  }

  .support a:hover,
  .support a:focus-visible {
    background: #ffffff14;
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
