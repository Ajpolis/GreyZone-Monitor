// Phone menu button, shared by every page.
(() => {
  const button = document.querySelector(".menu-button");
  const nav = document.getElementById("site-nav");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
})();
