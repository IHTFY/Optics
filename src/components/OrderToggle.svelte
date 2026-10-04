<script>
  let { sorted = false, onchange, disabled = false } = $props();
  let position = $state(null);
  let pointer = null;
  let moved = false;
  let suppressClick = false;
  const value = $derived(position ?? (sorted ? 1 : 0));

  function start(event) {
    if (disabled || event.button > 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer = { id: event.pointerId, x: event.clientX, width: (rect.width - 8) / 2, initial: sorted ? 1 : 0 };
    moved = false;
  }

  function move(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const delta = event.clientX - pointer.x;
    if (!moved && Math.abs(delta) > 4) {
      moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (moved) position = Math.max(0, Math.min(1, pointer.initial + delta / pointer.width));
  }

  function finish(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (moved && event.type !== 'pointercancel') onchange(value >= 0.5);
    suppressClick = moved;
    setTimeout(() => suppressClick = false, 0);
    position = null;
    pointer = null;
  }

  function choose(next) {
    if (!suppressClick && !disabled) onchange(next);
  }
</script>

<div class="toggle" class:sliding={position !== null} role="group" aria-label="Line order"
  style:--position={value} onpointerdown={start} onpointermove={move}
  onpointerup={finish} onpointercancel={finish}
  onlostpointercapture={(event) => event.target === event.currentTarget && finish(event)}>
  <span class="thumb" aria-hidden="true"></span>
  <button {disabled} aria-pressed={!sorted} onclick={() => choose(false)}>Played</button>
  <button {disabled} aria-pressed={sorted} onclick={() => choose(true)}>Sorted</button>
</div>

<style>
  .toggle {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    touch-action: pan-y;
    user-select: none;
  }
  .thumb {
    position: absolute;
    inset: 4px auto 4px 4px;
    width: calc((100% - 8px) / 2);
    border-radius: 10px;
    background: var(--accent);
    box-shadow: 0 2px 8px #0003;
    transform: translateX(calc(var(--position) * 100%));
    transition: transform 380ms cubic-bezier(0.22, 1.15, 0.36, 1);
  }
  .sliding .thumb { transition: none; }
  button {
    position: relative;
    min-height: 40px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    touch-action: pan-y;
    transition: color 180ms;
  }
  button[aria-pressed="true"] { color: var(--on-accent); }
  button:focus-visible { outline: 2px solid var(--text); outline-offset: 1px; }
  button:disabled { cursor: default; }
  @media (prefers-reduced-motion: reduce) {
    .thumb, button { transition: none; }
  }
</style>
