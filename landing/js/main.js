document.getElementById("year").textContent = String(new Date().getFullYear());

const header = document.querySelector(".site-header");
const onScroll = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// MOBILE MENU — deliberately tiny, no framework: a single [hidden] toggle
// on the nav panel (not a class) so the open/closed state is inspectable
// straight off the DOM, and the page degrades safely to "no menu" rather
// than "broken menu" if this script fails to load at all. Closes on: the
// toggle button itself, choosing a link inside the panel (so navigating
// never leaves the panel open behind the new scroll position), and Escape
// (returns focus to the toggle button, standard disclosure-widget behavior).
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.getElementById("mobile-nav");

if (menuToggle && mobileNav) {
  const setOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    mobileNav.hidden = !open;
  };

  menuToggle.addEventListener("click", () => {
    setOpen(mobileNav.hidden);
  });

  mobileNav.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement && e.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !mobileNav.hidden) {
      setOpen(false);
      menuToggle.focus();
    }
  });
}
