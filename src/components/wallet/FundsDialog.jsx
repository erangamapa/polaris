import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, LogOut } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter, ModalIcon } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { baseSepolia } from "@shared/chains";
import { cn } from "@/lib/utils";

// The one Tribet wallet popup — every wallet entry point in the app opens
// this (see WALLET UX AUDIT §1/§7: "AppKit owns connection only, Tribet
// owns the entire connected-wallet experience"). One Dialog root for the
// whole wallet/disconnect interaction; each state below is CONTENT this
// one root swaps, never a second modal stacked on top of it. This is also
// the reference implementation for Tribet's shared Modal system (see
// components/ui/modal.jsx) — size/variant/dismissible per state, content-
// driven height, no forced fixed shell.
const FLOW = {
  WALLET: "wallet",
  CONFIRM_DISCONNECT: "confirmDisconnect",
  DISCONNECTING: "disconnecting",
  DISCONNECT_SUCCESS: "disconnectSuccess",
  DISCONNECT_ERROR: "disconnectError",
};

// Which Modal size/dismissibility each state uses — see MODAL SIZE SYSTEM
// ("lg: content-heavy detail views" fits the Wallet screen; "sm: simple
// confirmation/success/warning" fits the rest) and CLOSE BUTTON
// CONVENTION (X only where there's no explicit decision control already
// defining the exit path).
const STATE_CHROME = {
  [FLOW.WALLET]: { size: "lg", dismissible: true },
  [FLOW.CONFIRM_DISCONNECT]: { size: "sm", dismissible: false },
  [FLOW.DISCONNECTING]: { size: "sm", dismissible: false },
  [FLOW.DISCONNECT_ERROR]: { size: "sm", dismissible: false },
  [FLOW.DISCONNECT_SUCCESS]: { size: "sm", dismissible: false },
};

const LEAVE_MS = 200;

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
    isConnected, address, connectorName, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError,
    disconnectAsync,
  } = useWallet();

  const [flowState, setFlowState] = useState(FLOW.WALLET);
  const [copied, setCopied] = useState(false);
  const disconnectingRef = useRef(false); // rapid-interaction guard
  const cancelRef = useRef(null);
  const continueRef = useRef(null);
  const { displayState, className: crossfadeClassName } = useCrossfade(flowState);

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
  const isZero = !casinoBalanceLoading && !casinoBalanceError && casinoBalance === 0;

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

  const chrome = STATE_CHROME[displayState];

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent size={chrome.size} dismissible={chrome.dismissible} onCloseAutoFocus={onCloseAutoFocus}>
        <div className={crossfadeClassName}>
          {displayState === FLOW.WALLET && (
            <WalletBody
              address={address}
              connectorName={connectorName}
              casinoBalance={casinoBalance}
              casinoSymbol={casinoSymbol}
              casinoBalanceLoading={casinoBalanceLoading}
              casinoBalanceError={casinoBalanceError}
              isZero={isZero}
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
  address, connectorName, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError,
  isZero, explorer, copied, onCopy, onDisconnectRequest,
}) {
  return (
    <>
      <ModalHeader>
        <ModalTitle>Wallet</ModalTitle>
        <ModalDescription className="sr-only">Your connected wallet.</ModalDescription>
      </ModalHeader>

      {/* WALLET IDENTITY — the one boxed sub-surface in this modal (bg-card
          is genuinely a darker inset tone than the modal's own bg-secondary,
          not just a second copy of the same fill — see AGENTS.md's Modal
          system note on surface hierarchy). The balance below is
          deliberately NOT boxed the same way: contrast between "grouped
          identity" and "open balance" is what reads as hierarchy, not
          wrapping everything in an identical card. */}
      <div className="mt-3 flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
        <WalletAvatar address={address} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold">{shortAddress(address)}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]">
              <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" /> Connected
            </span>
          </div>
          {connectorName && <div className="truncate text-xs text-muted-foreground">{connectorName}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onCopy}
            aria-label="Copy address"
            data-test-id="wallet-copy"
            className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}
          </button>
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            aria-label="View on explorer"
            className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>

      {/* BALANCE — the visual focal point of the modal. Floats directly on
          the modal surface (no card), with the numeric value clearly
          dominant over the symbol next to it. */}
      <div className="mt-4 text-center">
        {casinoBalanceLoading ? (
          <Skeleton className="mx-auto h-8 w-32" />
        ) : casinoBalanceError ? (
          <div className="text-sm font-medium text-muted-foreground">Balance unavailable</div>
        ) : (
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-mono text-3xl font-bold tabular-nums">{casinoBalance.toFixed(3)}</span>
            <span className="text-sm font-medium text-muted-foreground">{casinoSymbol}</span>
          </div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">{baseSepolia.name} Testnet</div>

        {isZero && (
          <p className="mt-2 text-xs text-muted-foreground">
            No balance available.{" "}
            <a
              href="https://portal.cdp.coinbase.com/products/faucet"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--global-cta-hover)] hover:underline"
            >
              Get testnet ETH →
            </a>
          </p>
        )}
      </div>

      {/* FOOTER — a real divider, not just a gap, so the destructive action
          reads as belonging to its own zone. */}
      <div className="mt-3 border-t pt-2">
        <button
          onClick={onDisconnectRequest}
          data-test-id="disconnect"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)]/40 hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <>
      <ModalHeader>
        <ModalTitle>Disconnect Wallet?</ModalTitle>
        <ModalDescription>
          Your wallet will be disconnected from Tribet. You&rsquo;ll need to reconnect it before playing again.
        </ModalDescription>
      </ModalHeader>

      {isError && (
        <p className="mt-3 text-sm font-medium text-[var(--danger)]" role="alert">
          Couldn&rsquo;t disconnect the wallet. Please try again.
        </p>
      )}

      <ModalFooter className="grid grid-cols-2">
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
    <>
      <ModalHeader>
        <ModalTitle>Wallet Disconnected</ModalTitle>
        <ModalDescription className="sr-only">You can reconnect at any time.</ModalDescription>
      </ModalHeader>

      <div className="mt-3 flex items-center gap-3">
        <ModalIcon variant="success" icon={Check} className="animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">You can reconnect at any time.</p>
      </div>

      <ModalFooter>
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
