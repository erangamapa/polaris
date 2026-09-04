// Whether the Developer/mock panel (Shift+D, logo-tap on mobile) and every
// mock override it drives (balance/auth/wallet/platform-scope/game-status
// presets, forced API errors, etc.) are active in this build. Every entry
// point into the panel — the Shift+D listener (useDevPanelShortcut.js), the
// mobile triple-tap listener (useDevPanelLogoTap.js), the panel component
// itself (DevPanel.jsx), and every mutator in devMock.js — is gated on this
// same constant, so a build with it off can never mount or open the panel
// through any of those paths; there is no separate "hide the button" step.
//
// Read via VITE_ENABLE_DEV_PANEL (build-time, Vite-inlined — changing it
// requires a redeploy, not just an env-var edit). Only the exact string
// 'true' enables it — anything else (unset, empty, 'false', a typo) keeps
// it off, matching this codebase's "the broader/exposed state is the
// deliberate opt-in, never the default" pattern (see @shared/chains'
// CASINO_USE_MAINNET/CASINO_CONTENT_MODE). This used to be a hardcoded
// `true` in every build including production — set VITE_ENABLE_DEV_PANEL=true
// in local/.env.local and in Preview where wanted; leave it unset in
// Production.
export const DEV_PANEL_ENABLED = String(import.meta.env.VITE_ENABLE_DEV_PANEL ?? '').trim().toLowerCase() === 'true';
