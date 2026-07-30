import { describe, it, expect } from "vitest";
import { dueRemindersAt, formatElapsed, msUntilNextReminder, reminderMessage } from "./realityCheck";

// The reality-check reminder is the ONE Responsible Gaming control this app
// genuinely enforces, so its schedule is worth pinning down properly — in
// particular the two ways a naive repeating timer gets this wrong: drifting, and
// firing a burst of catch-up reminders after a background tab wakes up.
const START = Date.parse("2026-07-30T12:00:00.000Z");
const minutes = (n) => START + n * 60_000;

describe("dueRemindersAt", () => {
  it("reports no reminder before the first interval elapses", () => {
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, now: minutes(29) })).toBe(0);
  });

  it("reports the milestone once the interval elapses", () => {
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, now: minutes(30) })).toBe(1);
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, now: minutes(61) })).toBe(2);
  });

  // The background-tab case: asleep through three intervals should surface ONE
  // reminder for where the player actually is, not three stacked ones.
  it("collapses missed intervals into the latest milestone", () => {
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, lastNotifiedCount: 0, now: minutes(95) })).toBe(3);
  });

  it("never re-reports a milestone already announced", () => {
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, lastNotifiedCount: 2, now: minutes(61) })).toBe(2);
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, lastNotifiedCount: 3, now: minutes(61) })).toBe(3);
  });

  it("is inert when no interval is configured", () => {
    for (const interval of [null, undefined, 0, -30, NaN]) {
      expect(dueRemindersAt({ startedAt: START, intervalMinutes: interval, now: minutes(120) })).toBe(0);
    }
  });

  it("is inert for a nonsensical clock", () => {
    expect(dueRemindersAt({ startedAt: START, intervalMinutes: 30, now: minutes(-10) })).toBe(0);
    expect(dueRemindersAt({ startedAt: NaN, intervalMinutes: 30, now: minutes(60) })).toBe(0);
  });
});

describe("msUntilNextReminder", () => {
  it("counts down to the next whole interval, not a fixed period", () => {
    expect(msUntilNextReminder({ startedAt: START, intervalMinutes: 30, now: minutes(0) })).toBe(30 * 60_000);
    expect(msUntilNextReminder({ startedAt: START, intervalMinutes: 30, now: minutes(10) })).toBe(20 * 60_000);
    // Just past a milestone — re-arms for the full next interval, so the timer
    // resyncs to the real clock rather than drifting by however late it fired.
    expect(msUntilNextReminder({ startedAt: START, intervalMinutes: 30, now: minutes(30) })).toBe(30 * 60_000);
    expect(msUntilNextReminder({ startedAt: START, intervalMinutes: 30, now: minutes(35) })).toBe(25 * 60_000);
  });

  it("never returns a non-positive delay a caller could spin on", () => {
    for (const at of [0, 30, 59.999, 120]) {
      expect(msUntilNextReminder({ startedAt: START, intervalMinutes: 30, now: minutes(at) })).toBeGreaterThan(0);
    }
  });

  it("returns null when no interval is configured", () => {
    expect(msUntilNextReminder({ startedAt: START, intervalMinutes: null, now: minutes(5) })).toBeNull();
  });
});

describe("copy", () => {
  it("reads naturally at every interval the UI offers", () => {
    expect(formatElapsed(15)).toBe("15 minutes");
    expect(formatElapsed(30)).toBe("30 minutes");
    expect(formatElapsed(60)).toBe("1 hour");
    expect(formatElapsed(90)).toBe("1 hour 30 min");
    expect(formatElapsed(120)).toBe("2 hours");
    expect(formatElapsed(240)).toBe("4 hours");
  });

  it("states elapsed play time without instructing the player what to do", () => {
    expect(reminderMessage(30)).toBe("You have been playing for 30 minutes.");
  });
});
