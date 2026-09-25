// Header controls, shared by every page: the phone menu and the light/dark switch.
(() => {
  const button = document.querySelector(".menu-button");
  const nav = document.getElementById("site-nav");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });

  // Until the visitor chooses, the theme follows the device setting.
  const root = document.documentElement;
  const deviceDark = window.matchMedia("(prefers-color-scheme: dark)");
  const toggle = document.querySelector(".theme-toggle");
  const MOON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const SUN = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const current = () => root.dataset.theme || (deviceDark.matches ? "dark" : "light");

  // The button names the theme it switches to.
  function label() {
    const next = current() === "dark" ? "light" : "dark";
    toggle.innerHTML = `${next === "dark" ? MOON : SUN}<span>${next === "dark" ? "Dark" : "Light"}</span>`;
    toggle.setAttribute("aria-label", `Switch to ${next} mode`);
  }

  toggle.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("gz-theme", next); } catch { /* choice lasts for this page only */ }
    label();
  });
  deviceDark.addEventListener("change", label);
  label();
})();
