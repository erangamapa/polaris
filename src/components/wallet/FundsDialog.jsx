import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, LogOut } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { baseSepolia } from "@shared/chains";
import { cn } from "@/lib/utils";

// The one Tribet wallet popup — every wallet entry point in the app opens
// this (see WALLET UX AUDIT §1/§7: "AppKit owns connection only, Tribet
// owns the entire connected-wallet experience"). One screen, no tabs, no
// nested pages, and — per the PREMIUM DISCONNECT FLOW task — exactly one
// modal node for the whole wallet/disconnect interaction: disconnecting
// is a STATE this one Dialog moves through, never a second Dialog stacked
// on top of it.
const FLOW = {
  WALLET: "wallet",
  CONFIRM_DISCONNECT: "confirmDisconnect",
  DISCONNECTING: "disconnecting",
  DISCONNECT_SUCCESS: "disconnectSuccess",
  DISCONNECT_ERROR: "disconnectError",
};

// The shell's fixed content height — every state renders inside this so the
// outer modal never resizes between them (see PREMIUM DISCONNECT FLOW §9:
// "the shell never changes, only its content changes"). Sized to the
// Wallet state's own natural height, the tallest of the five.
const SHELL_MIN_HEIGHT = 336;
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
// transitions to rest (see PREMIUM DISCONNECT FLOW §7). Timers are always
// cleared on re-trigger/unmount so a fast Cancel-then-Disconnect can't leave
// a stale transition finishing later (see §16 — "cancel outdated animation
// timers/listeners").
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
  const disconnectingRef = useRef(false); // rapid-interaction guard — see §16
  const cancelRef = useRef(null);
  const continueRef = useRef(null);
  const { displayState, className: crossfadeClassName } = useCrossfade(flowState);

  // Fresh open always starts at `wallet` (never mid-flow) — and closing
  // clears any transient flow state so it can never survive a reopen (see
  // §17: "State Reset").
  useEffect(() => {
    if (open) {
      setFlowState(FLOW.WALLET);
      disconnectingRef.current = false;
    }
  }, [open]);

  // Reactive to real wallet state, not just our own flow (see §15 —
  // "Already-Disconnected Edge Case"): if the wallet disconnects
  // externally while the confirmation/error screen is open, that IS the
  // outcome the user was asking for — go straight to success instead of
  // asking them to disconnect an already-disconnected wallet. If it
  // happens on the plain wallet screen, fall back to the pre-existing
  // behavior (close — nothing honest left to show).
  useEffect(() => {
    if (!open || isConnected) return;
    if (flowState === FLOW.WALLET) { onClose(); return; }
    if (flowState === FLOW.CONFIRM_DISCONNECT || flowState === FLOW.DISCONNECT_ERROR) {
      setFlowState(FLOW.DISCONNECT_SUCCESS);
    }
  }, [open, isConnected, flowState, onClose]);

  // Focus follows the DISPLAYED state (after the crossfade swap), not the
  // logical target — matches §13: "focus Cancel" entering confirm/error,
  // "focus Continue" entering success, never defaulting to the
  // destructive action.
  useEffect(() => {
    if (displayState === FLOW.CONFIRM_DISCONNECT || displayState === FLOW.DISCONNECT_ERROR) {
      cancelRef.current?.focus();
    } else if (displayState === FLOW.DISCONNECT_SUCCESS) {
      continueRef.current?.focus();
    }
  }, [displayState]);

  // X / Escape / backdrop all funnel through Radix's one onOpenChange — so
  // one state-aware handler covers all three dismiss gestures identically
  // per state (see §11/§12/§13, which all specify the same target
  // behavior for each): disconnecting ignores them outright (§11 — "do not
  // pretend the operation can be cancelled"), confirm/error step back to
  // wallet instead of closing, wallet/success close for real.
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
    if (disconnectingRef.current) return; // §16 — only one disconnect() in flight, ever
    disconnectingRef.current = true;
    setFlowState(FLOW.DISCONNECTING);
    const startedAt = Date.now();
    try {
      // disconnectAsync resolving IS the "genuinely completed" signal (see
      // §5) — it's wagmi's own disconnect mutation, not a wrapper around
      // one; no new wallet logic, just the async variant of the same
      // useDisconnect() hook already used elsewhere in this app.
      await disconnectAsync();
      const elapsed = Date.now() - startedAt;
      // §24 — avoid a flash if it resolved instantly, but never hold the
      // user past the stated ceiling.
      if (elapsed < 220) await new Promise((r) => setTimeout(r, 220 - elapsed));
      setFlowState(FLOW.DISCONNECT_SUCCESS);
    } catch (err) {
      // Technical detail stays in the console — never surfaced to the
      // player (see §14).
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm" onCloseAutoFocus={onCloseAutoFocus}>
        <div
          className={cn("flex flex-col", crossfadeClassName)}
          style={{ minHeight: SHELL_MIN_HEIGHT }}
        >
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
      </DialogContent>
    </Dialog>
  );
}

function WalletBody({
  address, connectorName, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError,
  isZero, explorer, copied, onCopy, onDisconnectRequest,
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Wallet</DialogTitle>
        <DialogDescription className="sr-only">Your connected wallet.</DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {/* CONNECTED */}
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
          <WalletAvatar address={address} size={32} />
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
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}
            </button>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              aria-label="View on explorer"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>

        {/* BALANCE — the one number this popup exists to show. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          {casinoBalanceLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : casinoBalanceError ? (
            <div className="text-sm font-medium text-muted-foreground">Balance unavailable</div>
          ) : (
            <div className="font-mono text-4xl font-bold tabular-nums">
              {casinoBalance.toFixed(3)} <span className="text-2xl font-semibold text-muted-foreground">{casinoSymbol}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{baseSepolia.name} Testnet</div>

          {isZero && (
            <a
              href="https://portal.cdp.coinbase.com/products/faucet"
              target="_blank"
              rel="noreferrer"
              className="mt-3 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              No balance available. Get testnet ETH →
            </a>
          )}
        </div>
      </div>

      <button
        onClick={onDisconnectRequest}
        data-test-id="disconnect"
        className="mt-4 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="size-4" /> Disconnect Wallet
      </button>
    </>
  );
}

function ConfirmBody({ flowState, cancelRef, onCancel, onDisconnect }) {
  const isDisconnecting = flowState === FLOW.DISCONNECTING;
  const isError = flowState === FLOW.DISCONNECT_ERROR;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Disconnect Wallet?</DialogTitle>
        <DialogDescription>
          Your wallet will be disconnected from Tribet. You&rsquo;ll need to reconnect it before playing again.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        {isError && (
          <p className="text-sm font-medium text-[var(--danger)]" role="alert">
            Couldn&rsquo;t disconnect the wallet. Please try again.
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          ref={cancelRef}
          onClick={onCancel}
          disabled={isDisconnecting}
          data-test-id="disconnect-cancel"
          className="flex-1 rounded-lg border py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          data-test-id="disconnect-confirm"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Disconnecting…
            </>
          ) : isError ? "Try Again" : "Disconnect"}
        </button>
      </div>
    </>
  );
}

function SuccessBody({ continueRef, onContinue }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Wallet Disconnected</DialogTitle>
        <DialogDescription className="sr-only">You can reconnect at any time.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span
          className="grid size-10 place-items-center rounded-full bg-[var(--success-bg)] text-[var(--success)] animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none"
          aria-hidden="true"
        >
          <Check className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">You can reconnect at any time.</p>
      </div>

      <button
        ref={continueRef}
        onClick={onContinue}
        data-test-id="disconnect-continue"
        className="mt-4 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Continue
      </button>
    </>
  );
}
