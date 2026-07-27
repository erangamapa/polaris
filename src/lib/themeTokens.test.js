import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// TOKEN ARCHITECTURE — scenario coverage. Static-analysis assertions
// against the actual token source (index.css) and its consumers (App.jsx's
// root attribute application, Sidebar.jsx's active-item accent, button.jsx's
// variants) — deterministic, no DOM/browser required, matching this
// project's established testing convention. Anything requiring computed
// styles, rendering, or a live arena switch is verified manually via
// Playwright against the running dev server.
//
// ONE-BRAND UNIFICATION: this file used to cover the retired "THEME-
// READINESS" branch-token architecture (a distinct Casino/Predictions/
// Sports accent + CTA colour per arena). That system is gone — Tribet now
// uses one brand colour everywhere, so the tests below assert the
// opposite of what they used to: no per-arena branch role exists, and the
// shell's active-state styling reads the single brand token, not an
// arena-specific one. The Prediction Markets YES/NO exception (the one
// place colour still carries meaning) is asserted separately.

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

describe("one-brand token architecture", () => {
  it("no longer defines a per-arena branch role (Casino/Predictions/Sports CTA colours are retired)", () => {
    expect(tokenValue("casino-accent")).toBeFalsy();
    expect(tokenValue("predictions-accent")).toBeFalsy();
    expect(tokenValue("sports-accent")).toBeFalsy();
    expect(tokenValue("casino-primary")).toBeFalsy();
    expect(tokenValue("casino-action")).toBeFalsy();
    expect(tokenValue("sports-action")).toBeFalsy();
    expect(tokenValue("predictions-action")).toBeFalsy();
  });

  it("no longer defines the --product-*/[data-product] per-arena CTA indirection", () => {
    expect(tokenValue("product-primary")).toBeFalsy();
    expect(tokenValue("product-action")).toBeFalsy();
    expect(css).not.toMatch(/\[data-product="casino"\]/);
  });

  it("defines one brand colour used for every primary action", () => {
    expect(tokenValue("global-cta")).toBeTruthy();
    expect(tokenValue("brand-logo")).toBeTruthy();
  });

  it("keeps status tokens independent of the brand token (no shared literal value)", () => {
    const statusValues = ["success", "warning", "danger", "info", "pending"].map(tokenValue);
    const brand = tokenValue("global-cta");
    expect(statusValues).not.toContain(brand);
  });

  it("defines the outcome/direction pair distinctly from both the brand and status tokens", () => {
    const affirmative = tokenValue("outcome-affirmative");
    const negative = tokenValue("outcome-negative");
    expect(affirmative).toBeTruthy();
    expect(negative).toBeTruthy();
    expect(affirmative).not.toBe(negative);
    const other = ["global-cta", "success", "warning", "danger"].map(tokenValue);
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

  it("Sidebar's active-item accent reads the one brand token, not a per-arena token", () => {
    expect(sidebarJsx).toMatch(/var\(--global-cta\)/);
    expect(sidebarJsx).not.toMatch(/--casino-accent|--predictions-accent|--sports-accent/);
  });

  it("button.jsx has no separate arena-owned action variant", () => {
    const buttonPath = fileURLToPath(new URL("../components/ui/button.jsx", import.meta.url));
    const buttonJsx = readFileSync(buttonPath, "utf-8");
    expect(buttonJsx).not.toMatch(/--product-action/);
    expect(buttonJsx).toMatch(/--global-cta/);
  });

  it("Prediction Markets keep the YES/NO semantic exception, via the dedicated OutcomeButton, not the brand colour or the generic success/destructive variants", () => {
    const marketCardPath = fileURLToPath(new URL("../components/predictions/MarketCard.jsx", import.meta.url));
    const marketCardJsx = readFileSync(marketCardPath, "utf-8");
    expect(marketCardJsx).toMatch(/OutcomeButton/);
    expect(marketCardJsx).not.toMatch(/variant="success"|variant="destructive"/);
  });

  it("defines a YES/NO token family fully decoupled from the generic success/danger tokens", () => {
    const yesBase = tokenValue("yes-base");
    const noBase = tokenValue("no-base");
    expect(yesBase).toBeTruthy();
    expect(noBase).toBeTruthy();
    expect(yesBase).not.toBe(tokenValue("success"));
    expect(noBase).not.toBe(tokenValue("danger"));
  });

  it("OutcomeButton is the one shared Yes/No control consumed by every prediction outcome surface", () => {
    const outcomeButtonPath = fileURLToPath(new URL("../components/predictions/OutcomeButton.jsx", import.meta.url));
    const outcomeButtonJsx = readFileSync(outcomeButtonPath, "utf-8");
    expect(outcomeButtonJsx).toMatch(/--yes-base/);
    expect(outcomeButtonJsx).toMatch(/--no-base/);
    expect(outcomeButtonJsx).not.toMatch(/transition-all/);

    for (const file of ["MarketCard.jsx", "MarketDetail.jsx", "PositionTicket.jsx"]) {
      const jsx = readFileSync(fileURLToPath(new URL(`../components/predictions/${file}`, import.meta.url)), "utf-8");
      expect(jsx, `${file} should use the shared OutcomeButton`).toMatch(/OutcomeButton/);
    }
  });

  it("naming remains Tribet (no accidental rebrand)", async () => {
    const { BRAND_NAME } = await import("./brand.js");
    expect(BRAND_NAME).toBe("Tribet");
  });
});
