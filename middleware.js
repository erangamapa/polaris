// Edge Middleware: shared-password gate (HTTP Basic Auth) for the pre-launch site.
// Protects the ENTIRE site when SITE_PASSWORD is set (works on all Vercel plans,
// unlike native Vercel password protection which needs a paid plan).
// Unset SITE_PASSWORD to make the site public again.
export const config = { matcher: "/(.*)" };

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
