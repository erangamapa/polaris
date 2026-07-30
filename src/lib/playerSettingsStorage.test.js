import { describe, it, expect, beforeEach } from "vitest";
import { createEnvelope } from "@shared/playerSettings";
import { DEVICE_KEY, readAccountEnvelope, readEnvelope, reconcile, storageKey, writeEnvelope } from "./playerSettingsStorage";

// Same in-memory localStorage shim the rest of src/lib/*.test.js uses — no DOM
// is needed, this module only calls getItem/setItem.
let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
});

const ADDRESS_A = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";
const ADDRESS_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("storageKey", () => {
  it("scopes per wallet and lowercases so casing never forks the bucket", () => {
    expect(storageKey(ADDRESS_A)).toBe(`tribet.settings.v1.${ADDRESS_A.toLowerCase()}`);
    expect(storageKey(ADDRESS_A.toLowerCase())).toBe(storageKey(ADDRESS_A));
  });

  it("falls back to the device bucket with no wallet", () => {
    expect(storageKey(null)).toBe(DEVICE_KEY);
    expect(storageKey(undefined)).toBe(DEVICE_KEY);
  });
});

describe("readEnvelope / writeEnvelope", () => {
  it("round-trips a saved envelope", () => {
    writeEnvelope(ADDRESS_A, createEnvelope({ preferences: { currency: "EUR" } }, 500));
    const read = readEnvelope(ADDRESS_A);
    expect(read.updatedAt).toBe(500);
    expect(read.data.preferences.currency).toBe("EUR");
  });

  it("returns the empty envelope for an absent or corrupt entry", () => {
    expect(readEnvelope(ADDRESS_A).updatedAt).toBe(0);
    store.set(storageKey(ADDRESS_A), "{not json");
    expect(readEnvelope(ADDRESS_A).updatedAt).toBe(0);
  });

  it("normalises on read, so a blob from an older build cannot reach the UI raw", () => {
    store.set(storageKey(ADDRESS_A), JSON.stringify({ updatedAt: 1, data: { preferences: { oddsFormat: "martian" }, goneGroup: 1 } }));
    const read = readEnvelope(ADDRESS_A);
    expect(read.data.preferences.oddsFormat).toBe("decimal");
    expect(read.data).not.toHaveProperty("goneGroup");
  });

  it("never throws when localStorage is unavailable", () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("quota"); },
    };
    expect(readEnvelope(ADDRESS_A).updatedAt).toBe(0);
    expect(() => writeEnvelope(ADDRESS_A, createEnvelope({}, 1))).not.toThrow();
  });
});

// SEED-ON-CONNECT is the rule worth pinning down: choices made before
// connecting must survive the first connect, but must never leak between two
// wallets used in the same browser.
describe("readAccountEnvelope", () => {
  it("seeds a first-time wallet from the pre-connect device blob", () => {
    writeEnvelope(null, createEnvelope({ preferences: { currency: "GBP" } }, 100));
    expect(readAccountEnvelope(ADDRESS_A).data.preferences.currency).toBe("GBP");
  });

  it("prefers the wallet's own bucket once it has one", () => {
    writeEnvelope(null, createEnvelope({ preferences: { currency: "GBP" } }, 100));
    writeEnvelope(ADDRESS_A, createEnvelope({ preferences: { currency: "EUR" } }, 50));
    // Older than the device blob, and still wins — this is scoping, not a merge.
    expect(readAccountEnvelope(ADDRESS_A).data.preferences.currency).toBe("EUR");
  });

  it("does not leak one wallet's settings into another", () => {
    writeEnvelope(ADDRESS_A, createEnvelope({ preferences: { currency: "EUR" } }, 100));
    expect(readAccountEnvelope(ADDRESS_B).data.preferences.currency).toBe("USD");
  });

  it("returns the device blob when there is no wallet", () => {
    writeEnvelope(null, createEnvelope({ preferences: { currency: "GBP" } }, 100));
    expect(readAccountEnvelope(null).data.preferences.currency).toBe("GBP");
  });

  it("is empty when nothing has ever been saved", () => {
    expect(readAccountEnvelope(ADDRESS_A).updatedAt).toBe(0);
  });
});

describe("reconcile", () => {
  it("keeps the newer side and persists the result", () => {
    const local = createEnvelope({ preferences: { currency: "GBP" } }, 200);
    const remote = createEnvelope({ preferences: { currency: "EUR" } }, 100);

    expect(reconcile(ADDRESS_A, local, remote).data.preferences.currency).toBe("GBP");
    // Persisted, so the next boot starts from the reconciled answer.
    expect(readEnvelope(ADDRESS_A).data.preferences.currency).toBe("GBP");
  });

  it("adopts the server copy when it is newer", () => {
    const local = createEnvelope({ preferences: { currency: "GBP" } }, 100);
    const remote = createEnvelope({ preferences: { currency: "EUR" } }, 300);
    expect(reconcile(ADDRESS_A, local, remote).data.preferences.currency).toBe("EUR");
    expect(readEnvelope(ADDRESS_A).data.preferences.currency).toBe("EUR");
  });
});
