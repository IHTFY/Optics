// The ad under the revealed line comes from the shared IHTFY loader, which
// ihtfy.com serves for all the games (its source is in the IHTFY/com.ihtfy
// repo). Nothing ad-related loads before the first challenge: the loader
// arrives then, and AdSense after it at browser idle. A visitor who may have
// bought ad-free gets the loader at startup instead (loadForBuyer), so it can
// hide the ad before it shows.
const LOADER = import.meta.env.VITE_ADS_LOADER || "https://ihtfy.com/ads/v1.js";

// The shared 300×250 display unit for the games' result screens.
export const AD_SLOT = "6470163205";

/** Boxes the results screen may use, tallest first, as `data-ad-size` and pixels. */
export const AD_SIZES = [
  { name: "300x250", width: 300, height: 250 },
  { name: "320x100", width: 320, height: 100 },
  { name: "320x50", width: 320, height: 50 },
];

/** Space the ad's aside takes besides the box: Privacy link, label, the 50px clearances, and AD_PAD under the box. */
export const AD_CHROME = 88;

/** The padding under the box. A phone's bottom safe area (`--safe-bottom` in app.css) replaces it when larger. */
export const AD_PAD = 12;

/** The least height the board, cards, and Next round button need to stay readable. */
export const MIN_GAME_HEIGHT = 450;

/** The same in landscape, where the hand stands beside the line instead of under it: the cards come out as large as at the portrait minimum. */
export const MIN_LANDSCAPE_GAME_HEIGHT = 270;

/**
 * Whether the results ad is on the page in `phase`, given whether it was just before.
 * Only the results screen carries one, never the play screen, where a phone is mid-game.
 * It stays through "loading" so the page doesn't resize while the next round's cards arrive.
 */
export const showsAd = (phase, was = false) => phase === "reveal" || (phase === "loading" && was);

/** Windows where the ad stands to the right of the game instead of below it (App.svelte's CSS repeats this query). */
export const SIDE_LAYOUT = "(min-aspect-ratio: 5/4) and (min-width: 1000px) and (min-height: 400px)";

/** Windows where the hand stands beside the line (App.svelte's CSS repeats this query). */
export const LANDSCAPE_LAYOUT = "(min-aspect-ratio: 5/4)";

/**
 * Whether `size` has room in a viewport: no wider than the page, and the game keeps its least height above it.
 * `inset` is the bottom safe area in px. Beside the game, the full height is the game's, and the biggest box fits the least window that layout has.
 */
export const adFits = (size, { width, height, side = false, landscape = false, inset = 0 }) =>
  side ||
  (width >= size.width &&
    height - AD_CHROME - Math.max(0, inset - AD_PAD) - size.height >= (landscape ? MIN_LANDSCAPE_GAME_HEIGHT : MIN_GAME_HEIGHT));

/** The tallest box with room in the viewport, or null when none has: that results screen carries no ad. */
export const adSizeFor = (viewport) => AD_SIZES.find((size) => adFits(size, viewport)) ?? null;

let loader = null;

const load = () =>
  (loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = LOADER;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () => {
      script.remove();
      loader = null;
      reject(new Error("The ad loader did not load"));
    });
    document.head.appendChild(script);
  }));

// Set while the head script in index.html hides the box for a token the loader has yet to check.
let unchecked = false;

/** Has the loader, now on the page, check the token; one it rejects gets the box back. */
async function checkToken() {
  if (!unchecked) return;
  unchecked = false;
  try {
    if (!(await window.ihtfyAds.adFree())) document.documentElement.classList.remove("ad-free");
  } catch {
    // A check that fails leaves the box hidden, as the head script set it.
  }
}

/** Loads the loader now if this browser holds an ad-free token; the loader checks it. */
export function loadForBuyer() {
  let found = false;
  try {
    found = !!localStorage.getItem("ihtfy-ad-free");
  } catch {
    // Storage off: the cookie may still hold the token.
  }
  try {
    found ||= /(?:^|;\s*)ihtfy-ad-free=/.test(document.cookie);
  } catch {
    // A sandboxed frame may not read cookies.
  }
  if (!found) return;
  unchecked = true;
  // If this load fails, the token is checked when a later one succeeds (showAd).
  load().then(checkToken, () => {});
}

/** Fills `box` with an ad for the game over named `key`; offline or on failure it stays empty. */
export function showAd(box, key) {
  if (!navigator.onLine) return;
  load().then(
    () => {
      checkToken();
      if (box.isConnected) window.ihtfyAds.show(box, key);
    },
    () => {},
  );
}
