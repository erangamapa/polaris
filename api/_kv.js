// Key-value storage for the thin backend — Upstash Redis over its REST API.
//
// WHY REST AND NOT A CLIENT LIBRARY: these are Vercel serverless functions.
// A connection-pooling database client is the wrong shape here (every cold
// invocation opens a connection and the pool is exhausted under load); an HTTP
// request has no pool and no handshake to amortise. It also means zero new npm
// dependencies — this is `fetch` and nothing else.
//
// DURABILITY: Upstash persists writes to block storage, so this is a store of
// record, not a cache. Two things would make it behave like a cache, and
// neither is done here: setting a TTL on data that should outlive a session
// (only nonces get one — see `setEx`), and enabling eviction on the database
// (a console setting; it must stay OFF, or a player who has not visited in
// months becomes exactly the least-recently-used key that gets dropped).
//
// SWAPPING STORES: everything in this file is behind get/set/del/getDel. Moving
// to Postgres later means rewriting this one file — no API route and no client
// code touches the storage layer directly.
const REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// FALLBACK — with no Upstash credentials configured, storage degrades to a
// per-process Map so the app still builds, runs and is fully clickable locally
// before anyone provisions a database. It is NOT durable: it dies with the
// process, and on serverless each instance has its own copy. `isPersistent`
// exists so callers (and /api/settings' response) can tell the player the
// honest truth — settings are being kept for this session only — rather than
// claiming a save that will vanish.
export const isPersistent = Boolean(REST_URL && REST_TOKEN);

const memory = new Map();

const now = () => Date.now();

function memoryGet(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

// One shape for every Redis call: POST the command as a JSON array. Errors are
// thrown so callers can decide between "degrade quietly" (a settings read can
// fall back to local state) and "fail loudly" (a settings write must not report
// success it did not achieve).
async function command(args) {
  const response = await fetch(REST_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${REST_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(`redis ${args[0]} failed: ${response.status}`);
  }
  const payload = await response.json();
  if (payload.error) throw new Error(`redis ${args[0]} failed: ${payload.error}`);
  return payload.result ?? null;
}

export async function get(key) {
  if (!isPersistent) return memoryGet(key);
  return command(['GET', key]);
}

export async function set(key, value) {
  if (!isPersistent) {
    memory.set(key, { value, expiresAt: 0 });
    return;
  }
  await command(['SET', key, value]);
}

// TTL'd write, used ONLY for SIWE nonces — short-lived by definition (a nonce
// that outlives its sign-in attempt is a replay window). Player settings are
// never written through this.
export async function setEx(key, value, ttlSeconds) {
  if (!isPersistent) {
    memory.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    return;
  }
  await command(['SET', key, value, 'EX', String(ttlSeconds)]);
}

export async function del(key) {
  if (!isPersistent) {
    memory.delete(key);
    return;
  }
  await command(['DEL', key]);
}

// Atomic read-and-delete. This atomicity is the whole point for nonces: two
// concurrent requests replaying the same signature must not both see the nonce
// as valid, and GETDEL guarantees exactly one of them does.
export async function getDel(key) {
  if (!isPersistent) {
    const value = memoryGet(key);
    memory.delete(key);
    return value;
  }
  return command(['GETDEL', key]);
}
