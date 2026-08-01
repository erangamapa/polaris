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
  // Whether signing in can succeed on this deployment at all (see
  // api/auth/session.js). Starts true so the UI does not flash a "sync
  // unavailable" notice before the first check has answered.
  const [sessionsAvailable, setSessionsAvailable] = useState(true);
  const sessionsAvailableRef = useRef(true);
  // Caches the capability answer for the page load — it is a property of the
  // deployment, not of the wallet, so it is asked once and reused.
  const capabilityRef = useRef(null);

  const envelopeRef = useRef(envelope);
  envelopeRef.current = envelope;

  const timerRef = useRef(null);
  // Set once the player says no to the signature. Blocks automatic re-prompting
  // — being asked to sign on every toggle is exactly the nagging this design
  // exists to avoid. Cleared only by an explicit opt-in (see enableSync).
  const declinedRef = useRef(false);
  // Spent as soon as ONE automatic signature prompt has been raised for this
  // wallet on this page load, whatever its outcome. Only an explicit user
  // action clears it (see enableSync) — nothing automatic ever re-arms it.
  const autoSignInUsedRef = useRef(false);
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

  // Resolves whether sign-in can work, asking the server if nobody has yet.
  //
  // This exists to close a race that would otherwise produce exactly the wallet
  // popup this design is meant to prevent: `sessionsAvailable` starts optimistic
  // so the UI does not flicker, and the connect effect corrects it — but a
  // player who changes a setting before that request lands would hit `flush`
  // while the optimistic `true` is still in place, and get a signature prompt
  // that cannot succeed. Awaiting the real answer removes the window entirely.
  //
  // Fails CLOSED: an unreachable or malformed answer counts as "cannot sign in",
  // because the cost of being wrong in that direction is a missed background
  // sync, while being wrong the other way is an unwanted wallet popup. The
  // failed answer is not cached, so a transient network blip is retried rather
  // than disabling sync for the whole page load.
  const ensureSessionsAvailable = useCallback(async () => {
    if (capabilityRef.current) return capabilityRef.current;

    const pending = (async () => {
      const { body } = await jsonFetch('/api/auth/session');
      if (typeof body?.sessionsAvailable !== 'boolean') {
        capabilityRef.current = null;
        return false;
      }
      sessionsAvailableRef.current = body.sessionsAvailable;
      setSessionsAvailable(body.sessionsAvailable);
      return body.sessionsAvailable;
    })().catch(() => {
      capabilityRef.current = null;
      return false;
    });

    capabilityRef.current = pending;
    return pending;
  }, []);

  const flush = useCallback(async () => {
    const current = addressRef.current;
    const toPush = envelopeRef.current;
    if (!current) {
      setSyncState(SYNC_STATE.LOCAL);
      return;
    }

    if (await push(toPush) !== null) return;

    // A 401 here means no live session. AT MOST ONE automatic wallet prompt is
    // ever raised per page load — `autoSignInUsedRef` is what guarantees it.
    //
    // Without that guarantee this degenerates into a signature prompt on every
    // single settings change, and it is NOT a hypothetical: if the server
    // cannot verify the session cookie it just issued (a deployment with no
    // SESSION_SECRET gives each serverless instance its own ephemeral signing
    // key, so a cookie signed by one instance is rejected by the next), every
    // push 401s, and re-prompting on each one turns a background save into an
    // endless stream of wallet popups. The client must not be able to do that
    // to a player no matter how the server misbehaves.
    //
    // So: one automatic attempt. If a signature is obtained and the very next
    // push STILL 401s, the session is not sticking — stop, stay local, and let
    // the player decide via the explicit "Sync to wallet" control.
    // Never ask for a signature the server cannot honour (see
    // api/auth/session.js's sessionsAvailable) — the player would approve a
    // wallet prompt and get nothing for it. Awaited, not read from the ref, so
    // this holds even on the very first change after connecting.
    if (!(await ensureSessionsAvailable())) {
      setSyncState(SYNC_STATE.LOCAL);
      return;
    }
    if (declinedRef.current || autoSignInUsedRef.current) {
      setSyncState(declinedRef.current ? SYNC_STATE.DECLINED : SYNC_STATE.ERROR);
      return;
    }
    autoSignInUsedRef.current = true;

    if (!(await signIn(current))) return;
    if (await push(envelopeRef.current) === null) setSyncState(SYNC_STATE.ERROR);
  }, [push, signIn, ensureSessionsAvailable]);

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
    if (!current || !(await ensureSessionsAvailable())) return false;
    // The one and only thing that re-arms automatic syncing, precisely because
    // it is a deliberate press of a button rather than a background retry.
    declinedRef.current = false;
    autoSignInUsedRef.current = true;
    if (!(await signIn(current))) return false;
    const saved = (await push(envelopeRef.current)) !== null;
    if (!saved) setSyncState(SYNC_STATE.ERROR);
    return saved;
  }, [push, signIn, ensureSessionsAvailable]);

  // Wallet changed (connected, disconnected, or switched account): swap to that
  // account's local bucket, then — WITHOUT prompting — see whether a session
  // already exists and reconcile with the server if so.
  useEffect(() => {
    addressRef.current = address;
    declinedRef.current = false;
    autoSignInUsedRef.current = false;

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

      // Seed the capability cache from this same response so ensureSessionsAvailable
      // does not repeat the request on the first settings change.
      if (typeof session.body?.sessionsAvailable === 'boolean') {
        sessionsAvailableRef.current = session.body.sessionsAvailable;
        setSessionsAvailable(session.body.sessionsAvailable);
        capabilityRef.current = Promise.resolve(session.body.sessionsAvailable);
      }

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
    sessionsAvailable,
    enableSync,
    // True when there is something worth syncing, it is only on this device,
    // AND the deployment can actually complete a sign-in — offering "sync to my
    // wallet" when the server cannot hold a nonce would be offering a button
    // that always fails.
    canOfferSync: Boolean(address) && !isSignedIn && sessionsAvailable && hasStoredSettings(envelope.data),
  }), [envelope.data, readSettings, updateGroup, syncState, isSignedIn, persistent, sessionsAvailable, enableSync, address]);

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
    sessionsAvailable: true,
    enableSync: async () => false,
    canOfferSync: false,
  };
}
