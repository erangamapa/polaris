import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, LogOut, Unlink2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter, ModalIcon } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { WalletProviderIcon } from "@/components/wallet/WalletProviderIcon";
import { useAssetPrice } from "@/lib/useAssetPrice";
import { fmtUsd, fmtUsdSpoken } from "@/lib/format";
import { baseSepolia, CHAINS_BY_ID } from "@shared/chains";
import { cn } from "@/lib/utils";

// The one Tribet wallet popup — every wallet entry point in the app opens
// this (see WALLET UX AUDIT §1/§7: "AppKit owns connection only, Tribet
// owns the entire connected-wallet experience"). One Dialog root for the
// whole wallet/disconnect interaction; each state below is CONTENT this
// one root swaps, never a second modal stacked on top of it. This is also
// the reference implementation for Tribet's shared Modal system (see
// components/ui/modal.jsx) — every state uses the SAME fixed
// `transactional` shell (~420x400) so the frame never resizes moving
// between them; only `dismissible` (the X) varies per state.
const FLOW = {
  WALLET: "wallet",
  CONFIRM_DISCONNECT: "confirmDisconnect",
  DISCONNECTING: "disconnecting",
  DISCONNECT_SUCCESS: "disconnectSuccess",
  DISCONNECT_ERROR: "disconnectError",
};

// Only dismissibility (the X) varies per state — see CLOSE BUTTON
// CONVENTION: X only where there's no explicit decision control already
// defining the exit path. Size is constant (`transactional`) for all of
// them; see MODAL_SIZE in components/ui/modal.jsx for why.
const DISMISSIBLE = {
  [FLOW.WALLET]: true,
  [FLOW.CONFIRM_DISCONNECT]: false,
  [FLOW.DISCONNECTING]: false,
  [FLOW.DISCONNECT_ERROR]: false,
  [FLOW.DISCONNECT_SUCCESS]: false,
};

const LEAVE_MS = 200;

// Shared typography for this flow's ModalHeader — bigger/more considered
// than the app-wide dialog-title default (18px, sized for smaller utility
// dialogs like Support/KYC) since this title is the visual anchor players
// actually pause on. No existing token sits in the 26-28px range, so this
// is a deliberate arbitrary value rather than a reused one — defined once
// here and reused by all three states instead of repeated per body (see
// TYPOGRAPHY task: "one consistent typography hierarchy for all Wallet
// modal states"). Always left-aligned, overriding ModalHeader's default
// `text-center` on mobile — the title never centers in this flow.
const TITLE_CLASS = "text-left text-[26px] font-semibold leading-[1.2]";
// Supporting body copy: text-base (16px, an existing Tailwind token) +
// leading-normal (1.5, the closest existing token to the requested 1.45)
// + max-w-sm (384px, closest existing token to the requested 360-400px).
const BODY_TEXT_CLASS = "text-left text-base leading-normal text-muted-foreground max-w-sm";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// Two-phase crossfade between whichever state is actually rendered
// (`displayState`) and the logical target (`flowState`) — outgoing content
// fades/slides out, THEN the new content mounts already offset and
// transitions to rest. The modal's size legitimately changes between
// states now (lg Wallet vs sm confirm/success — see MOST IMPORTANT FIX:
// "do not use the same tall dimensions"), so this only smooths the
// CONTENT swap, not a claim that the frame itself stays static. Timers
// are always cleared on re-trigger/unmount so a fast Cancel-then-
// Disconnect can't leave a stale transition finishing later.
function useCrossfade(flowState) {
  const reducedMotion = usePrefersReducedMotion();
  const [displayState, setDisplayState] = useState(flowState);
  const [phase, setPhase] = useState("idle"); // 'idle' | 'leaving' | 'entering'

  useEffect(() => {
    if (flowState === displayState) return undefined;
    if (reducedMotion) {
      setDisplayState(flowState);
      setPhase("idle");
      return undefined;
    }
    setPhase("leaving");
    const leaveTimer = setTimeout(() => {
      setDisplayState(flowState);
      setPhase("entering");
    }, LEAVE_MS);
    return () => clearTimeout(leaveTimer);
  }, [flowState, displayState, reducedMotion]);

  useEffect(() => {
    if (phase !== "entering") return undefined;
    const raf = requestAnimationFrame(() => setPhase("idle"));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const className = reducedMotion
    ? ""
    : cn(
        "transition-all duration-200 ease-out",
        phase === "leaving" && "opacity-0 translate-y-1.5",
        phase === "entering" && "!transition-none opacity-0 -translate-y-1",
        phase === "idle" && "opacity-100 translate-y-0"
      );

  return { displayState, className };
}

export function FundsDialog({ open, onClose, onCloseAutoFocus }) {
  const {
    isConnected, address, connectorName, connectorIcon, chainId, casinoBalance, casinoSymbol,
    casinoBalanceLoading, casinoBalanceError, disconnectAsync,
  } = useWallet();

  const [flowState, setFlowState] = useState(FLOW.WALLET);
  const [copied, setCopied] = useState(false);
  const disconnectingRef = useRef(false); // rapid-interaction guard
  const cancelRef = useRef(null);
  const continueRef = useRef(null);
  const { displayState, className: crossfadeClassName } = useCrossfade(flowState);

  // Secondary, informational-only USD estimate — see USD CONVERSION task's
  // IMPORTANT ARCHITECTURE: never the wallet balance's source of truth, and
  // a price-service failure here can't touch isConnected/casinoBalance/
  // anything above. `enabled: open` is the whole polling lifecycle: starts
  // on open, silently refreshes at most once/60s, stops the instant the
  // modal closes (see that hook for the full cache policy).
  const { usd: assetUsdPrice } = useAssetPrice(casinoSymbol, { enabled: open });

  // Fresh open always starts at `wallet` (never mid-flow), and closing
  // clears any transient flow state so it can never survive a reopen.
  useEffect(() => {
    if (open) {
      setFlowState(FLOW.WALLET);
      disconnectingRef.current = false;
    }
  }, [open]);

  // Reactive to real wallet state, not just our own flow: if the wallet
  // disconnects externally while the confirmation/error screen is open,
  // that IS the outcome the user was asking for — go straight to success
  // instead of asking them to disconnect an already-disconnected wallet.
  // On the plain wallet screen, close — nothing honest left to show.
  useEffect(() => {
    if (!open || isConnected) return;
    if (flowState === FLOW.WALLET) { onClose(); return; }
    if (flowState === FLOW.CONFIRM_DISCONNECT || flowState === FLOW.DISCONNECT_ERROR) {
      setFlowState(FLOW.DISCONNECT_SUCCESS);
    }
  }, [open, isConnected, flowState, onClose]);

  // Focus follows the DISPLAYED state (after the crossfade swap): Cancel
  // entering confirm/error, Continue entering success — never the
  // destructive action by default.
  useEffect(() => {
    if (displayState === FLOW.CONFIRM_DISCONNECT || displayState === FLOW.DISCONNECT_ERROR) {
      cancelRef.current?.focus();
    } else if (displayState === FLOW.DISCONNECT_SUCCESS) {
      continueRef.current?.focus();
    }
  }, [displayState]);

  // X / Escape / backdrop all funnel through Radix's one onOpenChange —
  // one state-aware handler covers all three dismiss gestures per state.
  // Escape/backdrop at confirm/error resolve to the SAME state as Cancel
  // (not a bypass of the decision — the neutral outcome), matching
  // ACCESSIBILITY: "Escape behavior should follow that same product rule
  // rather than silently bypassing the intended interaction." Disconnect
  // in flight ignores dismissal outright (nothing to cancel).
  const handleOpenChange = (next) => {
    if (next) return;
    if (flowState === FLOW.DISCONNECTING) return;
    if (flowState === FLOW.CONFIRM_DISCONNECT || flowState === FLOW.DISCONNECT_ERROR) {
      setFlowState(FLOW.WALLET);
      return;
    }
    onClose();
  };

  const explorer = `${baseSepolia.blockExplorers.default.url}/address/${address}`;
  // Resolved from the ACTUAL connected chain, not hardcoded to Base Sepolia
  // — see NETWORK NAME: "do not hardcode 'Base Sepolia Testnet' except
  // where the current network genuinely is Base Sepolia... Ethereum
  // Mainnet, Base, Solana, etc. should work automatically." An unrecognized
  // chainId (wallet manually switched elsewhere) falls back to a plain
  // "Chain <id>" label rather than lying about which network it is.
  const chain = CHAINS_BY_ID[chainId];
  const networkName = chain?.displayName ?? `Chain ${chainId}`;
  const isTestnet = Boolean(chain?.testnet);
  const isZero = !casinoBalanceLoading && !casinoBalanceError && casinoBalance === 0;
  // From the raw numeric balance, never the `.toFixed(3)`-rounded display
  // string — see NUMBER CALCULATION: "do not round the crypto balance
  // first and then calculate."
  const usdValue = !casinoBalanceLoading && !casinoBalanceError && assetUsdPrice != null
    ? casinoBalance * assetUsdPrice
    : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked — icon simply doesn't confirm */
    }
  };

  const runDisconnect = async () => {
    if (disconnectingRef.current) return; // only one disconnect() in flight, ever
    disconnectingRef.current = true;
    setFlowState(FLOW.DISCONNECTING);
    const startedAt = Date.now();
    try {
      // disconnectAsync resolving IS the "genuinely completed" signal —
      // it's wagmi's own disconnect mutation, not a wrapper around one.
      await disconnectAsync();
      const elapsed = Date.now() - startedAt;
      // Avoid a flash if it resolved instantly, but never hold the user
      // past ~220ms.
      if (elapsed < 220) await new Promise((r) => setTimeout(r, 220 - elapsed));
      setFlowState(FLOW.DISCONNECT_SUCCESS);
    } catch (err) {
      // Technical detail stays in the console — never surfaced to the player.
      console.error("Wallet disconnect failed:", err);
      disconnectingRef.current = false;
      setFlowState(FLOW.DISCONNECT_ERROR);
    }
  };

  // This is the CONNECTED-wallet screen — it has nothing honest to show
  // once disconnected (no fake address/avatar/balance). Only guards the
  // `wallet` state specifically: `disconnectSuccess` is EXPECTED to render
  // with isConnected === false (that's the whole point of it).
  if (flowState === FLOW.WALLET && !isConnected) return null;

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent size="transactional" dismissible={DISMISSIBLE[displayState]} onCloseAutoFocus={onCloseAutoFocus} className="py-4">
        <div className={cn("flex flex-1 flex-col", crossfadeClassName)}>
          {displayState === FLOW.WALLET && (
            <WalletBody
              address={address}
              connectorName={connectorName}
              connectorIcon={connectorIcon}
              networkName={networkName}
              casinoBalance={casinoBalance}
              casinoSymbol={casinoSymbol}
              casinoBalanceLoading={casinoBalanceLoading}
              casinoBalanceError={casinoBalanceError}
              isZero={isZero}
              usdValue={usdValue}
              isTestnet={isTestnet}
              explorer={explorer}
              copied={copied}
              onCopy={copy}
              onDisconnectRequest={() => setFlowState(FLOW.CONFIRM_DISCONNECT)}
            />
          )}

          {(displayState === FLOW.CONFIRM_DISCONNECT || displayState === FLOW.DISCONNECTING || displayState === FLOW.DISCONNECT_ERROR) && (
            <ConfirmBody
              flowState={displayState}
              cancelRef={cancelRef}
              onCancel={() => setFlowState(FLOW.WALLET)}
              onDisconnect={runDisconnect}
            />
          )}

          {displayState === FLOW.DISCONNECT_SUCCESS && (
            <SuccessBody continueRef={continueRef} onContinue={onClose} />
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

function WalletBody({
  address, connectorName, connectorIcon, networkName, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError,
  isZero, usdValue, isTestnet, explorer, copied, onCopy, onDisconnectRequest,
}) {
  // Only ever offer the faucet helper where it's actually true — testnet
  // AND genuinely empty — see DEV-ONLY / TESTNET-ONLY LOGIC: "do NOT show
  // 'Get testnet ETH' on production mainnet... do not bake development UI
  // into the real production wallet state."
  const showTestnetHelper = isTestnet && isZero;

  return (
    <>
      <ModalHeader className="text-left">
        <ModalTitle className={TITLE_CLASS}>Wallet</ModalTitle>
        <ModalDescription className="sr-only">Your connected wallet.</ModalDescription>
      </ModalHeader>

      {/* WALLET IDENTITY — the one boxed sub-surface in this modal (bg-card
          is genuinely a darker inset tone than the modal's own bg-secondary,
          not just a second copy of the same fill — see AGENTS.md's Modal
          system note on surface hierarchy). Sits right under the header.
          Three-part row (icon / address+network, flexible / fixed utility
          actions) — see WALLET IDENTITY REWORK's IDENTITY BLOCK ALIGNMENT.
          Provider name is no longer its own text row (see REMOVE PROVIDER
          LABEL FROM THE UI) — it's carried by the icon's accessible name
          instead, and network now lives here instead of under the balance
          (see NETWORK NAME: "there must be only one network label in the
          modal"). */}
      <div className="mt-3 flex shrink-0 items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <WalletProviderIcon key={connectorName} connectorName={connectorName} connectorIcon={connectorIcon} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold">{shortAddress(address)}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]">
              <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" /> Connected
            </span>
          </div>
          <div className="truncate text-sm text-muted-foreground">{networkName}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onCopy}
            aria-label="Copy wallet address"
            data-test-id="wallet-copy"
            className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? <Check className="size-4.5 text-[var(--success)]" /> : <Copy className="size-4.5" />}
          </button>
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            aria-label="View address on block explorer"
            className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-4.5" />
          </a>
        </div>
      </div>

      {/* CONTENT — two independently-positioned pieces per WALLET IDENTITY
          REWORK's target composition: the ETH+USD cluster centers in
          whatever space sits ABOVE the testnet helper (nested flex-1, no
          magic-number gap needed), and the helper itself sits low, near
          the footer, read as contextual/dev assistance rather than part of
          the balance (see MOVE DEV / TESTNET HELPER DOWN). Network no
          longer renders here at all — it moved into the identity card
          above (see NETWORK NAME: "only one network label in the modal"). */}
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {casinoBalanceLoading ? (
            <Skeleton className="mx-auto h-9 w-36" />
          ) : casinoBalanceError ? (
            <div className="text-sm font-medium text-muted-foreground">Balance unavailable</div>
          ) : (
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-mono text-[36px] font-bold tabular-nums">{casinoBalance.toFixed(3)}</span>
              <span className="text-base font-medium text-muted-foreground">{casinoSymbol}</span>
            </div>
          )}

          {/* USD ESTIMATE — secondary/informational only, never the
              balance's source of truth (see USD CONVERSION task's
              IMPORTANT ARCHITECTURE). Always rendered once the balance
              itself has loaded, even before a price has ("≈ — USD"), so
              this line's own height is reserved up front and nothing
              shifts when the real value arrives. One cluster with the
              crypto balance above it — clearly secondary (muted, no blue)
              but not tiny. */}
          {!casinoBalanceLoading && !casinoBalanceError && (
            <p className="mt-1.5 text-lg leading-tight font-medium text-muted-foreground">
              <span aria-hidden="true">
                ≈ {usdValue != null ? fmtUsd(usdValue) : "—"} USD
                {isTestnet && (
                  <abbr
                    title="Market-rate estimate only. Testnet ETH has no real monetary value."
                    className="cursor-help no-underline"
                  >
                    *
                  </abbr>
                )}
              </span>
              <span className="sr-only">
                {usdValue != null
                  ? `Approximate value: ${fmtUsdSpoken(usdValue)} USD.${isTestnet ? " Market-rate estimate only — testnet ETH has no real monetary value." : ""}`
                  : "Approximate USD value unavailable."}
              </span>
            </p>
          )}
        </div>

        {showTestnetHelper && (
          <p className="pb-7 text-center text-sm text-muted-foreground">
            No balance available.{" "}
            <a
              href="https://portal.cdp.coinbase.com/products/faucet"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--global-cta-hover)] hover:underline"
            >
              Get testnet ETH →
            </a>
          </p>
        )}
      </div>

      {/* FOOTER — a real divider, not just a gap, so the destructive action
          reads as belonging to its own zone. Fixed height, pinned to the
          bottom of the shell. */}
      <div className="shrink-0 border-t pt-4">
        <button
          onClick={onDisconnectRequest}
          data-test-id="disconnect"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" /> Disconnect Wallet
        </button>
      </div>
    </>
  );
}

function ConfirmBody({ flowState, cancelRef, onCancel, onDisconnect }) {
  const isDisconnecting = flowState === FLOW.DISCONNECTING;
  const isError = flowState === FLOW.DISCONNECT_ERROR;

  return (
    // Same three-zone grid as WalletBody (header top-left, content flex-1,
    // footer bottom) — a wrapping "center the whole group" div here is
    // exactly what pulled this state's title away from Wallet's own
    // top-left title position (see WALLET SUBSTATE COMPOSITION task's CORE
    // LAYOUT RULE: "all three Wallet states must share the same internal
    // vertical structure... do not vertically center an entire substate").
    // ModalHeader is a direct child of the shared crossfade flex column
    // again, same as Wallet's, so its rendered x/y is identical across
    // states by construction, not by matching numbers.
    <>
      <ModalHeader className="gap-4 text-left">
        <ModalTitle className={TITLE_CLASS}>Disconnect Wallet?</ModalTitle>
        <ModalDescription className={BODY_TEXT_CLASS}>
          Your wallet will be disconnected from Tribet. You&rsquo;ll need to reconnect it before playing again.
        </ModalDescription>
      </ModalHeader>

      {/* Flexible space lives BETWEEN the copy and the footer, not around
          the whole group — the error message (when present) stays glued
          to the copy above it, never floating mid-modal. */}
      <div className="flex flex-1 flex-col">
        {isError && (
          <p className="mt-4 text-sm font-medium text-[var(--danger)]" role="alert">
            Couldn&rsquo;t disconnect the wallet. Please try again.
          </p>
        )}
      </div>

      <ModalFooter className="mt-0 grid shrink-0 grid-cols-2">
        <button
          ref={cancelRef}
          onClick={onCancel}
          disabled={isDisconnecting}
          data-test-id="disconnect-cancel"
          className="rounded-lg border py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          data-test-id="disconnect-confirm"
          className="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Disconnecting…
            </>
          ) : isError ? "Try Again" : "Disconnect"}
        </button>
      </ModalFooter>
    </>
  );
}

function SuccessBody({ continueRef, onContinue }) {
  return (
    // Same three-zone grid as WalletBody/ConfirmBody — see CORE LAYOUT RULE.
    // ModalHeader is a direct child of the shared crossfade flex column
    // again, giving this title the identical top-left position as the
    // other two states by construction.
    <>
      <ModalHeader className="text-left">
        <ModalTitle className={TITLE_CLASS}>Wallet Disconnected</ModalTitle>
        <ModalDescription className="sr-only">You can reconnect at any time.</ModalDescription>
      </ModalHeader>

      {/* Disconnected is a neutral system-state, not a completed positive
          outcome — no green check (see SEMANTIC CONVENTION: green is for
          genuinely positive completed outcomes only; disconnected/signed-
          out is the neutral-light-gray case). Icon + message form ONE
          horizontal row, left-aligned to the same content edge as the
          title above — a centered stacked block here is exactly what made
          this state read as disconnected from the rest of the flow. */}
      <div className="mt-6 flex shrink-0 items-center gap-3">
        <ModalIcon variant="neutral" icon={Unlink2} className="border border-border/60" />
        <p className="text-sm text-muted-foreground">You can reconnect at any time.</p>
      </div>

      {/* Flexible space between the status row and the footer, same
          pattern as ConfirmBody — never a wrapper centering the whole
          state as a group. */}
      <div className="flex-1" aria-hidden="true" />

      <ModalFooter className="mt-0 shrink-0">
        <button
          ref={continueRef}
          onClick={onContinue}
          data-test-id="disconnect-continue"
          className="flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Continue
        </button>
      </ModalFooter>
    </>
  );
}
