// GAME PAGE — the ONE shared wrapper GameHeader, GameStage and
// GameUtilityBar all render inside, so their edges always match exactly
// instead of each computing its own width. Owns: max-width (per-game, from
// lib/gameDisplay.js's contentBoxMaxWidthPx — a compact Tribet Originals
// form gets a narrower frame than a full-width provider game, but
// Header/Stage/UtilityBar always match EACH OTHER, whatever that width
// turns out to be), and horizontal centring. `height` is the same real,
// definite pixel value CasinoGamePage's useAvailableHeight already computes
// (never `minHeight` — see that file's own note on why a flex column needs
// a definite height, not just a floor, for its flex-1 child to actually
// fill it).
//
// TOOLBAR REDESIGN: no shared `gap` here — GameUtilityBar now docks flush
// against GameStage (zero space, shared border, "attached" rather than
// "floating below it"), while GameHeader keeps its own spacing above the
// stage. Vertical rhythm between Header and Stage is applied at the point
// of use (CasinoGamePage.jsx), not baked in here.
//
// The max-width cap only applies at `md:` and up — matching GameStage's
// own pre-existing mobile behavior (no per-profile box at all below `md`,
// every game just fills the full mobile screen). Applying the cap
// unconditionally via inline style would make a COMPACT game's mobile
// view tiny and centered in a sea of black, a real regression from
// today's full-width mobile experience — so the max-width lives in a CSS
// custom property, only consumed by the `md:max-w-[...]` utility.
export function GamePlayerFrame({ frameRef, maxWidthPx, height, className, children }) {
  return (
    <div
      ref={frameRef}
      data-test-id="game-player-frame"
      className={"mx-auto flex w-full min-h-0 flex-col md:max-w-[var(--gpf-max-w)]" + (className ? " " + className : "")}
      style={{
        "--gpf-max-w": maxWidthPx ? `${maxWidthPx}px` : "none",
        height: height != null ? `${height}px` : undefined,
      }}
    >
      {children}
    </div>
  );
}
