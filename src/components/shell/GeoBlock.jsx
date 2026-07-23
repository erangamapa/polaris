import { TriangleAlert } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

// Full-page state — no header, no sidebar, no game grid. Rendered instead of
// the whole app shell when useGeoCheck() reports blocked, so there's never a
// path where restricted content is reachable behind this screen (see
// lib/geo.js — currently a stub that always returns `blocked: false`, so
// this path is not reachable by any real user today; kept ready for when a
// real region signal exists, per REGION RESTRICTION: "only implement if
// there is a real region/jurisdiction signal").
//
// `onContactSupport` opens this app's real, existing Support system (see
// App.jsx, which renders SupportDialog alongside this component) rather
// than a hardcoded `mailto:` address — that address wasn't a verified,
// monitored support channel used anywhere else in the app, which is
// exactly the kind of invented contact detail DATA HONESTY and SUPPORT AND
// INDEPENDENT HELP rule out (see RESPONSIBLE GAMING AND COMPLIANCE ACCESS
// task: "do not invent hotline numbers, organizations or local services").
export function GeoBlock({ reason, onContactSupport }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <TriangleAlert className="size-10 text-amber-400" aria-hidden="true" />
      <div>
        <h1 className="text-lg font-bold">Not available in your region</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {reason || `${BRAND_NAME} isn't available in your location yet.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onContactSupport}
        className="text-sm font-semibold text-[var(--global-cta)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Contact support
      </button>
    </div>
  );
}
