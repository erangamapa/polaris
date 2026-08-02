# The Tribet Originals Platform Standard

**A product, UX, and technical compatibility standard for every current and future Tribet game.**

---

## How to read this document

This document answers one question: **how should every current and future Tribet game integrate with the platform?** It is not a description of what today's code happens to do — it is the standard that today's code is measured against, and that all future games (built in-house or by external studios) must be measured against too.

Two recurring markers appear throughout:

> **Current Implementation** — what the repository actually does today, as of this audit. Evidence, not policy. It may change without changing the standard.

> **Proposed Platform Standard** — a rule this document is introducing. Where it matches what already exists, that's noted. Where it does not exist yet, that is stated explicitly — this document never pretends a future system already exists.

Every normative rule carries a **compliance tag**:

| Tag | Meaning |
|---|---|
| **[MANDATORY]** | Every game, of every class, must comply. Non-negotiable. A game that violates this should not ship. |
| **[RECOMMENDED]** | Strong default. Deviating requires a documented reason and Product/Platform sign-off. |
| **[OPTIONAL]** | A capability a game may adopt if relevant to it; absence is not a defect. |
| **[GAME-SPECIFIC]** | Left entirely to the individual game's own identity/rules; the platform does not standardize this. |
| **[FUTURE]** | Not enforceable today because the supporting platform mechanism does not exist yet. Documented so it can be built toward, not to imply it is live. |

Everything that was previously the whole of this project's audit now lives in the **Appendices** (Appendix A–F). It is the evidence this standard is built on, and the reference an engineer implementing a specific game should read side-by-side with the standard. **The audit supports the standard; it does not define it.**

---

# Part I — The Standard

## 1. Vision

Tribet is not a collection of games glued to a website. It is **one platform** — one wallet, one account, one session, one set of trust and accessibility guarantees — that happens to host many different play experiences. A player should be able to move from Sports, to Predictions, to any Casino game, on-chain or off, without ever re-learning how navigation, balance, fullscreen, or support work. A game's *content* — its art, its rules, its math, its personality — is where individuality lives. Everything a player relies on *around* that content should feel identical every time.

This standard exists so that a five-year-from-now engineer, or a third-party studio that has never seen this repository, can build a fully compliant Tribet game without ever needing to ask a Tribet engineer "how does this normally work here."

## 2. Design Principles

1. **The platform is the constant; the game is the variable.** Chrome, session, wallet, accessibility, and trust surfaces do not change per game. Visual identity, rules, and feel do.
2. **A game is a guest inside the platform, not a peer of it.** It never reaches outside its own mount point to alter shell, navigation, or browser chrome.
3. **State ownership has one home.** Every piece of state (balance, session, route, fullscreen) has exactly one owner. A game never maintains a shadow copy of platform state, and the platform never reaches into a game's internal state.
4. **Fail predictably, not silently.** Every failure mode (load timeout, network drop, unavailable game, expired session) has a defined, player-visible state — never an infinite spinner, never a silent stall.
5. **Extensibility over prediction.** The standard does not assume it knows every future game's shape. It defines extensible categories (Game Classes, Game Profiles) precisely so a genuinely new kind of game does not require rewriting the standard, only adding to it.
6. **Compliance is verifiable, not aspirational.** Every rule in this document is either already checkable against the current repository (see Appendices) or explicitly marked **[FUTURE]** pending a named platform mechanism.

## 3. Platform Philosophy

| Principle | What it means in practice |
|---|---|
| **One Platform** | Sports, Predictions, and every Casino game (Original or Studio) share one shell, one nav, one account. There is no "sub-app" that feels like a different product. |
| **One Wallet** | There is exactly one balance/wallet concept a player trusts. A game's *display* of balance may vary (see §13), but its *source* must not silently fork (see Appendix F for where this promise is currently broken). |
| **One Account** | Identity, favorites, and session belong to the account, not to any individual game. |
| **One Session Model** | Every game launch, regardless of class, passes through the same lifecycle (§9) and the same teardown guarantees. |
| **Consistent UX** | Buttons, dialogs, loading states, and errors look and behave the same regardless of which game triggered them. |
| **Individual Game Identity** | Within its own mount point, a game owns its visual identity completely — palette, motion, sound design, layout of its own controls. |
| **Shared Platform Behaviour** | Navigation, back/forward, deep-linking, fullscreen, and teardown behave identically for every game, because the platform — not the game — implements them. |
| **Predictable Navigation** | A player can always get back to the lobby, always refresh safely, and never gets trapped in a game with no way out. |
| **Shared Trust** | Fairness, support, and reporting surfaces are the platform's responsibility so they are consistent and auditable, not reinvented per game. |
| **Shared Accessibility** | Accessibility is a platform guarantee, not a per-game opt-in. A player who relies on keyboard nav or a screen reader gets the same baseline everywhere. |
| **Shared Performance Expectations** | No single game may degrade the performance of the platform around it, during play or after it closes. |

## 4. Core Goals

- Any team — internal or an external studio — can build a new game against this standard without bespoke onboarding.
- A new "kind" of game (multiplayer, streamed, WebGL) can be added as a new **Game Class** without invalidating the platform contract.
- A game can be replaced or removed entirely without the platform-level guarantees (session, wallet, accessibility, trust) ever being affected.
- Product, UX, and Engineering share one vocabulary for talking about "the game system," instead of each team reasoning about a different informal mental model.

## 5. Shared Experience

Regardless of Game Class, every player-facing session follows the same shape:

```
Lobby → Launch → Loading → Ready/Playing → Exit (Back | Route Change | Arena Switch | Browser Nav) → Lobby
```

The player always re-enters the Lobby in a recognizable, unchanged state — this is the platform's job, never the individual game's.

---

## 6. Game Classes

Games are organized by **rendering/runtime class**, not by which game happens to exist today. A new game is built by picking the class that matches its technology, not by resembling an existing title.

| Class | Description | Compliance | Current example(s) |
|---|---|---|---|
| **A — Iframe Games** | A self-contained HTML/JS/CSS bundle, sandboxed in an `<iframe>`, communicating with the host only via a defined message protocol (§17). | Fully specified today. | All 11 "Studio" games (Appendix D) |
| **B — React DOM Games** | Rendered directly in the host's own React tree as plain DOM/CSS, no iframe boundary. | Fully specified today. | The 6 on-chain BetSwirl games (Appendix D) |
| **C — Canvas Games** | A game that renders to an HTML `<canvas>` element owned/sized by the host (`GameStage`). | **[FUTURE]** — no sizing/DPI/resize contract exists yet (see §21 gap, Appendix F). | None today |
| **D — PixiJS Games** | A canvas-class game specifically built on PixiJS. | **[FUTURE]** — treated as a specialization of Class C once Class C's contract exists. | None today |
| **E — Phaser Games** | A canvas-class game built on the Phaser engine, typically with its own internal scene/asset lifecycle. | **[FUTURE]** — Phaser's own lifecycle would need to be reconciled with §9's canonical lifecycle. | None today |
| **F — WebGL Games** | A game rendering directly to a WebGL context (with or without a framework), including 3D content. | **[FUTURE]** — no WebGL-context release/cleanup contract exists yet (see §14). | None today |
| **G — Multiplayer Games** | A game whose round/result depends on other concurrent players, requiring a real-time connection (WebSocket or similar) the platform must be aware of for session/teardown purposes. | **[FUTURE]** — no realtime-connection ownership model exists in the platform today. | None today |
| **H — Streaming Games** | A game whose visual output is a live video/audio stream from a server (e.g. a live-dealer or cloud-rendered title), not locally rendered content. | **[FUTURE]** — no streaming transport, latency, or reconnect contract exists. | None today |

> **Current Implementation:** every game in the repository today is Class A or Class B. Whether any Class A game's *internal* iframe content happens to use canvas/WebGL was out of scope for this audit (iframe internals are opaque by design — see Appendix A §3) and must not be assumed either way.

> **Proposed Platform Standard:** Classes C–H are defined now, ahead of need, specifically so that when the first canvas, multiplayer, or streaming game is proposed, the question is "which class does it satisfy," not "what do we do, we've never had one of these."

---

## 7. Platform Ownership

The single most important contract in this document. Every integration question should be answerable by checking which side of this table it falls on.

### Tribet Platform owns

- Navigation (routing, deep links, back/forward, arena switching)
- Wallet (balance source of truth, transaction execution)
- Authentication / Account / Session identity
- The game session lifecycle (§9) and its teardown guarantees
- Accessibility baseline (§15)
- Fullscreen entry/exit mechanics (§18)
- Shared UI surfaces: dialogs, notifications, toasts, the utility bar (§13)
- Trust surfaces: fairness disclosure, support/report-issue flows
- Page chrome: header, sidebar, top bar, safe-area handling outside the game's own mount point

### Game owns

- Gameplay logic and rules
- Round/bet logic and math (subject to platform settlement contracts where applicable — see Appendix E)
- Visual identity: palette, iconography, typography **within its own surface**
- Animations and motion **within its own surface** (subject to §20's reduced-motion floor)
- Input handling within its own surface
- Its own internal audio (subject to §19's ownership/mute contract)
- Effects, celebrations, and game-specific UI **within its own surface**

### The boundary in one sentence

**A game may do anything it wants inside `GameStage`. It may do nothing outside it.**

> **Current Implementation:** `GameStage` (Appendix B) is the literal DOM boundary enforcing this today — it is the one component whose children are the game surface (`BetSwirlGame`/`ProviderGame`), and no game-rendering component exists anywhere outside it in the current tree.

---

## 8. Game Shell Compatibility

Every game, regardless of class, **[MANDATORY]** must:

- Mount entirely inside `GameStage` (or its class-appropriate future equivalent) — never render anything to a portal, a new window, or a sibling of the shell.
- Respect the width/height given to it by `GamePlayerFrame`/`GameStage` — never force its own fixed pixel dimensions that ignore the frame.
- Never alter `AppShell` (top bar, sidebar, global nav) in any way, from any depth.
- Never manipulate browser chrome (title bar spoofing, `window.open` popups for its own UI, disabling browser zoom) beyond the platform-sanctioned Fullscreen flow (§18).
- Never implement its own navigation/routing — exiting, switching games, or moving elsewhere in the product is always a platform action, never something a game calls directly.
- Never read or write wallet/balance state directly — a game requests a bet through the defined contract (§17/Appendix E) and receives a result; it never touches wallet internals.
- Never assume it is the only thing that can unmount it — a game must tolerate being torn down at any moment, for reasons entirely outside its own control (arena switch, browser Back, session expiry).

**Rationale:** these rules exist because the platform, not the game, is what a player trusts to behave consistently. A game that violates any of them breaks navigation predictability, wallet integrity, or accessibility for the entire platform, not just for itself.

> **Current Implementation:** verified via `ProviderGame.jsx`'s sandboxed iframe (`allow-scripts allow-same-origin allow-pointer-lock`, no `allow-top-navigation`, no `allow-popups`) and `BetSwirlGame.jsx`'s lack of any router/wallet import — both classes today structurally cannot violate these rules even if they tried. See Appendix B.

---

## 9. Game Lifecycle

### Canonical lifecycle (Proposed Platform Standard)

```
Created → Initializing → Loading Assets → Ready
                                              │
                                              ▼
                                            Idle
                                              │
                                              ▼
                                          Betting
                                              │
                                              ▼
                                          Playing
                                              │
                                              ▼
                                          Settling
                                              │
                                              ▼
                                          Result ──► (back to Idle)

              Ready/Idle/Betting/Playing/Settling/Result
                    ⇄ Paused ⇄ Resumed

                              │
                              ▼
                          Closing → Destroyed
```

Every state is defined regardless of Game Class — a Class G multiplayer game's "Playing" may last minutes and involve other players; a Class B on-chain game's "Playing" may be a single confirmed transaction. The state names are the platform contract; their duration and internal meaning are the game's own business.

| State | Meaning | Compliance |
|---|---|---|
| Created | The launch has been requested; nothing has mounted yet | **[MANDATORY]** |
| Initializing | The game's runtime is being constructed (iframe navigating, bundle parsing, etc.) | **[MANDATORY]** |
| Loading Assets | Game-declared assets (art, sound, config) are being fetched | **[RECOMMENDED]** as a distinct, host-visible state — see gap below |
| Ready | The game has signalled it is genuinely playable | **[MANDATORY]** |
| Idle | Ready, no round in progress, awaiting player input | **[MANDATORY]** |
| Betting | Player is composing/confirming a wager | **[MANDATORY]** for any game with a wager step |
| Playing | The round/outcome is actively resolving | **[MANDATORY]** |
| Settling | Outcome is confirmed but not yet displayed/paid | **[RECOMMENDED]** as distinct from Result — matters most for Class G/H |
| Result | Outcome is displayed to the player | **[MANDATORY]** |
| Paused | Game explicitly suspended (e.g. tab hidden, platform-initiated) without destroying it | **[FUTURE]** |
| Resumed | Returning from Paused | **[FUTURE]** |
| Closing | Teardown has begun, cleanup in progress | **[RECOMMENDED]** |
| Destroyed | Fully torn down, safe to release all resources | **[MANDATORY]** |

### Current Implementation

The repository's actual state machine (`GAME_LAUNCH_STATUS` in `lib/casinoGameLaunch.js`) is a **coarser**, launch-focused subset:

```
IDLE → REQUESTED → LOADING → READY
                       ├──► FAILED
                       ├──► UNAVAILABLE
                       └──► NOT_FOUND
```

Mapping: `REQUESTED`+`LOADING` together cover Created/Initializing/Loading Assets. **`READY` is a single catch-all that covers Idle, Betting, Playing, Settling, and Result — the platform today has no visibility into which of those five sub-states a game is actually in.** `CLOSE` resolves directly to `IDLE` in one reducer step — there is no distinct Closing state today, and no Paused/Resumed concept exists at all (see Appendix F for why this is a deliberate, disclosed simplification, not an oversight).

**Gap this creates:** the platform cannot today, for example, know a game is mid-bet when a browser tab is backgrounded, or distinguish "still thinking" from "animating a result" for analytics or for a future "confirm before leaving" prompt that isn't BetSwirl-transaction-specific. Closing this gap is a **[FUTURE]** platform investment, not something any individual game should invent on its own.

---

## 10. Game Events

A platform event contract lets any game (of any class) communicate meaningfully with the host without the host needing class-specific knowledge.

### Proposed Platform Standard — canonical event set

| Event | Direction | Meaning |
|---|---|---|
| `GameReady` | Game → Platform | The game is genuinely playable |
| `GameClosed` | Game → Platform | The game is voluntarily ending itself (e.g. a multiplayer round ended and the game wants to return to lobby) |
| `GamePaused` | Platform → Game | The platform is suspending the game (tab hidden, session concern) |
| `GameResumed` | Platform → Game | Resuming after `GamePaused` |
| `BetRequested` | Game → Platform | Player wants to place a wager of a given size/configuration |
| `BetAccepted` | Platform → Game | The wager was accepted and (where applicable) settled |
| `BetRejected` | Platform → Game | The wager could not be placed (insufficient balance, network, etc.) |
| `BalanceChanged` | Platform → Game | The player's balance changed for a reason external to this game (e.g. another tab, a deposit) |
| `SessionExpired` | Platform → Game | The player's session/account is no longer valid; the game must stop accepting input |
| `FullscreenRequested` | Game → Platform | The game wants to enter/exit fullscreen (the platform, not the game, executes it — see §18) |
| `AudioChanged` | Platform ⇄ Game | Shared mute/volume preference changed |
| `ErrorOccurred` | Game → Platform | The game hit an unrecoverable internal error and needs the platform's error UI |

### Current Implementation

Only a narrow subset exists today, and only for Class A (iframe) games, via the documented TriBet Game Bridge (`lib/gameBridge.js`, `channel: "tribet-game"` — full spec in Appendix E):

| Bridge message (today) | Maps to canonical event |
|---|---|
| `ready` | `GameReady` |
| `init` | (host → game, not in the canonical table above — bootstraps currency/balance) |
| `bet` | `BetRequested` |
| `settled` | `BetAccepted` (win or loss both arrive as `settled`, distinguished by payload) |
| `rejected` | `BetRejected` |

**`GameClosed`, `GamePaused`, `GameResumed`, `BalanceChanged` (as a distinct pushed event), `SessionExpired`, `FullscreenRequested`, `AudioChanged`, and `ErrorOccurred` as a formal event do not exist in the current protocol.** Class B (on-chain) games have **no message-based event system at all** — they communicate via plain React props (`onBusyChange`), which is not extensible to a game running in a separate browsing context. Today's `FAILED` status is host-detected (a timeout or init failure) rather than game-reported via an `ErrorOccurred` event.

---

## 11. Game Profiles

A **Game Profile** describes the space a game visually occupies — it is a display contract, not a rendering technology (a Profile is orthogonal to a Game Class: a Class A iframe game and a Class C canvas game can both be `Compact`).

### Proposed Platform Standard — profile catalogue

| Profile | Shape | Status |
|---|---|---|
| **Compact** | Small, centered, form-like content that should never dominate the viewport | Live today (`COMPACT`) |
| **Flexible** | Fills all available space, no strong aspect-ratio opinion | Live today (`FLEXIBLE`) |
| **Landscape** | Wide, fixed-aspect-ratio content, letterboxed to fit | Live today (`LANDSCAPE_WIDE`) |
| **Portrait** | Tall, fixed-aspect-ratio content | **[FUTURE]** — no current game declares this; the platform's mobile-first layout has never been tested against a portrait-locked game |
| **Square** | 1:1 fixed-aspect-ratio content | **[FUTURE]** |
| **Ultra Wide** | Very wide, cinematic aspect ratio (e.g. a live-stream/dealer feed) | **[FUTURE]** — a natural fit for Class H |
| **Custom** | A profile that doesn't fit the above; requires explicit Platform sign-off before shipping | **[FUTURE]**, always **[GAME-SPECIFIC]** by definition |

**Rule [MANDATORY]:** every game declares exactly one profile at registration time. The platform, not the game, is responsible for translating a profile into actual pixel dimensions per breakpoint (see §12).

**Rule [MANDATORY]:** adding a new profile must never require changing how existing profiles render. Profiles are additive.

> **Current Implementation:** `lib/gameDisplay.js`'s `VIEWPORT_PROFILES` implements exactly the first three rows today, with per-game overrides in `GAME_OVERRIDES` (Appendix B). No game in the current 17-title catalogue uses `orientation: "landscape"` even though the underlying field exists — meaning the rotate-hint mechanism (`needsRotateHint`) has never actually fired in production. This is disclosed evidence that the extensibility mechanism exists structurally but is functionally untested beyond its three current cases.

---

## 12. Responsive Requirements

Every game, regardless of class or profile, **[MANDATORY]** must tolerate:

- **Safe areas** — the platform reserves safe-area-inset space; a game must not assume it owns the physical screen edge, even in fullscreen.
- **High DPI** — no assumption of a specific device pixel ratio.
- **Browser zoom** — the platform's layout is not zoom-locked; a game must not break if the browser is zoomed.
- **Dynamic viewport changes** — a resize (window resize, devtools open/close, keyboard appearing on mobile) must not require a reload to recover from.
- **Orientation changes** — must be handled without a full remount, though a game may request a "please rotate" moment (see Portrait profile, §11).
- **Resize without reload** — the platform re-measures and re-applies dimensions live; a game must respond to a changed container size, not just its initial size.
- **Minimum supported dimensions [MANDATORY]** — every game must declare the smallest viewport it remains usable at.
- **Maximum supported dimensions [RECOMMENDED]** — a game should declare whether it has any upper bound (relevant for ultra-wide monitors).

> **Current Implementation:** the shell measures real, live available height (`useAvailableHeight` in `CasinoGamePage.jsx`, `getBoundingClientRect()`-based, re-measured on `resize`/`orientationchange` only — see Appendix B) rather than assuming a fixed viewport-minus-header constant. This is the one part of the current system that already matches the "no arbitrary fixed height" **[MANDATORY]** rule well. Minimum/maximum dimension *declarations* per game do not exist as an explicit field today — `contentBoxMaxWidthPx`/`contentBoxMaxHeightPx` cap the upper bound per profile, but no game declares a minimum below which it becomes unplayable.

---

## 13. UI Contracts

The platform, not the game, defines the shared vocabulary for the following surfaces. A game requests these through the platform; it does not build its own versions.

| Surface | Owner | Compliance |
|---|---|---|
| Primary Actions | Platform component library | **[MANDATORY]** for any control outside the game's own mount point (e.g. header Back) |
| Secondary Actions | Platform component library | **[MANDATORY]** outside the game surface |
| Bet Controls | **[GAME-SPECIFIC]** inside `GameStage`; the platform does not standardize a bet-slip UI across all classes today | **[GAME-SPECIFIC]** |
| Balance | Platform-owned value, game-owned display choices | **[MANDATORY]** — a game may style how it shows the number; it may never compute its own number independent of the platform-provided value (see Appendix F for where this is currently violated) |
| Potential Win | **[GAME-SPECIFIC]** display, platform-owned underlying math where settlement is platform-mediated | **[GAME-SPECIFIC]** with **[MANDATORY]** math integrity |
| Loading | Platform component (`GameLoading`) | **[MANDATORY]** |
| Validation | Platform pattern (inline, non-blocking) | **[RECOMMENDED]** |
| Errors | Platform component (`GameError`) | **[MANDATORY]** |
| Dialogs / Modals | Platform component (Radix-based `Dialog`) | **[MANDATORY]** outside the game surface |
| Notifications / Toasts | Platform-owned, coalesced | **[MANDATORY]** |
| Celebrations | **[GAME-SPECIFIC]** | **[GAME-SPECIFIC]**, subject to §20's reduced-motion floor |
| Empty States | Platform component (`EmptyState`) | **[RECOMMENDED]** |
| Tooltips | Platform component (Radix `Tooltip`) | **[RECOMMENDED]** |

> **Current Implementation:** the platform-owned utility bar today is a fixed three-action set (Game Info / Report Issue / Fullscreen — see §17 and Appendix B) applied identically regardless of game, which is consistent with "Primary/Secondary Actions are platform-owned." The **"Report Issue" label is currently misleading** — it opens the generic, non-game-aware Help & Support dialog (`SupportDialog.jsx`), not a per-game report flow. This is flagged as a concrete non-compliance with the *spirit* of a trustworthy, game-aware trust surface (see Appendix F).

---

## 14. Performance Requirements

Every game, on teardown, **[MANDATORY]** must:

- Remove every event listener it registered (window, document, or its own DOM).
- Clear every timer/interval it started.
- Cancel every in-flight animation frame loop.
- Release references that would otherwise pin memory after unmount.
- Release any audio resources it created (see §19).
- Release any WebGL context it created (`loseContext` or equivalent) — **[FUTURE]**, relevant once Class C/D/E/F games exist.
- Never block the platform's own navigation while tearing down (a slow or hung cleanup must not delay a route change).

> **Current Implementation:** verified empirically this session across repeated launch/close cycles for the current catalogue — listener add/remove counts stayed balanced, and active timer counts did not grow across cycles (Appendix A/F). No current game exercises a WebGL-context-release path since none uses WebGL from the host's perspective.

---

## 15. Accessibility Requirements

Accessibility is a **platform guarantee**, applied at the shell level, plus a **minimum floor** every game must not undermine.

**[MANDATORY]** for every game:

- Must not trap keyboard focus inside itself in a way that prevents the platform's own controls (header, utility bar) from being reachable, except while legitimately and intentionally fullscreen.
- Must not remove or override the platform's screen-reader landmarks for chrome outside its own mount point.
- Must respect a reduced-motion preference for anything the platform can detect as motion (see §20).
- Must meet minimum touch-target sizing for any of its own interactive controls that live outside the game surface (there are none by definition — but any platform-facing control, e.g. an "exit" affordance, must comply).

**[RECOMMENDED]** for every game:

- Internally usable via keyboard alone.
- Internally screen-reader-usable to the extent its content is meaningful to describe (a purely visual slot/reel game may reasonably have limited internal screen-reader value; this is a product judgment call per game, not a blanket requirement).
- Meets WCAG-level contrast for any of its own text.

**[FUTURE]:**

- Voice-control compatibility — no current mechanism, platform-wide or per-game, has been designed for this.

> **Current Implementation:** platform-level accessibility (Appendix A §16) is solid — `restoreFocusFrom` pattern, `prefers-reduced-motion` global rule, `aria-modal`/`role="dialog"` on `GameInfoPanel`, 44px/40px touch targets on shell controls. The one disclosed platform-level gap is `FavStar` being a `<span role="button">` rather than a real `<button>` — a pre-existing, widely-shared component issue, not specific to any one game.

---

## 16. Audio Standards

**Proposed Platform Standard — this category does not exist today and is being defined fresh.**

| Rule | Compliance |
|---|---|
| A game owns its own audio content and playback logic. | **[GAME-SPECIFIC]** |
| A game must expose a way for the platform to mute it (even if the game has no visible mute UI of its own). | **[FUTURE]** — no such hook exists in the current bridge protocol |
| The platform owns one shared mute/volume preference, applied consistently across every game a player opens. | **[FUTURE]** |
| A game must never autoplay audio before a genuine user gesture, respecting browser autoplay-restriction policy. | **[MANDATORY]** |
| A game must release/stop all audio on teardown — no audio may continue after the game's DOM node is removed. | **[MANDATORY]** |
| A game must not play audio while backgrounded/paused (once `GamePaused` exists — see §9/§10). | **[FUTURE]** |
| Volume/mute preference should persist per-account, not per-game, per-tab. | **[FUTURE]** |

> **Current Implementation:** confirmed via repository-wide grep — only 2 of 17 total games (`crash`, `spacex-rush`) reference audio APIs at all, and both manage it entirely internally with zero platform visibility or shared mute control. There is no shared preference, no host-level mute toggle, and no teardown guarantee beyond whatever each of those two games' own code happens to do. **This entire section is new policy, not a description of anything that exists.**

---

## 17. Fullscreen Standards

| Rule | Compliance |
|---|---|
| The platform, not the game, owns the actual Fullscreen API call (`requestFullscreen`/`exitFullscreen`). | **[MANDATORY]** |
| A game may *request* fullscreen (`FullscreenRequested`, §10) but never invoke the browser API directly. | **[MANDATORY]** |
| The fullscreen target must include every platform control the player needs while fullscreen (e.g. an exit affordance) — never fullscreen a subtree that strands a needed control outside it. | **[MANDATORY]** |
| Fullscreen must be exited automatically on teardown, regardless of teardown reason. | **[MANDATORY]** |
| A rejected/failed fullscreen request must never block navigation or leave the UI in an inconsistent state. | **[MANDATORY]** |
| Fullscreen state must not silently carry over to a different game after a launch changes. | **[RECOMMENDED]** |
| Safe-area insets remain the responsibility of whichever element is now flush with the physical screen edge. | **[MANDATORY]** |

**Rationale:** the Fullscreen API makes everything outside the fullscreened DOM subtree entirely inert to click, forced click, and keyboard focus alike. Any design that fullscreens a game surface without including the controls needed to exit it will strand the player.

> **Current Implementation:** this is the one area of the standard drawn directly and completely from a real, previously-shipped bug and its fix (Appendix F). `CasinoGamePage.jsx` originally fullscreened `GameStage` alone; `GameUtilityBar` (a sibling, not a descendant) became completely unreachable the moment fullscreen began, including its own Fullscreen/Exit control. The fix — fullscreening a wrapper containing both `GameStage` and `GameUtilityBar` — is the concrete precedent behind the "must include every control the player needs" **[MANDATORY]** rule above. Teardown-triggered auto-exit and change-of-game auto-exit are both implemented today (Appendix B).

---

## 18. Animation Standards

**Proposed Platform Standard — largely new; the platform today has only one global rule (reduced motion) and no per-category guidance.**

| Category | Standard |
|---|---|
| Celebrations | **[GAME-SPECIFIC]** content, but must respect the reduced-motion floor and must not block the player from immediately starting another round or leaving. |
| Transitions (platform-level, e.g. arena switch, page fade) | **[MANDATORY]** to use the platform's shared timing/easing tokens, not a game-specific curve. |
| Loading | **[MANDATORY]** platform-owned (`GameLoading`), never a game-specific loading animation shown before the game itself has mounted. |
| Errors | **[MANDATORY]** platform-owned, no game-specific error animation. |
| Reduced Motion | **[MANDATORY]** — every game-facing celebration/transition must have a reduced or instant variant when the platform signals `prefers-reduced-motion: reduce`. |
| Timing | **[RECOMMENDED]** — game animations should stay within a duration budget so an eager player is never forced to wait through an unskippable sequence longer than a defined ceiling (ceiling not yet set — **[FUTURE]**). |
| Performance | **[MANDATORY]** — animations must not cause layout thrashing detectable outside the game's own mount point. |
| Consistency | **[RECOMMENDED]** — a shared easing/duration vocabulary should exist so different games' celebrations don't feel jarringly different in *pace*, even if their *content* differs. |

> **Current Implementation:** the platform's global `@media (prefers-reduced-motion: reduce)` rule (Appendix A §16) collapses all host-chrome animation/transition durations to near-zero. No equivalent contract or enforcement exists for what happens *inside* a game's own mount point — this is entirely opaque, per-game territory today, with no shared timing tokens or duration ceiling defined anywhere.

---

## 19. Game Platform API

Today's TriBet Game Bridge (Appendix E) is treated here as **Version 1** of a longer-lived concept: a versioned contract between host and game.

### V1 — Current Implementation

- Transport: `window.postMessage`, `channel: "tribet-game"`.
- Messages: `ready`, `init`, `bet`, `settled`, `rejected` (full spec: Appendix E).
- Scope: economy/betting only. No lifecycle events (pause/resume), no audio hooks, no fullscreen-request channel, no error-reporting channel.
- Applies only to Class A (iframe) games; Class B (React DOM) games use plain props instead, which does not generalize to a cross-origin or cross-runtime boundary.

### Recommended Future API — Proposed Platform Standard

A versioned, class-agnostic contract exposing:

1. The full canonical event set (§10), not just the betting subset.
2. A declared **capability manifest** at registration time (does this game need audio hooks? does it support fullscreen? what's its minimum viewport?) — replacing today's `providerControls`/`hostControls` fields in `lib/gameDisplay.js`, which are already **computed but never actually consumed by any component** (verified by direct grep — see Appendix F). The intent behind those fields is sound; they should either be wired up for real or retired, not left silently inert.
3. A settlement abstraction that works whether the underlying settlement is a real on-chain transaction (Class B today), a mock/bridge balance (3 of today's Class A games), or a fully custom economy — rather than three structurally disconnected systems (Appendix F).

### Potential SDK — clearly a proposal, not a commitment

A thin client library (`@tribet/game-sdk` or similar, name illustrative only) that a Class A/C/D/E game could import to speak the V2 event contract without hand-rolling `postMessage` plumbing, mirroring how `skills/build-casino-game`'s `attachMockHost` already works today but generalized and versioned. **No such package exists. This is a proposal, not a repository feature.**

---

## 20. Compliance Levels — summary reference

This is a consolidated index of every **[MANDATORY]** rule in this document, for quick reference. (Full context for each lives in the section cited.)

- Mount only inside the platform-designated game surface (§8)
- Never alter shell/chrome/navigation/wallet/routing directly (§8)
- Tolerate being unmounted at any time, for any reason (§8)
- Emit `GameReady` (or its current equivalent) before being considered playable (§9/§10)
- Declare exactly one Game Profile at registration (§11)
- Declare a minimum supported viewport (§12)
- Use platform-owned components for Loading, Errors, Dialogs, Notifications (§13)
- Fully clean up listeners/timers/animation frames/audio on teardown (§14)
- Never trap platform-level keyboard focus except while legitimately fullscreen (§15)
- Never autoplay audio without a user gesture; release all audio on teardown (§16)
- Never call the Fullscreen API directly — only ever request it from the platform (§17)
- Respect `prefers-reduced-motion` for all game-triggered animation (§18)

Everything else in this document is **[RECOMMENDED]**, **[OPTIONAL]**, **[GAME-SPECIFIC]**, or explicitly **[FUTURE]** — read the relevant section before assuming a rule is binding.

---

## 21. Decision Records

### DR-1: Why "Provider" is being retired as ambiguous terminology
**Problem:** the codebase's `ProviderGame`/`PROVIDER_GAMES` (in-house iframe games, badged "Tribet Studio") collides with `docs/architecture/09`'s definition of "provider" (a real, licensed third-party studio integration, HMAC-authenticated, explicitly unbuilt/future). **Decision:** this standard uses **Game Class** (§6) instead of "provider" as the primary taxonomy, and treats "in-house iframe content" vs. "licensed third-party content" as a distinguishing fact about a Class A game, not a separate class of its own. **Migration consideration:** existing code/docs using "provider" to mean "any iframe game" should be understood as Class A, in-house variant, until/unless real third-party integration is built.

### DR-2: Why the canonical lifecycle (§9) is more granular than today's reducer
**Problem:** today's single `READY` status conflates five meaningfully different player states (Idle/Betting/Playing/Settling/Result), which is invisible to the platform. **Decision:** define the granular lifecycle now, as a target, without requiring an immediate rewrite of `lib/casinoGameLaunch.js`. **Rejected alternative:** leaving lifecycle granularity as "whatever each game wants to report" — rejected because it would prevent any platform-level guarantee (e.g. a future "are you sure, you're mid-bet" prompt) from ever being built consistently.

### DR-3: Why Fullscreen ownership is centralized, never delegated to a game
**Problem (real, previously shipped):** fullscreening only the game surface left a sibling utility bar — including its own Exit Fullscreen control — completely inert. **Decision:** the platform always owns the actual `requestFullscreen`/`exitFullscreen` call and always targets a wrapper that includes every control the player needs. **Rejected alternative:** letting each game manage its own fullscreen target — rejected because it reproduces the exact bug this fix resolved, once per game, forever.

### DR-4: Why Audio and Animation standards are being introduced now, ahead of any enforcement mechanism
**Problem:** these categories do not exist today (Appendix F) — only 2 of 17 games touch audio at all, with zero shared ownership, and no motion contract exists beyond the reduced-motion floor. **Decision:** define the target policy now so the *first* audio-heavy or celebration-heavy game is built against a real standard, rather than becoming the precedent that later games copy uncritically. **Migration consideration:** neither section requires retrofitting existing games; both apply going forward.

---

# Part II — Appendices

The appendices below are the original repository audit, reorganized as supporting evidence. They describe **what exists today** — they are not themselves the standard. Where Part I references "Appendix A/B/C/D/E/F," it is pointing here.

## Appendix A — Repository Audit (Narrative)

### A.1 Executive Summary

Tribet's Casino runs two structurally different kinds of game side by side, unified only at the page-chrome level: onchain "Originals" (`BetSwirlGame.jsx`, 6 BetSwirl protocol games, real wallet + Chainlink VRF) and iframe "Provider"/"Tribet Studio" games (`ProviderGame.jsx`, 11 vendored static HTML5 apps, only 3 of which are bridge-integrated with a shared mock balance — the other 8 run fully disconnected internal economies). Both converge on one shared, well-built shell: `CasinoGamePage → GamePlayerFrame → GameHeader / GameStage / GameUtilityBar`, driven by one metadata contract (`lib/gameDisplay.js`) and one launch state machine (`lib/casinoGameLaunch.js`).

The shared shell and launch/teardown lifecycle are genuinely solid: a single reducer with built-in stale-callback protection, one canonical teardown path, real Fullscreen API integration, and a documented (if narrow) game↔host postMessage protocol.

The most consequential terminology problem in the repository is that "provider" in code does not mean what `docs/architecture/09-third-party-game-providers.md` means by the same word (see Decision Record DR-1). The most consequential silent gap is that `lib/gameDisplay.js`'s `providerControls`/`hostControls` metadata is computed but never consumed by any component (verified: `grep -rn "providerControls\|hostControls" src/components/casino/*.jsx | grep -v gameDisplay` → zero results).

### A.2 Originals Inventory

"Originals" appears in exactly one place in the code: `getGameDisplayMetadata()` sets `provider: "tribet-originals"` when `game.kind === "onchain"`. All six share one component and one data file — there is no per-game folder or entry point.

| Game (`key`) | Title | `control` | `playable` | Tags | Notes |
|---|---|---|---|---|---|
| `dice` | Dice | `dice` | ✅ | popular | Verified on-chain |
| `coin-toss` | Coin Toss | `coin` | ✅ | popular | Verified on-chain |
| `roulette` | Roulette | `roulette` | ✅ | popular, live-casino | Verified on-chain |
| `keno` | Keno | `keno` | ✅ | game-shows | Uses `loadKenoConfig()` (on-chain read) |
| `wheel` | Wheel | `weighted` | ❌ | new | Reverts on testnet — catalog-only |
| `plinko` | Plinko | `weighted` | ❌ | new | Reverts on testnet — catalog-only |

No screenshots/demo pages/Storybook exist (no `.storybook` config, no Storybook dependency). Card art is static (`public/img/games/*.webp`). No owner metadata exists in the repository (no CODEOWNERS).

**Documentation gap:** `docs/architecture/07-casino-games.md` describes a larger intended catalog (PvP games, Lottery, Video Poker) and `@betswirl/ui-react` widgets — neither exists. Only `@betswirl/sdk-core` is a dependency; `BetSwirlGame.jsx` is fully hand-built.

### A.3 Provider Game Inventory

| Game (`key`) | Title | Bridge-integrated? | Economy |
|---|---|---|---|
| `crash` | Warpout | ❌ | Self-contained |
| `dice` | Vector Dice | ❌ | Self-contained |
| `coinflip` | Coin Flip | ✅ | Shared mock balance |
| `nova-wheel` | Nova Wheel | ✅ | Shared mock balance |
| `spacex-rush` | SpaceX Rush | ✅ | Shared mock balance |
| `tumble` | Tumble | ❌ | Self-contained |
| `coin-fighters` | Coin Fighters | ❌ | Self-contained |
| `raiders-escape` | Raider's Escape | ❌ | Self-contained |
| `keymines-v2` | KeyMines V2 | ❌ | Self-contained |
| `drunken-pirate` | Drunken Pirate | ❌ | Self-contained |
| `bubble-girl` | Bubble Girl | ❌ | Self-contained |

Integration is via `src/lib/gameBridge.js`'s `attachMockHost(iframe, {currency, onBalance, settle?})`, sandbox `allow-scripts allow-same-origin allow-pointer-lock`. Attachment is unconditional — called for every game once its iframe loads, regardless of whether that game's own JS speaks the protocol (inert for non-integrated games). Teardown is DOM-unmount-driven; no explicit "destroy" message is sent into the iframe.

The documented on-chain-extension path (`skills/build-casino-game/reference/on-chain-extension.md` — passing a `settle` callback so a bridge game settles via BetSwirl's `custom-weighted-game` contract) has **zero live implementations**; `gameBridge.js` supports the parameter, no call site uses it, and `useBetSwirl.js` has no `playWeighted()` wrapper.

### A.4 Shared Casino Game Architecture

```
AppShell
└── ArenaContentStage (crossfade, never unmounts on its own)
    └── ArenaErrorBoundary (remounts on arena change)
        └── product === "casino" ?
            ├── active → CasinoGamePage
            │              └── GamePlayerFrame
            │                    ├── GameHeader
            │                    └── [fullscreenTargetRef]
            │                          ├── GameStage → BetSwirlGame | ProviderGame
            │                          └── GameUtilityBar
            └── idle   → CasinoLobby → CasinoCatalog (cards/rails)
```

One canonical teardown function (`teardownActiveCasinoGame`) exists; no duplicate/competing implementation was found.

### A.5 Shell component notes

- **GamePlayerFrame** (`GamePlayerFrame.jsx`, 38 lines): shared width/height owner. Max-width applies only at `md:` and up — mobile is always full-width regardless of profile. Height is a real, definite CSS height (`useAvailableHeight`), not `min-height` — a prior bug (§ROOT CAUSE FIX comments in code) showed a `min-height`-only flex column collapses `flex-1` descendants to intrinsic size, cascading down to a 150px iframe UA default.
- **GameStage** (`GameStage.jsx`): three `sizingMode`s — `fill` (FLEXIBLE), `contain` (LANDSCAPE_WIDE, aspect-ratio clamp), `intrinsic` (COMPACT, fixed max-height, centered). No canvas ownership exists on the host side for any current game. No CSS `transform`/`zoom` scaling.
- **GameHeader** (`GameHeader.jsx`): Back (real button, disabled while `BetSwirlGame` reports a pending tx via `onBusyChange`), Favourite (`FavStar`, a `<span role="button">` — a disclosed a11y gap, shared app-wide), More (opens `GameInfoPanel`).
- **GameUtilityBar** (`GameUtilityBar.jsx`): CSS Grid, `grid-cols-3` (or `grid-cols-2` when `supportsFullscreen` is false). Docks flush against `GameStage`, zero gap, shared border/background. Game Info → `GameInfoPanel` (game-aware). Report Issue → `SupportDialog` (**not** game-aware — generic Help & Support, misleading label). Fullscreen → hidden entirely for COMPACT profile.

### A.6 Session Lifecycle (current)

`GAME_LAUNCH_STATUS`: `IDLE → REQUESTED → LOADING → READY`, or `FAILED`/`UNAVAILABLE`/`NOT_FOUND`. Every action guarded by `action.gameId === state.gameId`; `READY`/`FAILED` additionally require the status still be `REQUESTED`/`LOADING`. `<ProviderGame key={`${favId}:${attempt}`}>` forces a fresh iframe per attempt. `CLOSE` resolves directly to `IDLE`, synchronously — no distinct "closing" state exists because no exit-transition animation exists for it to represent. Close reasons: `game-back` (restores focus), `arena-switch`/`casino-navigation`/`browser-navigation` (do not restore focus).

### A.7 Routing (current)

`src/lib/routing.js` — hand-rolled, no router dependency. `/casino/:category` only; `?play=`/`?info=` layered on top. `resolveLaunchFromUrl()` (mount + every `popstate`) also checks the path still starts with `/casino` before honouring `?play=` (closes a gap where a stale query param on another path could invisibly launch a game). Refresh fully resets state; there is deliberately no "resume where you left off" — Back/Forward always produces a fresh launch attempt, never a restored one.

### A.8 Fullscreen (current) — see also DR-3

Owned by `CasinoGamePage.jsx` via `fullscreenTargetRef`, wrapping Stage+UtilityBar together (not Stage alone, after the fix described in DR-3). `fullscreenchange` listener syncs state; exits automatically on game change and on component unmount (captured target at mount time, not re-read in cleanup, to satisfy `react-hooks/exhaustive-deps`). All API calls guarded with `.catch(() => {})` so a rejected promise never stalls navigation. `supportsFullscreen` is hidden for COMPACT profile independent of actual browser capability.

### A.9 Wallet Integration (current)

Three disconnected systems: real wallet balance (`useCasinoBalance()` → `useDevAwareWallet()` → wagmi, on-chain ETH), mock "TBET" balance (`localStorage` key `tribet_mock_balance`, shared only by the 3 bridge-integrated iframe games), and 8 fully opaque per-game fake economies with zero host visibility.

### A.10 Existing Standards (current)

Pure-logic/orchestration-hook pairing repeated throughout `src/lib/` (e.g. `casinoGameLaunch.js`/`useCasinoGameLaunch.js`), each with a co-located `.test.js`. `favId` namespacing: `casino:<key>` / `provider:<key>`. No Redux/Zustand — one lifted `useReducer`. Comments explain *why*, not *what*, consistently. Two documented skills (`skills/build-casino-game`, `skills/import-casino-game`) are the actual, current "add a game" process, converging on one `PROVIDER_GAMES` entry.

## Appendix B — Current Components (reference)

| Component | File | Role |
|---|---|---|
| `BetSwirlGame` | `src/components/casino/BetSwirlGame.jsx` | All 6 Class B games |
| `ProviderGame` | `src/components/casino/ProviderGame.jsx` | All 11 Class A games + `PROVIDER_GAMES` catalog |
| `CasinoGamePage` | `src/components/casino/CasinoGamePage.jsx` | Page composition, fullscreen ownership, `useAvailableHeight` |
| `GamePlayerFrame` | `src/components/casino/GamePlayerFrame.jsx` | Shared width/height/centring |
| `GameHeader` | `src/components/casino/GameHeader.jsx` | Back/title/favourite/more |
| `GameStage` | `src/components/casino/GameStage.jsx` | Game surface mount point, sizing modes, loading/error/unavailable overlays |
| `GameUtilityBar` / `GameUtilityAction` | same directory | Game Info / Report Issue / Fullscreen |
| `GameInfoPanel` | `src/components/casino/GameInfoPanel.jsx` | Hand-rolled `role="dialog"` drawer, backed by `lib/casinoGameDetails.js` |
| `SupportDialog` | `src/components/trust/SupportDialog.jsx` | Generic Help & Support (what "Report Issue" actually opens) |
| `lib/gameDisplay.js` | — | `DISPLAY_PROFILE`, `VIEWPORT_PROFILES`, `GAME_OVERRIDES`, `getGameDisplayMetadata()` |
| `lib/casinoGameLaunch.js` / `useCasinoGameLaunch.js` | — | Launch reducer + orchestration hook |
| `lib/gameBridge.js` | — | `attachMockHost`, the V1 Game Platform API transport |
| `lib/casinoGameplayViewport.js` | — | Viewport/orientation classification, `needsRotateHint` |

## Appendix C — Current Routes

- `/casino/:category` — Lobby (category-scoped)
- `/casino/:category?play=<favId>` — active game
- `/casino/:category?info=<favId>` — Game Info panel (composable with `?play=`)

## Appendix D — Current Game Inventory (combined)

17 total games: 6 Class B (onchain, `casino:*`) + 11 Class A (iframe, `provider:*`). See Appendix A.2/A.3 for full tables. `public/games/` folders: `bubble-girl`, `coin-fighters`, `coinflip`, `crash`, `dice`, `drunken-pirate`, `keymines-v2`, `nova-wheel`, `raiders-escape`, `spacex-rush`, `tumble` (11, matching `PROVIDER_GAMES`).

## Appendix E — Current Bridge Protocol (V1 Game Platform API)

`src/lib/gameBridge.js`, `skills/build-casino-game/reference/bridge-protocol.md`. Transport: `window.postMessage`, `channel: "tribet-game"`.

| Message | Direction | Payload (as documented) |
|---|---|---|
| `ready` | Game → Host | Game has loaded and initialized |
| `init` | Host → Game | Bootstraps currency/starting balance |
| `bet` | Game → Host | `{amount, outcomes: [{label, weight, multiplier}]}` |
| `settled` | Host → Game | Result of a weighted draw |
| `rejected` | Host → Game | Bet could not be placed |

Host settlement today uses `Math.random()`-weighted `settleBet()`, not an on-chain draw (see A.3's on-chain-extension note).

## Appendix F — Known Technical Debt / Inconsistencies

1. **"Provider" naming collision** — see DR-1.
2. **Two unrelated economies for "Studio" games** — 3 of 11 share a mock balance; 8 of 11 are fully opaque. No `game.economyType` field or similar makes this explicit.
3. **`providerControls`/`hostControls` computed, never consumed** — confirmed via grep; `GameUtilityBar` always renders exactly 3 fixed actions regardless of these fields.
4. **"Report Issue" does not report an issue** — opens the generic Help & Support dialog with zero game context.
5. **`@betswirl/ui-react` documented, not installed** — `docs/architecture/07` recommends it; not a dependency. `BetSwirlGame.jsx` is fully hand-built instead.
6. **On-chain extension for iframe games is a guide with zero implementations** — `settle` parameter exists, unused everywhere.
7. **`FavStar` is a `<span role="button">`, not a `<button>`** — shared app-wide, a real, disclosed accessibility gap.
8. **No audio ownership model exists at all** — only 2 of 17 games touch audio, zero shared mute/volume, zero platform visibility.
9. **No animation/motion contract beyond the global reduced-motion rule** — nothing governs per-game celebration/transition timing or budget.
10. **No canvas/WebGL/multiplayer/streaming contract exists** — because no game of those classes exists yet; this is a designed-for gap (§6), not an oversight, but it is a real, current absence.
11. One `GameStage` sizing bug class was found and fixed this session (min-height vs. definite height) — no second competing implementation was found elsewhere.
12. One Fullscreen sibling-reachability bug was found and fixed this session (see DR-3) — the fix is now codified as a **[MANDATORY]** rule (§17) so it cannot silently regress in a future redesign.

---

*This document supersedes the standalone repository audit (`tribet-originals-system-audit.md`) as the primary reference for the Tribet Originals Game System. That file remains in the repository unmodified; its content is fully preserved here in Appendices A–F.*
