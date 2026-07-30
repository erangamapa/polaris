import { useEffect, useRef } from "react";
import { toast } from "./toast.jsx";
import { track } from "./telemetry";
import { usePlayerSettings } from "./usePlayerSettings.jsx";
import { dueRemindersAt, msUntilNextReminder, reminderMessage } from "./realityCheck";

// Delivers the reality-check reminder the player configured in Responsible
// Gaming. This is what makes that setting a real protection rather than a stored
// number — mounted once in App.jsx.
//
// The session starts when this mounts (a page load) and is NOT persisted across
// reloads: a reload genuinely starts a new browsing session, and pretending
// otherwise would need a stored session clock the app does not have. Stated
// plainly in the RG dialog copy so the player knows what they are getting.
export function useRealityCheck() {
  const { settings } = usePlayerSettings();
  const intervalMinutes = settings.responsibleGaming.realityCheckMinutes;

  const startedAtRef = useRef(Date.now());
  // Which milestone was last announced, so re-renders and a settings change
  // cannot replay reminders the player already saw.
  const notifiedRef = useRef(0);

  useEffect(() => {
    if (!intervalMinutes) return;

    let timer = null;
    const tick = () => {
      const now = Date.now();
      const reached = dueRemindersAt({
        startedAt: startedAtRef.current,
        intervalMinutes,
        lastNotifiedCount: notifiedRef.current,
        now,
      });

      if (reached > notifiedRef.current) {
        notifiedRef.current = reached;
        const elapsedMinutes = reached * intervalMinutes;
        toast.info(reminderMessage(elapsedMinutes), { description: "Reality check reminder" });
        track("reality_check_shown", { intervalMinutes, elapsedMinutes });
      }

      // Re-arm for the next whole interval rather than using setInterval, so a
      // throttled background tab resyncs to the real clock instead of drifting.
      timer = setTimeout(tick, msUntilNextReminder({ startedAt: startedAtRef.current, intervalMinutes, now: Date.now() }));
    };

    timer = setTimeout(tick, msUntilNextReminder({ startedAt: startedAtRef.current, intervalMinutes, now: Date.now() }));
    return () => { if (timer) clearTimeout(timer); };
  }, [intervalMinutes]);
}
