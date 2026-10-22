import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let added;
let shown;

async function loadAds() {
  vi.resetModules();
  return import("./ads.js");
}

const tick = () => new Promise((resolve) => setTimeout(resolve));
// Stands in for a box in the page; `isConnected` flips when it is removed.
const box = () => ({ isConnected: true });

beforeEach(() => {
  added = [];
  shown = [];
  // Record script tags instead of fetching them.
  vi.stubGlobal("document", {
    createElement: () => {
      const listeners = {};
      return {
        addEventListener: (name, fn) => (listeners[name] = fn),
        dispatch: (name) => listeners[name](),
        remove() {},
      };
    },
    head: { appendChild: (el) => added.push(el) },
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("window", { ihtfyAds: { show: (b, key) => shown.push([b, key]) } });
});

afterEach(() => vi.unstubAllGlobals());

describe("showAd", () => {
  it("loads the shared loader once, then hands it each box", async () => {
    const { showAd } = await loadAds();
    const a = box();
    showAd(a, "a");
    showAd(a, "b");
    expect(added).toHaveLength(1);
    expect(added[0].src).toBe("https://ihtfy.com/ads/v1.js");
    added[0].dispatch("load");
    await tick();
    expect(shown).toEqual([
      [a, "a"],
      [a, "b"],
    ]);
  });

  it("skips a box that left the page before the loader arrived", async () => {
    const { showAd } = await loadAds();
    const gone = box();
    const back = box();
    showAd(gone, "a");
    gone.isConnected = false;
    showAd(back, "a");
    added[0].dispatch("load");
    await tick();
    expect(shown).toEqual([[back, "a"]]);
  });

  it("loads nothing offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { showAd } = await loadAds();
    showAd(box(), "a");
    expect(added).toHaveLength(0);
  });

  it("stays quiet when the loader fails, and tries again on the next game over", async () => {
    const { showAd } = await loadAds();
    showAd(box(), "a");
    added[0].dispatch("error");
    await tick();
    expect(shown).toEqual([]);
    showAd(box(), "b");
    expect(added).toHaveLength(2);
  });
});
