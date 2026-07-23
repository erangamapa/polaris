// Whether the Developer/mock panel (Shift+D, logo-tap on mobile) and every
// mock override it drives (balance/auth/wallet/platform-scope/game-status
// presets, forced API errors, etc.) are active in this build. This used to
// be tied to `import.meta.env.DEV` (Vite's dev-vs-build constant), which
// meant the panel was unreachable on the deployed site. Product decision:
// the mock panel is also wanted on the live playtribet.vercel.app build, so
// this is now its own explicit flag rather than being implied by build
// mode — flip it back to `import.meta.env.DEV` to restore the old
// dev-only behavior.
export const DEV_PANEL_ENABLED = true;
