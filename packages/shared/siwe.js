// SIWE — Sign-In With Ethereum (EIP-4361) message build + parse.
//
// WHY THIS EXISTS: this app has no login screen and never will (the wallet is
// the identity — see src/components/wallet/ProfileMenu.jsx's logged-out body,
// which deliberately refuses to imply a separate login flow). But the settings
// API still has to know a request genuinely belongs to the address it claims,
// or anyone could read and overwrite any player's settings by guessing a
// wallet address. SIWE is how that proof is made: the player signs one plain
// message with the wallet they already connected, the server recovers the
// signer, and from then on a session cookie carries the identity — no further
// prompts, no password, no email.
//
// Shared between client and server on purpose: the client builds the message,
// the server parses it back and checks every field it cares about. One format
// definition, so the two can never drift apart.
//
// Deliberately a MINIMAL EIP-4361 implementation: this app always issues its
// own messages, so only the fields it issues are supported (no Resources
// block, no Request ID, no Not Before). Anything else in a submitted message
// is a message this app did not create, which is exactly what parse() should
// reject.
export const SIWE_VERSION = '1';

// The one statement players see in their wallet. Worth keeping short and
// literal — a signature request is the one moment the player is asked to trust
// this app, so the text says exactly what the signature does and, just as
// importantly, what it does not do.
export const SIWE_STATEMENT = 'Sign in to save your TriBet settings to this wallet. This does not authorise any transaction or transfer of funds.';

const FIELD_ORDER = ['URI', 'Version', 'Chain ID', 'Nonce', 'Issued At', 'Expiration Time'];

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

export function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

// Nonces are opaque to this module — it only enforces that one is present and
// is plausible (EIP-4361 requires at least 8 alphanumeric characters), never
// where it came from. The server is the only thing that knows which nonces it
// actually issued (see api/_session.js).
export function isValidNonce(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9]{8,}$/.test(value);
}

// Builds the exact string the wallet will display and sign. `issuedAt` and
// `expiresAt` are passed in as epoch ms rather than read from the clock here
// so the caller owns the timing (and so this stays pure and testable).
export function buildSiweMessage({ domain, address, uri, chainId, nonce, issuedAt, expiresAt, statement = SIWE_STATEMENT }) {
  if (!isNonEmptyString(domain)) throw new Error('siwe: domain is required');
  if (!isAddress(address)) throw new Error('siwe: address must be a 0x-prefixed 20-byte hex string');
  if (!isNonEmptyString(uri)) throw new Error('siwe: uri is required');
  if (!Number.isInteger(chainId)) throw new Error('siwe: chainId must be an integer');
  if (!isValidNonce(nonce)) throw new Error('siwe: nonce must be at least 8 alphanumeric characters');
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) throw new Error('siwe: issuedAt and expiresAt are required');

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${SIWE_VERSION}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(issuedAt).toISOString()}`,
    `Expiration Time: ${new Date(expiresAt).toISOString()}`,
  ].join('\n');
}

// Strict inverse of buildSiweMessage. Returns `{ ok: false, reason }` rather
// than throwing, because every failure here is an untrusted-input failure the
// caller wants to turn into a 401 — not an exception to unwind.
export function parseSiweMessage(message) {
  if (!isNonEmptyString(message)) return { ok: false, reason: 'empty-message' };

  const lines = message.split('\n');
  // 1 header + 1 address + blank + statement + blank + 6 fields.
  if (lines.length !== 11) return { ok: false, reason: 'unexpected-line-count' };

  const header = /^(\S+) wants you to sign in with your Ethereum account:$/.exec(lines[0]);
  if (!header) return { ok: false, reason: 'bad-header' };
  if (lines[2] !== '' || lines[4] !== '') return { ok: false, reason: 'bad-layout' };

  const address = lines[1];
  if (!isAddress(address)) return { ok: false, reason: 'bad-address' };

  const fields = {};
  for (let i = 0; i < FIELD_ORDER.length; i++) {
    const expected = FIELD_ORDER[i];
    const line = lines[5 + i];
    // Order is fixed, not just presence — a message whose fields are shuffled
    // is not a message this app built, so it is rejected rather than
    // leniently re-assembled.
    if (typeof line !== 'string' || !line.startsWith(`${expected}: `)) {
      return { ok: false, reason: `bad-field:${expected}` };
    }
    fields[expected] = line.slice(expected.length + 2);
  }

  if (fields.Version !== SIWE_VERSION) return { ok: false, reason: 'bad-version' };
  if (!isValidNonce(fields.Nonce)) return { ok: false, reason: 'bad-nonce' };

  const chainId = Number(fields['Chain ID']);
  if (!Number.isInteger(chainId)) return { ok: false, reason: 'bad-chain-id' };

  const issuedAt = Date.parse(fields['Issued At']);
  const expiresAt = Date.parse(fields['Expiration Time']);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return { ok: false, reason: 'bad-timestamps' };
  if (expiresAt <= issuedAt) return { ok: false, reason: 'expiry-before-issue' };

  return {
    ok: true,
    domain: header[1],
    address,
    statement: lines[3],
    uri: fields.URI,
    chainId,
    nonce: fields.Nonce,
    issuedAt,
    expiresAt,
  };
}

// The server-side field check, kept here beside the parser so "what a valid
// message means" lives in one file. Separate from parseSiweMessage because
// parsing is about shape (does this look like our message) while this is about
// context (is it OUR message, for THIS host, right now, with a nonce we
// issued) — the caller supplies the context.
export function verifySiweFields(parsed, { domain, nonce, now, maxAgeMs }) {
  if (!parsed?.ok) return { ok: false, reason: parsed?.reason ?? 'unparsed' };
  if (parsed.domain !== domain) return { ok: false, reason: 'domain-mismatch' };
  // `nonce` is optional. A caller holding one expected value compares it here;
  // a caller that instead validates single-use against its own store (see
  // api/auth/verify.js's consumeNonce, which both checks and spends the nonce
  // atomically) has a strictly stronger check and passes nothing, rather than
  // handing in the parsed nonce and making this comparison vacuous.
  if (nonce !== undefined && nonce !== null && parsed.nonce !== nonce) return { ok: false, reason: 'nonce-mismatch' };
  if (now >= parsed.expiresAt) return { ok: false, reason: 'expired' };
  // Guards against a signature harvested long ago being replayed with a
  // freshly-issued nonce: the message itself must also be recent, not merely
  // unexpired. A message claiming to be issued in the future is equally
  // suspect, so both directions are bounded.
  if (parsed.issuedAt > now + 60_000) return { ok: false, reason: 'issued-in-future' };
  if (now - parsed.issuedAt > maxAgeMs) return { ok: false, reason: 'stale' };
  return { ok: true };
}
