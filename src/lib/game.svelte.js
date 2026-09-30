import { COLORS, createCard } from "./card.js";
import { checkLine } from "./order.js";

const PREFETCH = 3;

export class Game {
  target = $state(COLORS[0]);
  /** Committed cards, left (least) to right (most). */
  line = $state.raw([]);
  /** The card waiting to be placed. */
  pending = $state.raw(null);
  /** Where the pending card sits in the line, or null while it is in the deck. */
  slot = $state(null);
  /** "loading" | "play" | "reveal" */
  phase = $state("loading");
  result = $state.raw(null);

  #queue = [];

  /** The line as displayed, including the pending card when it has a slot. */
  row = $derived.by(() => {
    const row = this.line.map((card) => ({ card, pending: false }));
    if (this.pending && this.slot !== null) {
      row.splice(this.slot, 0, { card: this.pending, pending: true });
    }
    return row;
  });

  canPlace = $derived(this.phase === "play" && this.pending !== null && this.slot !== null);
  canChallenge = $derived(this.phase === "play" && this.line.length >= 2);

  #draw() {
    while (this.#queue.length < PREFETCH + 1) this.#queue.push(createCard());
    return this.#queue.shift();
  }

  async newRound() {
    const discarded = [...this.line, this.pending].filter(Boolean);
    const others = COLORS.filter((c) => c !== this.target || this.phase === "loading");

    this.phase = "loading";
    this.result = null;
    this.slot = null;
    this.line = [];
    this.pending = null;

    const [first, next] = await Promise.all([this.#draw(), this.#draw()]);
    this.target = others[Math.floor(Math.random() * others.length)];
    this.line = [first];
    this.pending = next;
    this.phase = "play";

    // Let exit animations finish before freeing the images.
    setTimeout(() => discarded.forEach(release), 2000);
  }

  moveTo(slot) {
    if (this.phase !== "play" || !this.pending) return;
    this.slot = slot === null ? null : Math.max(0, Math.min(slot, this.line.length));
  }

  step(direction) {
    if (this.phase !== "play" || !this.pending) return;
    if (this.slot === null) {
      this.slot = direction > 0 ? 0 : this.line.length;
    } else {
      this.moveTo(this.slot + direction);
    }
  }

  async place() {
    if (!this.canPlace) return;
    const line = [...this.line];
    line.splice(this.slot, 0, this.pending);
    this.line = line;
    this.pending = null;
    this.slot = null;
    const next = await this.#draw();
    if (this.phase === "play") this.pending = next;
  }

  challenge() {
    if (!this.canChallenge) return;
    this.slot = null;
    this.result = checkLine(this.line.map((card) => card.counts[this.target]));
    this.phase = "reveal";
  }
}

function release(card) {
  if (card.src.startsWith("blob:")) URL.revokeObjectURL(card.src);
}
