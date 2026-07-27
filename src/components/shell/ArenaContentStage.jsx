import { useEffect, useLayoutEffect, useRef, useState } from "react";

const FADE_MS = 120;
const OUTGOING_FADE_MS = 100;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// STABLE ARENA CONTENT STAGE — the one place the Casino/Predictions/Sports
// leg-switching crossfade lives. Two permanent DOM slots ("a" and "b") ping-
// pong which one holds the current arena vs. the outgoing one, so a React
// element is never relocated between two different parent nodes (that would
// force an unmount/remount — the opposite of a smooth handoff). Whichever
// slot is "current" stays in normal flow (it's what determines the stage's
// own width/height); the "outgoing" slot is pulled out of flow with
// `position: absolute; inset: 0` so both slots visually overlay the exact
// same frame without ever contributing to layout at the same time.
//
// Sequence (matches the product spec exactly):
//  1. `arenaKey` prop changes (App.jsx already updated `product`/nav
//     state immediately — this component never delays that).
//  2. Synchronously (useLayoutEffect, before paint): freeze the stage's
//     height at the outgoing slot's current measured height, flip the
//     outgoing slot to `position: absolute` (still opacity 1 — no visual
//     change yet), and mount the new arena into the other slot at
//     `opacity: 0` in normal flow (so it can be measured).
//  3. Two rAFs later (the new slot has completed a real layout pass):
//     measure its height, grow the frozen stage height to
//     max(outgoing, incoming) if the new page is taller, then start the
//     crossfade — incoming opacity 0->1, outgoing opacity 1->0,
//     simultaneously.
//  4. After the fade finishes: unmount the outgoing slot's content and
//     release the stage's explicit height back to auto.
//
// No transform/translate/width/margin/padding/grid/gap is ever animated —
// only opacity, via a fixed-property CSS transition (never
// `transition-all`). `overflow-anchor: none` stops the browser's own
// scroll-anchoring heuristic from nudging scroll position while the two
// slots' heights change underneath. `prefers-reduced-motion` collapses
// every transition-duration to ~0 globally already (see index.css) — this
// component additionally skips its own JS fade delay so the outgoing slot
// is removed in the same tick instead of lingering (invisibly) for the
// normal fade window.
export function ArenaContentStage({ arenaKey, children, className, minHeight }) {
  const [slots, setSlots] = useState(() => ({
    a: { key: arenaKey, node: children },
    b: { key: null, node: null },
  }));
  const [activeSlot, setActiveSlot] = useState("a");
  const [fadeState, setFadeState] = useState("settled"); // "settled" | "preparing" | "crossfading"
  const [stageHeight, setStageHeight] = useState(null);

  const stageRef = useRef(null);
  const slotElRefs = useRef({ a: null, b: null });
  const cleanupTimerRef = useRef(null);
  const rafRefs = useRef([]);
  // DEV-ONLY diagnostics (see StageDebugOverlay below) — tracks the arena
  // being left, purely for that readout; no effect on transition logic.
  const previousArenaKeyRef = useRef(null);

  // Keep the *content* of the active slot in sync with new props for the
  // SAME arena (e.g. in-arena navigation, data updates) — no transition
  // machinery involved, just a normal re-render.
  useEffect(() => {
    setSlots((prev) => {
      const cur = prev[activeSlot];
      if (cur.key !== arenaKey) return prev; // handled by the switch effect below
      if (cur.node === children) return prev;
      return { ...prev, [activeSlot]: { ...cur, node: children } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  // Arena actually changed — begin the staged handoff. Reads `slots`/
  // `activeSlot` directly from render scope (the last committed render),
  // NOT via a setState updater callback — deliberately, so that a rapid
  // second switch arriving before the first transition finishes still
  // sees the truthful current slot assignment rather than a value queued
  // from inside another updater. Each call targets "whichever slot isn't
  // active right now", so even back-to-back interrupting switches always
  // self-correct: an in-flight outgoing fade is simply abandoned/
  // superseded by the newer one, never left in an inconsistent state.
  useLayoutEffect(() => {
    const cur = slots[activeSlot];
    if (cur.key === arenaKey) return; // no real arena change (in-arena nav)
    previousArenaKeyRef.current = cur.key;
    const nextSlotName = activeSlot === "a" ? "b" : "a";

    // Freeze the stage at the outgoing slot's current height BEFORE it
    // leaves normal flow, so nothing can collapse even for one frame.
    const outgoingEl = slotElRefs.current[activeSlot];
    const outgoingHeight = outgoingEl ? outgoingEl.offsetHeight : null;
    if (outgoingHeight != null) setStageHeight(outgoingHeight);

    setFadeState("preparing");
    setActiveSlot(nextSlotName);
    setSlots((prev) => ({ ...prev, [nextSlotName]: { key: arenaKey, node: children } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaKey]);

  // Once the new (now-active) slot has actually mounted and completed a
  // layout pass, measure it and start the crossfade.
  useEffect(() => {
    if (fadeState !== "preparing") return undefined;

    if (prefersReducedMotion()) {
      // Immediate, stable swap: no separately-timed fade to wait out.
      setFadeState("settled");
      setStageHeight(null);
      setSlots((prev) => {
        const idleSlot = activeSlot === "a" ? "b" : "a";
        if (prev[idleSlot].node === null) return prev;
        return { ...prev, [idleSlot]: { key: null, node: null } };
      });
      return undefined;
    }

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const incomingEl = slotElRefs.current[activeSlot];
        const incomingHeight = incomingEl ? incomingEl.offsetHeight : null;
        setStageHeight((h) => (incomingHeight == null ? h : h == null ? incomingHeight : Math.max(h, incomingHeight)));
        setFadeState("crossfading");
      });
      rafRefs.current.push(raf2);
    });
    rafRefs.current.push(raf1);

    return () => {
      rafRefs.current.forEach((id) => cancelAnimationFrame(id));
      rafRefs.current = [];
    };
  }, [fadeState, activeSlot]);

  // Crossfade is running — clean up the outgoing slot once it's done.
  useEffect(() => {
    if (fadeState !== "crossfading") return undefined;
    const idleSlot = activeSlot === "a" ? "b" : "a";
    const longest = Math.max(FADE_MS, OUTGOING_FADE_MS);
    cleanupTimerRef.current = setTimeout(() => {
      setFadeState("settled");
      setStageHeight(null);
      setSlots((prev) => ({ ...prev, [idleSlot]: { key: null, node: null } }));
    }, longest + 20);
    return () => clearTimeout(cleanupTimerRef.current);
  }, [fadeState, activeSlot]);

  const outgoingSlotName = activeSlot === "a" ? "b" : "a";
  const isTransitioning = fadeState !== "settled";

  return (
    <div
      ref={stageRef}
      data-test-id="arena-content-stage"
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        minHeight: minHeight,
        height: stageHeight != null ? `${stageHeight}px` : undefined,
        overflowAnchor: "none",
      }}
    >
      {(["a", "b"]).map((name) => {
        const slot = slots[name];
        if (slot.node === null && name !== activeSlot) return null;
        const isActive = name === activeSlot;
        const isOutgoing = isTransitioning && name === outgoingSlotName;
        // Opacity: the active slot starts at 0 the instant it mounts
        // (during "preparing") and only becomes 1 once "crossfading"
        // begins; the outgoing slot stays at 1 until "crossfading" starts,
        // then drops to 0.
        let opacity = 1;
        if (isActive && fadeState === "preparing") opacity = 0;
        if (isOutgoing && fadeState === "crossfading") opacity = 0;

        return (
          <div
            key={name}
            ref={(el) => { slotElRefs.current[name] = el; }}
            data-test-id={isActive ? "arena-stage-incoming" : isOutgoing ? "arena-stage-outgoing" : "arena-stage-slot"}
            data-slot={name}
            data-arena-key={slot.key ?? undefined}
            aria-hidden={!isActive || undefined}
            style={{
              position: isOutgoing ? "absolute" : "relative",
              inset: isOutgoing ? 0 : undefined,
              top: isOutgoing ? 0 : undefined,
              width: "100%",
              minWidth: 0,
              opacity,
              transition: `opacity ${isOutgoing ? OUTGOING_FADE_MS : FADE_MS}ms ease-out`,
              pointerEvents: isOutgoing ? "none" : undefined,
            }}
          >
            {slot.node}
          </div>
        );
      })}
      {import.meta.env.DEV && (
        <StageDebugOverlay
          stageRef={stageRef}
          slotElRefs={slotElRefs}
          currentKey={arenaKey}
          previousKey={previousArenaKeyRef.current}
          fadeState={fadeState}
          stageHeight={stageHeight}
          activeSlot={activeSlot}
          outgoingSlotName={outgoingSlotName}
          isTransitioning={isTransitioning}
        />
      )}
    </div>
  );
}

// TEMPORARY DEV DIAGNOSTIC — `import.meta.env.DEV` is Vite's own build-time
// constant (true only under `npm run dev`, always false in a production
// build), so this can never render outside local development regardless of
// any other runtime flag. Purely a readout — renders nothing interactive,
// changes no transition behavior. Safe to delete once the transition is
// trusted, or leave in place indefinitely since it's already inert in
// every real deployment.
function StageDebugOverlay({ stageRef, slotElRefs, currentKey, previousKey, fadeState, stageHeight, activeSlot, outgoingSlotName, isTransitioning }) {
  const [reading, setReading] = useState(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      const incomingRect = slotElRefs.current[activeSlot]?.getBoundingClientRect();
      const outgoingEl = isTransitioning ? slotElRefs.current[outgoingSlotName] : null;
      const outgoingRect = outgoingEl?.getBoundingClientRect();
      const mainEl = stageRef.current?.closest('[data-test-id="main-content"]');
      const scrollbarWidth = mainEl ? Math.round(mainEl.offsetWidth - mainEl.clientWidth) : null;
      setReading({
        stageX: stageRect ? Math.round(stageRect.x) : null,
        stageW: stageRect ? Math.round(stageRect.width) : null,
        incomingX: incomingRect ? Math.round(incomingRect.x) : null,
        incomingW: incomingRect ? Math.round(incomingRect.width) : null,
        outgoingX: outgoingRect ? Math.round(outgoingRect.x) : null,
        outgoingW: outgoingRect ? Math.round(outgoingRect.width) : null,
        scrollbarWidth,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot, outgoingSlotName, isTransitioning]);

  if (!reading) return null;
  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div
      data-test-id="arena-stage-debug-overlay"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        width: 240,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(10,12,16,0.92)",
        color: "#F5F7FA",
        font: "11px/1.5 ui-monospace, monospace",
        pointerEvents: "none",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Arena Stage (dev)</div>
      {row("current", currentKey)}
      {row("previous", previousKey ?? "—")}
      {row("phase", fadeState)}
      {row("stage x / w", `${reading.stageX} / ${reading.stageW}`)}
      {row("stage height", stageHeight != null ? `${stageHeight}px (frozen)` : "auto")}
      {row("incoming x / w", `${reading.incomingX} / ${reading.incomingW}`)}
      {row("outgoing x / w", isTransitioning ? `${reading.outgoingX} / ${reading.outgoingW}` : "—")}
      {row("scrollbar width", reading.scrollbarWidth ?? "—")}
    </div>
  );
}
