import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let added;
let shown;
let storage;
let cookie;

async function loadAds() {
  vi.resetModules();
  return import("./ads.js");
}

const tick = () => new Promise((resolve) => setTimeout(resolve));
// Stands in for a box in the page; `isConnected` flips when it is removed.
const box = () => ({ isConnected: true });

beforeEach(() => {
  added = [];
  storage = {};
  cookie = "";
  shown = [];
  // Record script tags instead of fetching them.
  vi.stubGlobal("localStorage", { getItem: (key) => storage[key] ?? null });
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
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

describe("loadForBuyer", () => {
  it("loads nothing for a visitor without an ad-free token", async () => {
    const { loadForBuyer } = await loadAds();
    loadForBuyer();
    expect(added).toHaveLength(0);
  });

  it("loads the loader at startup when localStorage holds a token, and showAd reuses it", async () => {
    storage["ihtfy-ad-free"] = "x.y.z";
    const { loadForBuyer, showAd } = await loadAds();
    loadForBuyer();
    expect(added).toHaveLength(1);
    expect(added[0].src).toBe("https://ihtfy.com/ads/v1.js");
    showAd(box(), "a");
    expect(added).toHaveLength(1);
  });

  it("loads the loader at startup when only the cookie holds a token", async () => {
    cookie = "a=1; ihtfy-ad-free=x.y.z";
    const { loadForBuyer } = await loadAds();
    loadForBuyer();
    expect(added).toHaveLength(1);
  });

  it("still starts when the cookie cannot be read", async () => {
    Object.defineProperty(document, "cookie", {
      get() {
        throw new Error("SecurityError");
      },
    });
    const { loadForBuyer } = await loadAds();
    expect(() => loadForBuyer()).not.toThrow();
    expect(added).toHaveLength(0);
  });
});
