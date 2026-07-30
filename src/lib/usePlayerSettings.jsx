import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { DEFAULT_SETTINGS, applySettingsPatch, createEnvelope, hasStoredSettings } from '@shared/playerSettings';
import { buildSiweMessage } from '@shared/siwe';
import { readAccountEnvelope, reconcile, writeEnvelope } from './playerSettingsStorage';

// PER-PLAYER SETTINGS — the one store every persisted preference in the app
// reads and writes through. Local-first: localStorage answers the first frame,
// the server is the durable cross-device copy, and the two reconcile by
// last-write-wins (see packages/shared/playerSettings.js).
//
// NO LOGIN SCREEN, AND NO SIGNATURE ON CONNECT. This is the central design
// constraint: the wallet is the identity, and the player must never be met with
// an auth gate. So the flow is deliberately lazy —
//
//   connect wallet      -> nothing happens. No prompt.
//   already have a live session -> settings sync silently in the background.
//   change a setting with no session -> ONE wallet signature, then it syncs.
//   decline that signature -> settings still work, saved on this device, and
//                             we never ask again unless the player asks us to.
//
// The signature is not a login. It proves the request owns the address so the
// settings API can refuse to hand one player's settings to another (wallet
// addresses are public, so without it any address's settings would be readable
// and writable by anyone). See packages/shared/siwe.js.
const SettingsCtx = createContext(null);

// How long to sit on changes before pushing. Long enough that dragging a limit
// input or clicking three toggles is one request, short enough to feel saved.
const PUSH_DEBOUNCE_MS = 800;

const SIWE_TTL_MS = 5 * 60 * 1000;

export const SYNC_STATE = {
  // Working, but this device only — no wallet, or no session and we have not
  // asked for one.
  LOCAL: 'local',
  SIGNING: 'signing',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  // The player declined the signature. Settings still work locally; we stop
  // asking, and the UI offers an explicit way to turn syncing on.
  DECLINED: 'declined',
  ERROR: 'error',
};

const jsonFetch = async (url, options) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  let body = null;
  try { body = await response.json(); } catch { /* empty or non-JSON body */ }
  return { status: response.status, ok: response.ok, body };
};

export function PlayerSettingsProvider({ children }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  // Read synchronously on first render so the very first paint already has the
  // player's real currency/odds format rather than defaults that visibly
  // correct themselves a moment later.
  const [envelope, setEnvelope] = useState(() => readAccountEnvelope(null));
  const [syncState, setSyncState] = useState(SYNC_STATE.LOCAL);
  const [isSignedIn, setIsSignedIn] = useState(false);
  // Whether the SERVER has durable storage configured. Surfaced so the UI can
  // tell the player the truth when it does not (see api/_kv.js's fallback) —
  // never claim a save that will not survive.
  const [persistent, setPersistent] = useState(true);

  const envelopeRef = useRef(envelope);
  envelopeRef.current = envelope;

  const timerRef = useRef(null);
  // Set once the player says no to the signature. Blocks automatic re-prompting
  // — being asked to sign on every toggle is exactly the nagging this design
  // exists to avoid. Cleared only by an explicit opt-in (see enableSync).
  const declinedRef = useRef(false);
  const addressRef = useRef(address);

  const apply = useCallback((next, { local = null } = {}) => {
    setEnvelope(next);
    writeEnvelope(local ?? addressRef.current, next);
  }, []);

  // Sends the current blob up. Returns the server's envelope (which carries the
  // server's timestamp — one clock for all devices, see api/settings.js) or
  // null if it could not be saved.
  const push = useCallback(async (toPush) => {
    setSyncState(SYNC_STATE.SYNCING);
    const { status, ok, body } = await jsonFetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: toPush.data }),
    });

    if (status === 401) {
      setIsSignedIn(false);
      return null;
    }
    if (!ok || !body?.envelope) {
      setSyncState(SYNC_STATE.ERROR);
      return null;
    }

    if (typeof body.persistent === 'boolean') setPersistent(body.persistent);
    apply(body.envelope);
    setSyncState(SYNC_STATE.SYNCED);
    return body.envelope;
  }, [apply]);

  // The one place a wallet signature is ever requested.
  const signIn = useCallback(async (signerAddress) => {
    setSyncState(SYNC_STATE.SIGNING);
    try {
      const nonceRes = await jsonFetch('/api/auth/nonce');
      if (!nonceRes.ok || !nonceRes.body?.nonce) {
        setSyncState(SYNC_STATE.ERROR);
        return false;
      }

      const issuedAt = Date.now();
      const message = buildSiweMessage({
        domain: nonceRes.body.domain,
        address: signerAddress,
        uri: nonceRes.body.uri,
        chainId,
        nonce: nonceRes.body.nonce,
        issuedAt,
        expiresAt: issuedAt + SIWE_TTL_MS,
      });

      const signature = await signMessageAsync({ message });
      const verified = await jsonFetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verified.ok) {
        setSyncState(SYNC_STATE.ERROR);
        return false;
      }
      setIsSignedIn(true);
      return true;
    } catch {
      // The overwhelmingly common case here is the player closing the wallet
      // prompt, which is a choice, not a fault — so it is not surfaced as an
      // error, and it stops us asking again.
      declinedRef.current = true;
      setSyncState(SYNC_STATE.DECLINED);
      return false;
    }
  }, [chainId, signMessageAsync]);

  const flush = useCallback(async () => {
    const current = addressRef.current;
    const toPush = envelopeRef.current;
    if (!current) {
      setSyncState(SYNC_STATE.LOCAL);
      return;
    }

    if (await push(toPush) !== null) return;

    // 401 — no live session. Ask for one signature, unless the player already
    // said no, then retry exactly once.
    if (declinedRef.current) {
      setSyncState(SYNC_STATE.LOCAL);
      return;
    }
    if (!(await signIn(current))) return;
    await push(envelopeRef.current);
  }, [push, signIn]);

  const schedulePush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, PUSH_DEBOUNCE_MS);
  }, [flush]);

  // THE WRITE PATH for every setting in the app. Optimistic by design: state
  // and localStorage update immediately, so the UI never waits on a network
  // call (or a signature) to reflect what the player just did.
  const updateGroup = useCallback((group, patch) => {
    const next = createEnvelope(applySettingsPatch(envelopeRef.current.data, group, patch), Date.now());
    envelopeRef.current = next;
    apply(next);
    schedulePush();
  }, [apply, schedulePush]);

  // Explicit opt-in, for the player who declined earlier (or who wants their
  // existing local settings pushed up). This is the ONLY thing that clears the
  // declined flag — hence a deliberate user action, never inferred.
  const enableSync = useCallback(async () => {
    const current = addressRef.current;
    if (!current) return false;
    declinedRef.current = false;
    if (!(await signIn(current))) return false;
    return (await push(envelopeRef.current)) !== null;
  }, [push, signIn]);

  // Wallet changed (connected, disconnected, or switched account): swap to that
  // account's local bucket, then — WITHOUT prompting — see whether a session
  // already exists and reconcile with the server if so.
  useEffect(() => {
    addressRef.current = address;
    declinedRef.current = false;

    const local = readAccountEnvelope(address);
    envelopeRef.current = local;
    setEnvelope(local);
    setSyncState(SYNC_STATE.LOCAL);
    setIsSignedIn(false);

    if (!address) return;

    let cancelled = false;
    (async () => {
      const session = await jsonFetch('/api/auth/session');
      if (cancelled) return;

      // A session for a DIFFERENT address is not ours to use — the player
      // switched accounts in their wallet. Left alone, no prompt.
      if (session.body?.address !== address.toLowerCase()) return;
      setIsSignedIn(true);

      const remote = await jsonFetch('/api/settings');
      if (cancelled) return;
      if (remote.status === 401) {
        setIsSignedIn(false);
        return;
      }
      if (!remote.ok || !remote.body?.envelope) {
        setSyncState(SYNC_STATE.ERROR);
        return;
      }

      if (typeof remote.body.persistent === 'boolean') setPersistent(remote.body.persistent);

      const merged = reconcile(address, envelopeRef.current, remote.body.envelope);
      envelopeRef.current = merged;
      setEnvelope(merged);
      setSyncState(SYNC_STATE.SYNCED);

      // Local was ahead of the server (settings changed on this device while
      // signed out, or seeded from the pre-connect device blob) — push so the
      // player's other devices catch up. Already signed in, so no prompt.
      if (merged.updatedAt > remote.body.envelope.updatedAt) await push(merged);
    })();

    return () => { cancelled = true; };
  }, [address, push]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Synchronous read of the CURRENT settings, bypassing React state. Needed by
  // callers that fire several updates within one tick and must each see the
  // previous one's result — App.jsx's favorite toggle is the case that matters:
  // two rapid star clicks both read before a re-render, and reading `settings`
  // from context would hand them the same stale snapshot twice, so the second
  // click would recompute the same flip instead of reversing the first. This
  // mirrors the functional-setState pattern that code relied on before
  // favorites moved into this store.
  const readSettings = useCallback(() => envelopeRef.current.data, []);

  const value = useMemo(() => ({
    settings: envelope.data,
    readSettings,
    updateGroup,
    syncState,
    isSignedIn,
    persistent,
    enableSync,
    // True when there is something worth syncing but it is only on this device
    // — what the UI needs to decide whether offering "sync to my wallet" is
    // even meaningful.
    canOfferSync: Boolean(address) && !isSignedIn && hasStoredSettings(envelope.data),
  }), [envelope.data, readSettings, updateGroup, syncState, isSignedIn, persistent, enableSync, address]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

// Falls back to defaults with no-op writers rather than throwing, so a
// component rendered outside the provider (a test, a storybook-style preview)
// still renders instead of crashing the tree.
export function usePlayerSettings() {
  return useContext(SettingsCtx) ?? {
    settings: DEFAULT_SETTINGS,
    readSettings: () => DEFAULT_SETTINGS,
    updateGroup: () => {},
    syncState: SYNC_STATE.LOCAL,
    isSignedIn: false,
    persistent: true,
    enableSync: async () => false,
    canOfferSync: false,
  };
}
