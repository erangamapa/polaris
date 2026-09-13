document.getElementById("year").textContent = String(new Date().getFullYear());

const header = document.querySelector(".site-header");
const onScroll = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Mobile menu: [hidden] is the real open/closed state (a11y + no-JS
// fallback); .is-open drives the grid-rows transition in CSS. Closing
// waits for that transition before re-adding [hidden] so nothing is
// tab-reachable mid-animation.
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.getElementById("mobile-nav");
const mobileNavInner = mobileNav?.querySelector(".mobile-nav__inner");

if (menuToggle && mobileNav && mobileNavInner) {
  const getFocusable = () => Array.from(mobileNavInner.querySelectorAll("a[href], button:not([disabled])"));

  const setOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("mobile-nav-open", open);
    if (open) {
      mobileNav.hidden = false;
      void mobileNav.offsetHeight; // force layout before adding .is-open
      mobileNav.classList.add("is-open");
      getFocusable()[0]?.focus();
    } else {
      mobileNav.classList.remove("is-open");
      const done = (e) => {
        if (e.target !== mobileNav || e.propertyName !== "grid-template-rows") return;
        mobileNav.removeEventListener("transitionend", done);
        mobileNav.hidden = true;
      };
      mobileNav.addEventListener("transitionend", done);
      setTimeout(() => { mobileNav.removeEventListener("transitionend", done); mobileNav.hidden = true; }, 250);
    }
  };

  menuToggle.addEventListener("click", () => setOpen(mobileNav.hidden));
  mobileNav.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement && e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (mobileNav.hidden) return;
    if (e.key === "Escape") { setOpen(false); menuToggle.focus(); return; }
    if (e.key === "Tab") {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

// Scroll-spy: mark the nav link(s) matching the section closest to the
// viewport center with aria-current; scoped to .nav/.mobile-nav so it
// never touches the hero CTA sharing an href with a nav link.
const spySections = ["#play", "#originals", "#faq"].map((id) => document.querySelector(id)).filter(Boolean);
if (spySections.length) {
  const linksFor = (id) => document.querySelectorAll(`.nav a[href="${id}"], .mobile-nav a[href="${id}"]`);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;
      const top = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
      document.querySelectorAll('.nav a[aria-current="true"], .mobile-nav a[aria-current="true"]').forEach((a) => a.removeAttribute("aria-current"));
      linksFor(`#${top.target.id}`).forEach((a) => a.setAttribute("aria-current", "true"));
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  spySections.forEach((s) => observer.observe(s));
}

// FAQ: animate open/close via grid-rows on .faq-item__body instead of the
// native instant show/hide. <summary>'s activation behavior fires a real
// click for both mouse and keyboard, so one listener covers both.
document.querySelectorAll(".faq details").forEach((details) => {
  const summary = details.querySelector("summary");
  const body = details.querySelector(".faq-item__body");
  if (!summary || !body) return;

  summary.addEventListener("click", (e) => {
    e.preventDefault();
    if (details.hasAttribute("data-animating")) return;
    details.setAttribute("data-animating", "");
    const closing = details.open; // capture before any state change below

    const finish = () => {
      body.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
      details.removeAttribute("data-animating");
      if (closing) { details.open = false; body.style.gridTemplateRows = ""; }
    };
    const onEnd = (ev) => { if (ev.propertyName === "grid-template-rows") finish(); };
    body.addEventListener("transitionend", onEnd);
    const fallback = setTimeout(finish, 260); // covers prefers-reduced-motion, where transitionend never fires

    if (closing) {
      body.style.gridTemplateRows = "1fr";
      requestAnimationFrame(() => requestAnimationFrame(() => { body.style.gridTemplateRows = "0fr"; }));
    } else {
      details.open = true;
      body.style.gridTemplateRows = "0fr";
      requestAnimationFrame(() => requestAnimationFrame(() => { body.style.gridTemplateRows = "1fr"; }));
    }
  });
});
