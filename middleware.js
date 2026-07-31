// Edge Middleware: shared-password gate (HTTP Basic Auth) for the pre-launch site.
// Protects the site when SITE_PASSWORD is set (works on all Vercel plans, unlike
// native Vercel password protection which needs a paid plan).
// Unset SITE_PASSWORD to make the site public again.
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

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return; // no gate configured -> public

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
