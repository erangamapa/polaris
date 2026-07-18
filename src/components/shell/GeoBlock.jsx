import { TriangleAlert } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

// Full-page state — no header, no sidebar, no game grid. Rendered instead of
// the whole app shell when useGeoCheck() reports blocked, so there's never a
// path where restricted content is reachable behind this screen.
export function GeoBlock({ reason }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <TriangleAlert className="size-10 text-amber-400" aria-hidden="true" />
      <div>
        <h1 className="text-lg font-bold">Not available in your region</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {reason || `${BRAND_NAME} isn't available in your location yet due to local licensing requirements.`}
        </p>
      </div>
      <a
        href="mailto:hello@tribet.gg"
        className="text-sm font-semibold text-[var(--global-cta)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Contact support
      </a>
    </div>
  );
}
