// The ad under the revealed line comes from the shared IHTFY loader, which
// ihtfy.com serves for all the games (its source is in the IHTFY/com.ihtfy
// repo). Nothing ad-related loads before the first challenge: the loader
// arrives then, and AdSense after it at browser idle. A visitor who may have
// bought ad-free gets the loader at startup instead (loadForBuyer), so it can
// hide the ad before it shows.
const LOADER = import.meta.env.VITE_ADS_LOADER || "https://ihtfy.com/ads/v1.js";

// The shared 300×250 display unit for the games' result screens.
export const AD_SLOT = "6470163205";

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
