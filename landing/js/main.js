document.getElementById("year").textContent = String(new Date().getFullYear());

const header = document.querySelector(".site-header");
const onScroll = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// MOBILE MENU — deliberately tiny, no framework. `[hidden]` stays the real
// source of truth for "not in the layout or a11y tree" (a screen reader or
// Tab press should never reach a visually-collapsed panel); the open/close
// motion is a separate `.is-open` class driving the `grid-template-rows:
// 0fr -> 1fr` transition in styles.css. That split is why opening and
// closing aren't just a mirrored toggle:
//   OPEN:  remove [hidden] first (mounts it, starts at the CSS's resting
//          0fr row) -> next frame add .is-open (now there's a rendered
//          "before" state for the transition to animate from) -> move
//          focus into the panel.
//   CLOSE: remove .is-open (starts the 1fr -> 0fr transition) -> wait for
//          that transition to actually finish -> THEN set [hidden] (so
//          nothing is tab-reachable mid-animation, and so an instant
//          second close doesn't leave [hidden] applied before the CSS
//          transition has anywhere to animate from under
//          prefers-reduced-motion, where the transition is instant anyway
//          and `transitionend` still fires).
// Escape-to-close (returns focus to the toggle) and click-a-link-to-close
// both still work, unchanged in spirit from before this pass.
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.getElementById("mobile-nav");
const mobileNavInner = mobileNav?.querySelector(".mobile-nav__inner");

if (menuToggle && mobileNav && mobileNavInner) {
  const getFocusable = () =>
    Array.from(mobileNavInner.querySelectorAll('a[href], button:not([disabled])'));

  const setOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("mobile-nav-open", open);

    if (open) {
      mobileNav.hidden = false;
      // Force layout so the browser commits the 0fr resting state before
      // .is-open flips it to 1fr — without this the two class changes can
      // coalesce into one style recalc and the transition never runs.
      // eslint-disable-next-line no-unused-expressions
      mobileNav.offsetHeight;
      mobileNav.classList.add("is-open");
      getFocusable()[0]?.focus();
    } else {
      mobileNav.classList.remove("is-open");
      const onTransitionEnd = (e) => {
        if (e.target !== mobileNav || e.propertyName !== "grid-template-rows") return;
        mobileNav.removeEventListener("transitionend", onTransitionEnd);
        mobileNav.hidden = true;
      };
      mobileNav.addEventListener("transitionend", onTransitionEnd);
      // Fallback for prefers-reduced-motion (transition: none never fires
      // transitionend) or any other reason the event doesn't land.
      setTimeout(() => {
        mobileNav.removeEventListener("transitionend", onTransitionEnd);
        mobileNav.hidden = true;
      }, 250);
    }
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
    if (mobileNav.hidden) return;

    if (e.key === "Escape") {
      setOpen(false);
      menuToggle.focus();
      return;
    }

    // FOCUS TRAP — while the panel is open, Tab/Shift+Tab cycle only
    // through its own focusable elements (the three links + the CTA)
    // instead of escaping into the rest of the page underneath it.
    if (e.key === "Tab") {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// SCROLL-SPY — one IntersectionObserver over the three anchor-linked
// sections, marking whichever is currently most in view with
// `aria-current="true"` on every nav link that points at it (both the
// desktop `.nav` and the `.mobile-nav__inner` copy share the same hrefs,
// so one lookup by href covers both). Styling lives in styles.css, keyed
// off `[aria-current="true"]`.
const spySections = ["#play", "#originals", "#faq"]
  .map((id) => document.querySelector(id))
  .filter(Boolean);

if (spySections.length > 0) {
  // Scoped to the two real nav lists — a plain `a[href="#originals"]` would
  // also match the hero's own "Explore on-chain games" CTA, which shares
  // that anchor but isn't a nav link and shouldn't be marked as the
  // "current page" for a screen reader.
  const navLinksFor = (id) => document.querySelectorAll(`.nav a[href="${id}"], .mobile-nav a[href="${id}"]`);
  const clearCurrent = () => {
    document
      .querySelectorAll('.nav a[aria-current="true"], .mobile-nav a[aria-current="true"]')
      .forEach((a) => a.removeAttribute("aria-current"));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;
      // Prefer the entry closest to the top of the viewport when more than
      // one section is partially visible at once.
      const top = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
      clearCurrent();
      navLinksFor(`#${top.target.id}`).forEach((a) => a.setAttribute("aria-current", "true"));
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );

  spySections.forEach((section) => observer.observe(section));
}
