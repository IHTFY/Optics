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

/** Space the ad's aside takes besides the box: Privacy link, label, and the 50px clearances. */
export const AD_CHROME = 88;

/** The least height the board, cards, and Next round button need to stay readable. */
export const MIN_GAME_HEIGHT = 450;

/**
 * Whether the results ad is on the page in `phase`, given whether it was just before.
 * Only the results screen carries one, never the play screen, where a phone is mid-game.
 * It stays through "loading" so the page doesn't resize while the next round's cards arrive.
 */
export const showsAd = (phase, was = false) => phase === "reveal" || (phase === "loading" && was);

/** Windows where the ad stands to the right of the game instead of below it (App.svelte's CSS repeats this query). */
export const SIDE_LAYOUT = "(min-aspect-ratio: 5/4) and (min-width: 1000px) and (min-height: 400px)";

/**
 * The tallest box that leaves the game its room in a viewport `viewportHeight` px high.
 * Beside the game, the full height is the game's, and the biggest box fits the least height there is.
 */
export const adSizeFor = (viewportHeight, side = false) =>
  side
    ? AD_SIZES[0]
    : (AD_SIZES.find((size) => viewportHeight - AD_CHROME - size.height >= MIN_GAME_HEIGHT) ?? AD_SIZES.at(-1));

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
  if (found) load().catch(() => {});
}

/** Fills `box` with an ad for the game over named `key`; offline or on failure it stays empty. */
export function showAd(box, key) {
  if (!navigator.onLine) return;
  load().then(
    () => box.isConnected && window.ihtfyAds.show(box, key),
    () => {},
  );
}
