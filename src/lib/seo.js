// Search-engine metadata for the SPA's routes.
//
// The app is a single HTML shell (app.html) served for every path, so without
// this every Casino/Sports/Predictions URL would hand Google the same <title>,
// no description and no canonical — and then the same page again under each
// host this deployment answers on. Titles, descriptions and canonicals are
// therefore derived from the route and re-applied on every navigation.
//
// The static landing page at `/` carries its own hand-written tags and is not
// touched by any of this (see landing/index.html).
import { BRAND_NAME } from "@/lib/brand";
import { CATEGORY_LABEL, CASINO_PROVIDERS } from "@/lib/casinoCategories";

// Canonicals always point here, never at the host that served the request.
// playtribet.vercel.app, polaris-*.vercel.app and every preview URL serve byte
// identical content; pointing each at itself would be asking Google to index
// all of them. One canonical host, one indexed copy.
export const CANONICAL_ORIGIN = "https://tribet.gg";

const titleWithBrand = (headline) => `${headline} | ${BRAND_NAME}`;

const providerName = (slug) => CASINO_PROVIDERS.find((p) => p.id === slug)?.name;

function casinoMetadata({ casinoCategory, casinoView, casinoProviderSlug }) {
  if (casinoView === "providers") {
    return {
      title: titleWithBrand("Game Providers"),
      description: `Browse every game provider available on ${BRAND_NAME}.`,
    };
  }
  if (casinoView === "provider") {
    const name = providerName(casinoProviderSlug);
    return {
      title: titleWithBrand(name ? `${name} Games` : "Provider Games"),
      description: name
        ? `Play ${name} games on ${BRAND_NAME} from the current casino catalogue.`
        : `Play provider games on ${BRAND_NAME}.`,
    };
  }
  if (casinoCategory === "Favorites") {
    return { title: titleWithBrand("Your Favorites"), description: `The games you saved on ${BRAND_NAME}.` };
  }
  if (casinoCategory === "Recently Played") {
    return { title: titleWithBrand("Recently Played"), description: `Pick up where you left off on ${BRAND_NAME}.` };
  }
  // A category view (chip filter or standalone destination). "Lobby" is the
  // default multi-rail dashboard and gets the strongest, most general copy —
  // it is the app's entry point and the page the landing's CTAs link to.
  if (casinoCategory && casinoCategory !== "Lobby") {
    const label = CATEGORY_LABEL[casinoCategory] ?? casinoCategory;
    return {
      title: titleWithBrand(`${label} Games`),
      description: `Play ${label} games on ${BRAND_NAME} — explore the current casino catalogue.`,
    };
  }
  return {
    title: titleWithBrand("Casino Lobby"),
    description: `Explore slots, table games and quick-play favourites on ${BRAND_NAME}. Current games use provider credits with no cash winnings.`,
  };
}

export function metadataFor(nav) {
  if (nav.product === "predictions") {
    return {
      title: titleWithBrand(`Predictions — ${nav.predSection}`),
      description: `Trade ${String(nav.predSection).toLowerCase()} prediction markets on ${BRAND_NAME}.`,
    };
  }
  if (nav.product === "sports") {
    return {
      title: titleWithBrand("Sports Betting"),
      description: `Bet on live and upcoming sports on ${BRAND_NAME}, settled on-chain.`,
    };
  }
  return casinoMetadata(nav);
}

// Creates the tag on first use rather than requiring it in the shell, so the
// shell stays minimal and this module owns the whole contract.
function upsertTag(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(name, content) {
  const el = upsertTag(`meta[name="${name}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute("name", name);
    return m;
  });
  el.setAttribute("content", content);
}

function setProperty(property, content) {
  const el = upsertTag(`meta[property="${property}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute("property", property);
    return m;
  });
  el.setAttribute("content", content);
}

// `path` is the canonical path the router settled on, NOT window.location —
// a deep link to /sports while the product is scoped to MVP lands on Casino,
// and the canonical must name where the user actually ended up.
export function applyRouteMetadata(path, nav) {
  if (typeof document === "undefined") return;
  const { title, description } = metadataFor(nav);
  const url = `${CANONICAL_ORIGIN}${path}`;

  document.title = title;
  setMeta("description", description);

  const canonical = upsertTag('link[rel="canonical"]', () => {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    return l;
  });
  canonical.setAttribute("href", url);

  setProperty("og:url", url);
  setProperty("og:title", title);
  setProperty("og:description", description);
}
