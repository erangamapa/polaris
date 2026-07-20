import { describe, it, expect } from "vitest";
import { isTypingTarget, shouldToggleDevPanel } from "./useDevPanelShortcut";

// This task's own TESTING list (25 scenarios) is largely rendering/
// interaction/production-exclusion behavior — none of which is a pure
// function to assert against without a DOM or a real build. Per the
// project's established testing stack (vitest, no jsdom/React Testing
// Library — same constraint noted in every prior UI task this session),
// the two genuine pieces of decision logic this task introduces
// (isTypingTarget, shouldToggleDevPanel) are unit-tested here; everything
// else was verified manually via Playwright against the running dev
// server, plus a direct grep of the production build output (see the
// FINAL RESPONSE for exactly what that caught and how it was fixed):
//
//  1.  Shift+D opens the panel                    -> Playwright
//  2.  Shift+D closes the panel                    -> Playwright
//  3.  Shortcut ignores input typing                -> Playwright (typed "Dice" into search, panel stayed closed, input kept the text)
//  4.  Shortcut ignores textarea typing               -> unit test (isTypingTarget)
//  5.  Shortcut ignores contenteditable                -> Playwright (dynamically inserted contenteditable div) + unit test
//  6.  Ctrl/Cmd/Alt+Shift+D does not trigger             -> Playwright (Ctrl+Shift+D) + unit test (all three modifiers)
//  7.  Repeated keydown does not double-toggle             -> Playwright (1 real keydown + 3 repeat:true events -> single toggle) + unit test
//  8.  Escape closes                                        -> Playwright
//  9.  Focus restores                                        -> Playwright (focused "Popular" button before open, confirmed refocused after close)
//  10. Panel does not render in production mode                -> production build grep (see FINAL RESPONSE — this is where the real bug was)
//  11. Auth and wallet states are independent                    -> Playwright (Logged in + Disconnected renders the one combination with no real backing state — see useDevAwareWallet.js)
//  12. Logged in + disconnected works                              -> Playwright
//  13. Session expired + connected works                            -> Playwright
//  14. Balance presets update header                                 -> Playwright (screenshot)
//  15. Wrong-network state updates header                             -> Playwright ([data-test-id="switch-network"])
//  16. Favorites preset updates Casino                                  -> Playwright (Favorites page showed "3 games" with real catalog titles)
//  17. Recently played preset updates Casino                             -> same mechanism as #16, not re-screenshotted separately
//  18. Reset returns defaults                                              -> code review (resetDevMockState — see devMock.js)
//  19. Session persistence works                                            -> code review (sessionStorage read/write in devMock.js)
//  20. Malformed session state falls back safely                             -> code review (safeLoad's try/catch + version check in devMock.js)

describe("isTypingTarget", () => {
  it("treats input/textarea/select as typing surfaces", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
  });

  it("treats contenteditable elements as typing surfaces", () => {
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("treats a code-editor-style role=textbox ancestor as a typing surface", () => {
    const closest = (sel) => (sel.includes("textbox") ? {} : null);
    expect(isTypingTarget({ tagName: "SPAN", closest })).toBe(true);
  });

  it("is false for ordinary elements", () => {
    const closest = () => null;
    expect(isTypingTarget({ tagName: "BUTTON", closest })).toBe(false);
    expect(isTypingTarget({ tagName: "DIV", closest })).toBe(false);
  });

  it("is false for a null/missing target", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
  });
});

const baseEvent = () => ({ code: "KeyD", shiftKey: true, ctrlKey: false, metaKey: false, altKey: false, repeat: false, target: { tagName: "BODY" } });

describe("shouldToggleDevPanel", () => {
  it("toggles on a plain Shift+D", () => {
    expect(shouldToggleDevPanel(baseEvent())).toBe(true);
  });

  it("ignores keys other than D", () => {
    expect(shouldToggleDevPanel({ ...baseEvent(), code: "KeyE" })).toBe(false);
  });

  it("requires Shift", () => {
    expect(shouldToggleDevPanel({ ...baseEvent(), shiftKey: false })).toBe(false);
  });

  it("ignores Ctrl/Cmd/Alt held alongside Shift+D", () => {
    expect(shouldToggleDevPanel({ ...baseEvent(), ctrlKey: true })).toBe(false);
    expect(shouldToggleDevPanel({ ...baseEvent(), metaKey: true })).toBe(false);
    expect(shouldToggleDevPanel({ ...baseEvent(), altKey: true })).toBe(false);
  });

  it("ignores auto-repeat from a held key", () => {
    expect(shouldToggleDevPanel({ ...baseEvent(), repeat: true })).toBe(false);
  });

  it("ignores the shortcut while a typing surface is focused", () => {
    expect(shouldToggleDevPanel({ ...baseEvent(), target: { tagName: "INPUT" } })).toBe(false);
    expect(shouldToggleDevPanel({ ...baseEvent(), target: { tagName: "TEXTAREA" } })).toBe(false);
    expect(shouldToggleDevPanel({ ...baseEvent(), target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
  });
});
