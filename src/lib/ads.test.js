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
    [588, "320x50"],
  ])("a 360 px wide, %i px tall screen gets a %s box", async (height, name) => {
    const { adSizeFor } = await loadAds();
    expect(adSizeFor(360, height).name).toBe(name);
  });

  it.each([
    [360, 587],
    [320, 480],
    [360, 300],
  ])("a %i×%i screen is too short for any box under the game, so it gets none", async (width, height) => {
    const { adSizeFor } = await loadAds();
    expect(adSizeFor(width, height)).toBeNull();
  });

  it("gives no box wider than the screen", async () => {
    const { adSizeFor } = await loadAds();
    // 318 px is narrower than both 320 px boxes, and 640 px is too short for the 300 px one.
    expect(adSizeFor(318, 640)).toBeNull();
    expect(adSizeFor(318, 800).name).toBe("300x250");
    expect(adSizeFor(299, 800)).toBeNull();
  });

  it("gives a phone on its side the smallest box only while the game keeps its landscape height", async () => {
    const { adSizeFor } = await loadAds();
    expect(adSizeFor(800, 412, { landscape: true }).name).toBe("320x50");
    expect(adSizeFor(568, 280, { landscape: true })).toBeNull();
    expect(adSizeFor(844, 390, { landscape: true })).toBeNull();
  });

  it("gives the 300x250 box beside the game on a wide window, whatever its height", async () => {
    const { AD_CHROME, AD_SIZES, adSizeFor } = await loadAds();
    expect(adSizeFor(1000, 400, { side: true, landscape: true })).toBe(AD_SIZES[0]);
    expect(adSizeFor(1280, 720, { side: true, landscape: true }).name).toBe("300x250");
    // It stands on its own column: label, links, and box fit the shortest window that uses it.
    expect(AD_CHROME + AD_SIZES[0].height).toBeLessThanOrEqual(400);
  });

  it("leaves the game its minimum height under any box it picks", async () => {
    const { AD_CHROME, MIN_GAME_HEIGHT, MIN_LANDSCAPE_GAME_HEIGHT, adSizeFor } = await loadAds();
    for (let height = 200; height <= 1200; height += 10) {
      const size = adSizeFor(360, height);
      if (size) expect(height - AD_CHROME - size.height).toBeGreaterThanOrEqual(MIN_GAME_HEIGHT);
      const turned = adSizeFor(900, height, { landscape: true });
      if (turned) expect(height - AD_CHROME - turned.height).toBeGreaterThanOrEqual(MIN_LANDSCAPE_GAME_HEIGHT);
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

describe("adFits", () => {
  it("keeps a box the window has room for and drops a taller one", async () => {
    const { AD_SIZES, adFits } = await loadAds();
    const [tall, middle, small] = AD_SIZES;
    // 750 px allows the 320x100 box.
    expect(adFits(tall, 360, 750)).toBe(false);
    expect(adFits(middle, 360, 750)).toBe(true);
    expect(adFits(small, 360, 750)).toBe(true);
    // 412 px (a phone turned on its side) allows only the smallest box.
    expect(adFits(tall, 800, 412, { landscape: true })).toBe(false);
    expect(adFits(middle, 800, 412, { landscape: true })).toBe(false);
    expect(adFits(small, 800, 412, { landscape: true })).toBe(true);
  });

  it("drops every box when the window has room for none", async () => {
    const { AD_SIZES, adFits } = await loadAds();
    for (const size of AD_SIZES) {
      expect(adFits(size, 568, 280, { landscape: true })).toBe(false);
      expect(adFits(size, 360, 480)).toBe(false);
    }
  });

  it("drops a box wider than the window", async () => {
    const { AD_SIZES, adFits } = await loadAds();
    const [tall, middle] = AD_SIZES;
    expect(adFits(middle, 318, 800)).toBe(false);
    expect(adFits(tall, 318, 800)).toBe(true);
  });

  it("keeps any box beside the game, where the window always gives the biggest", async () => {
    const { AD_SIZES, adFits } = await loadAds();
    for (const size of AD_SIZES) expect(adFits(size, 1000, 400, { side: true, landscape: true })).toBe(true);
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

  it("has the loader check the token when a later load succeeds after the startup load failed", async () => {
    storage["ihtfy-ad-free"] = "expired";
    const classes = new Set(["ad-free"]);
    document.documentElement = { classList: { remove: (name) => classes.delete(name) } };
    let checks = 0;
    window.ihtfyAds.adFree = async () => {
      checks++;
      return false;
    };
    const { loadForBuyer, showAd } = await loadAds();
    loadForBuyer();
    added[0].dispatch("error");
    await tick();
    expect(classes.has("ad-free")).toBe(true);

    const a = box();
    showAd(a, "a");
    added[1].dispatch("load");
    await tick();
    expect(checks).toBe(1);
    expect(classes.has("ad-free")).toBe(false);
    expect(shown).toEqual([[a, "a"]]);

    // Checked once: later results only ask for their ad.
    showAd(a, "b");
    await tick();
    expect(checks).toBe(1);
  });

  it("keeps the box hidden when the later check accepts the token", async () => {
    storage["ihtfy-ad-free"] = "x.y.z";
    const classes = new Set(["ad-free"]);
    document.documentElement = { classList: { remove: (name) => classes.delete(name) } };
    window.ihtfyAds.adFree = async () => true;
    const { loadForBuyer, showAd } = await loadAds();
    loadForBuyer();
    added[0].dispatch("error");
    await tick();
    showAd(box(), "a");
    added[1].dispatch("load");
    await tick();
    expect(classes.has("ad-free")).toBe(true);
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
