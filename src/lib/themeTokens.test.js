import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// THEME-READINESS TOKEN ARCHITECTURE — scenario coverage. Static-analysis
// assertions against the actual token source (index.css) and its two
// consumers (App.jsx's root attribute application, Sidebar.jsx's branch
// accent usage) — deterministic, no DOM/browser required, matching this
// project's established testing convention. Anything requiring computed
// styles, rendering, or a live arena switch is verified manually via
// Playwright against the running dev server (see docs/design/
// theme-readiness.md and the final report's Visual Regression section):
//
//  1.  Root arena attribute reflects active arena          -> Playwright (data-arena flips live on arena switch)
//  2.  MVP mode uses Casino arena context                   -> Playwright (MVP scope forces product="casino", data-arena="casino")
//  3.  Full mode changes branch context correctly            -> Playwright (switching to Predictions/Sports updates data-arena and --product-* vars)
//  4.  Global shell remains neutral                           -> Playwright (TopBar/body background unchanged across arena switches)
//  9.  Disabled states remain semantic                          -> code review (aria-disabled + tooltip, unchanged by this pass — see Sidebar.jsx)
//  10. Focus ring remains visible                                 -> Playwright (focus-visible:ring-2 classes untouched by this pass)
//  12. No visible Providers UI returns                             -> code review (ProviderTiles still unreferenced, see CasinoCatalog.jsx)
//  14. 320px layout remains stable                                  -> Playwright
//  15. Gameplay visuals remain stable                                -> Playwright (CasinoGameplayFrame's bounds/z-index unchanged, only its bg-zinc-950/900 became token-driven at the same computed value)
//  16. Developer Panel remains accessible                             -> Playwright (Shift+D / triple-tap unchanged by this pass)
//  17. No new console errors                                           -> Playwright
//  18. Production build succeeds                                        -> npm run build (see final report)

const cssPath = fileURLToPath(new URL("../index.css", import.meta.url));
const css = readFileSync(cssPath, "utf-8");

const appJsxPath = fileURLToPath(new URL("../App.jsx", import.meta.url));
const appJsx = readFileSync(appJsxPath, "utf-8");

const sidebarPath = fileURLToPath(new URL("../components/shell/Sidebar.jsx", import.meta.url));
const sidebarJsx = readFileSync(sidebarPath, "utf-8");

function tokenValue(name) {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

describe("theme-readiness token architecture", () => {
  it("defines a Casino branch role", () => {
    expect(tokenValue("casino-accent")).toBeTruthy();
  });

  it("defines a Predictions branch role", () => {
    expect(tokenValue("predictions-accent")).toBeTruthy();
  });

  it("defines a Sports branch role", () => {
    expect(tokenValue("sports-accent")).toBeTruthy();
  });

  it("gives every branch role a distinct value from the other two", () => {
    const values = ["casino-accent", "predictions-accent", "sports-accent"].map(tokenValue);
    expect(new Set(values).size).toBe(3);
  });

  it("keeps status tokens independent of branch tokens (no shared literal value)", () => {
    const statusValues = ["success", "warning", "danger", "info", "pending"].map(tokenValue);
    const branchValues = ["casino-accent", "predictions-accent", "sports-accent"].map(tokenValue);
    for (const s of statusValues) {
      expect(branchValues).not.toContain(s);
    }
  });

  it("defines the outcome/direction pair distinctly from both branch and status tokens", () => {
    const affirmative = tokenValue("outcome-affirmative");
    const negative = tokenValue("outcome-negative");
    expect(affirmative).toBeTruthy();
    expect(negative).toBeTruthy();
    expect(affirmative).not.toBe(negative);
    const other = ["casino-accent", "predictions-accent", "sports-accent", "success", "warning", "danger"].map(tokenValue);
    expect(other).not.toContain(affirmative);
    expect(other).not.toContain(negative);
  });

  it("documents a z-index scale that keeps Game Info above the gameplay layer", () => {
    const gameInfo = Number(tokenValue("z-game-info"));
    const dialog = Number(tokenValue("z-dialog")); // gameplay frame shares this layer
    expect(gameInfo).toBeGreaterThan(dialog);
  });

  it("documents a z-index scale that keeps the Developer Panel above transaction overlays", () => {
    const devPanel = Number(tokenValue("z-critical-alert"));
    const transactionOverlay = Number(tokenValue("z-transaction-overlay"));
    expect(devPanel).toBeGreaterThan(transactionOverlay);
  });

  it("gives the danger status a dedicated dark foreground for solid-fill buttons", () => {
    expect(tokenValue("danger-foreground")).toBeTruthy();
  });

  it("keeps the app in documented dark-only mode (no theme toggle introduced)", () => {
    expect(appJsx).not.toMatch(/theme.*toggle|toggleTheme|setTheme/i);
  });

  it("applies data-arena as an alias of the existing data-product attribute, not a second state store", () => {
    expect(appJsx).toMatch(/data-product=\{product\}/);
    expect(appJsx).toMatch(/data-arena=\{product\}/);
  });

  it("Sidebar's per-arena accent styling reads from the branch tokens, not re-hardcoded hex", () => {
    expect(sidebarJsx).toMatch(/var\(--casino-accent\)/);
    expect(sidebarJsx).toMatch(/var\(--predictions-accent\)/);
    expect(sidebarJsx).toMatch(/var\(--sports-accent\)/);
    // The old duplicated hex (casino text-accent) should no longer appear
    // as a literal in the ACCENTS object.
    expect(sidebarJsx).not.toMatch(/"#D99AB9"/);
  });

  it("naming remains Tribet (no accidental rebrand)", async () => {
    const { BRAND_NAME } = await import("./brand.js");
    expect(BRAND_NAME).toBe("Tribet");
  });
});
