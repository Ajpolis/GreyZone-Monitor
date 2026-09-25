// Applies the visitor's saved light/dark choice before the page is drawn,
// so it never flashes in the wrong theme. Loaded in <head> on every page.
(() => {
  try {
    const saved = localStorage.getItem("gz-theme");
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch {
    // Storage blocked (for example a private window): follow the device setting.
  }
})();
