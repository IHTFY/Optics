import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

export default mount(App, { target: document.getElementById("app") });

// The worker skips waiting and claims clients, so an update takes effect on the
// next launch without reloading a round in progress. Installed PWAs are rarely
// reloaded, so re-check for a new worker whenever the app returns to the foreground.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    });
  });
}
