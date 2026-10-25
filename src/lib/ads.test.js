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

describe("showsAd", () => {
  it("is true on the results screen", async () => {
    const { showsAd } = await loadAds();
    expect(showsAd("reveal")).toBe(true);
    expect(showsAd("reveal", true)).toBe(true);
  });

  it("is never true on the play screen, even right after results", async () => {
    const { showsAd } = await loadAds();
    expect(showsAd("play")).toBe(false);
    expect(showsAd("play", true)).toBe(false);
    expect(showsAd(undefined, true)).toBe(false);
  });

  it("holds through loading only when results were showing, so startup has no ad", async () => {
    const { showsAd } = await loadAds();
    expect(showsAd("loading", true)).toBe(true);
    expect(showsAd("loading", false)).toBe(false);
  });
});

describe("adSizeFor", () => {
  it.each([
    [800, "300x250"],
    [915, "300x250"],
    [750, "320x100"],
    [640, "320x100"],
    [480, "320x50"],
    [300, "320x50"],
  ])("a %i px tall screen gets a %s box", async (height, name) => {
    const { adSizeFor } = await loadAds();
    expect(adSizeFor(height).name).toBe(name);
  });

  it("gives the 300x250 box beside the game on a wide window, whatever its height", async () => {
    const { AD_CHROME, AD_SIZES, adSizeFor } = await loadAds();
    expect(adSizeFor(400, true)).toBe(AD_SIZES[0]);
    expect(adSizeFor(720, true).name).toBe("300x250");
    // It stands on its own column: label, links, and box fit the shortest window that uses it.
    expect(AD_CHROME + AD_SIZES[0].height).toBeLessThanOrEqual(400);
  });

  it("leaves the game its minimum height under the largest box that fits", async () => {
    const { AD_CHROME, MIN_GAME_HEIGHT, adSizeFor } = await loadAds();
    for (let height = 600; height <= 1200; height += 10) {
      const size = adSizeFor(height);
      expect(height - AD_CHROME - size.height).toBeGreaterThanOrEqual(MIN_GAME_HEIGHT);
    }
  });

  it("only picks sizes the shared loader accepts", async () => {
    const { AD_SIZES } = await loadAds();
    const accepted = ["300x250", "320x50", "320x100", "160x600", "300x600", "728x90"];
    for (const size of AD_SIZES) {
      expect(accepted).toContain(size.name);
      expect(size.name).toBe(`${size.width}x${size.height}`);
    }
  });
});

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
