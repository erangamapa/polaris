// Edge Middleware: shared-password gate (HTTP Basic Auth) for the pre-launch site.
// Protects the site when the gate is switched on (works on all Vercel plans,
// unlike native Vercel password protection which needs a paid plan).
//
// The gate is OPT-IN, via SITE_PASSWORD_ENABLED. It runs only when that flag is
// exactly 'true' AND SITE_PASSWORD holds a password; anything else — flag unset,
// 'false', a typo — serves the site publicly. Public is the safe default now
// that the site is launched: a leftover SITE_PASSWORD must never be able to lock
// real players out, and turning the gate back on is a one-word env change.
// (Same asymmetry, opposite direction, as CASINO_USE_MAINNET in
// packages/shared/chains.js: the risky state is the one you must spell out.)
//
// `/api/*` IS DELIBERATELY EXCLUDED. This gate is a human gate on the pages, and
// a browser only reuses Basic credentials for navigations — a `fetch()` that
// comes back 401 with a WWW-Authenticate header makes the browser pop its native
// credential dialog again, per request. With the API behind the gate, every
// background settings save (see src/lib/usePlayerSettings.jsx) re-prompted for
// the site password, which is both useless and maddening.
//
// Leaving the API ungated is safe because the API does not rely on this gate for
// authorisation: /api/settings requires a SIWE session cookie proving wallet
// ownership (see api/_session.js), /api/auth/* is the sign-in flow itself, and
// the rest (balance, geo, history, bet/prepare) are read-only, non-custodial
// reads of public on-chain data that hold no secrets.
export const config = { matcher: "/((?!api/).*)" };

export function isGateEnabled(env) {
  return String(env.SITE_PASSWORD_ENABLED).trim().toLowerCase() === "true";
}

export default function middleware(request) {
  if (!isGateEnabled(process.env)) return; // gate switched off -> public

  const password = process.env.SITE_PASSWORD;
  if (!password) return; // no password configured -> public

  const auth = request.headers.get("authorization");
  if (auth) {
    try {
      const [, pass] = atob(auth.split(" ")[1]).split(":");
      if (pass === password) return; // authorized -> continue to the app
    } catch {
      // malformed header -> fall through to challenge
    }
  }
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="TriBet"' },
  });
}
