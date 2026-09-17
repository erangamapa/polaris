# Tribet AI game finder — initial integration

Disabled by default. No live provider credentials were created or configured.

## Enable only in an isolated preview first

- `VITE_CONCIERGE_ENABLED=true`: display the launcher (requires a rebuild).
- `CONCIERGE_ENABLED=true`: enable the server endpoint; disabling it is the kill switch.
- `GROQ_API_KEY`: server-only secret, never a VITE variable.
- `CONCIERGE_MODEL`: an explicitly selected supported Groq chat model.
- Existing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: required for shared atomic quotas. Missing storage fails closed.

Use a Vercel preview for the endpoint; plain Vite does not serve this serverless function. Do not paste credentials into chat or source files. Set a provider spending limit too.

## Scope and limitations

One independent query per message; session-only visual history. AI extracts search keywords only. The server ranks the existing catalogue and constructs links; model prose and URLs are never rendered. No account information, transactions, betting history, external browsing, persistent chat logs, or claimed knowledge of game rules. Game category/title matching is basic, not validated theme or complexity matching.

Hard request ceilings: 200 provider attempts per UTC day across the app, 20 per IP/hour. Requests that fail upstream still count. Quotas are not an exact dollar budget. Redis errors, missing config, malformed output and timeouts fail safely. IPs are hashed with the date for short-lived counters; review privacy disclosure before launch.

## Before public enablement

- Confirm provider/model licence and policies permit the actual intended use, and review operating/compliance requirements.
- Evaluate 30–50 queries including spelling, unrelated prompts, prompt injection, loss chasing, minors, invented game names, and languages. Regex routing is a starter safeguard, not a complete safety classifier.
- Validate mobile keyboard, keyboard focus, screen readers, network errors, quota exhaustion, and game-launch/modal collisions.
- Confirm infrastructure budgets and monitoring; do not log raw messages or secrets.
- Review privacy notice and external-provider data handling. Warn users not to send sensitive information.
- Expand verified metadata and safety coverage before adding personalisation or game-rule answers.

Current UI is casino-only, hidden during known app dialogs, the mobile menu, and active game launches. It reuses the shared modal convention for focus/escape handling.
