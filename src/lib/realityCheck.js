// Reality check — the pure timing logic behind the one Responsible Gaming
// control in this app that is genuinely ENFORCED rather than merely stored.
//
// Why this one and not the others: a reality-check reminder is entirely
// client-side ("you have been playing for 30 minutes"), so the app can actually
// deliver it. Deposit and loss limits cannot be honestly enforced here — that
// needs deposit interception and cross-chain bet accounting this app does not
// have — so those are stored and labelled as such (see
// packages/shared/playerSettings.js and the RG dialog copy). Shipping a real
// reminder and being honest about the rest beats shipping four fake controls.
//
// Pure and clock-injected so the whole schedule is testable without waiting
// real minutes; the React wiring lives in useRealityCheck.js.

// Elapsed time is measured from when the session started, and reminders fire on
// each whole multiple of the interval — NOT on a naive repeating timer, which
// would drift and would double-fire when a background tab is throttled and then
// catches up.
export function dueRemindersAt({ startedAt, intervalMinutes, lastNotifiedCount = 0, now }) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return 0;
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;

  const elapsedMs = now - startedAt;
  if (elapsedMs <= 0) return 0;

  const count = Math.floor(elapsedMs / (intervalMinutes * 60_000));
  // Only ever report the LATEST milestone reached. A tab asleep for two hours
  // must show one "you have been playing for 2 hours" reminder, not four
  // stacked ones for every interval it slept through.
  return count > lastNotifiedCount ? count : lastNotifiedCount;
}

// Milliseconds until the next whole interval, for scheduling a single timer that
// re-arms itself. Never returns 0 or negative, so a caller can pass it straight
// to setTimeout without risking a tight loop.
export function msUntilNextReminder({ startedAt, intervalMinutes, now }) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return null;
  const period = intervalMinutes * 60_000;
  const elapsed = Math.max(0, now - startedAt);
  return period - (elapsed % period);
}

export function formatElapsed(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

// The exact wording the player sees. Kept here beside the timing so the message
// and the schedule cannot drift apart, and so the copy is covered by tests.
export function reminderMessage(elapsedMinutes) {
  return `You have been playing for ${formatElapsed(elapsedMinutes)}.`;
}
