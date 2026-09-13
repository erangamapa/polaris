// The one game shape the lobby renders, whatever produced it.
//
// Games now arrive from sources with nothing in common: vendored apps that
// speak our postMessage bridge, on-chain contracts, and third-party studios
// that only hand out a demo URL. Rails, search, favourites, categories and
// the launch surface must not care which. An adapter's whole job is to turn
// its source into this shape.
//
//   key        unique within its source
//   favId      `<source>:<key>` — namespaced so two sources can both ship a
//              game called "dice" without colliding in the favourites set
//   kind       "onchain" | "provider" — which renderer the launch surface uses
//   source     which adapter produced it; the content-mode filter branches on
//              this and nothing else
//   tags       normalised to CATEGORY_META tags, never a source's own wording
//   launch     how to actually run it (below)
//
// `launch.kind`:
//   "bridged"  same-origin iframe + mock balance host (vendored games)
//   "external" third-party iframe; the studio runs its own demo economy, so we
//              must NOT attach a balance host — doing so would put a TBET chip
//              above a game showing its own credits, which is just a lie
//   "onchain"  settled by contract, rendered by BetSwirlGame

export const LAUNCH_BRIDGED = "bridged";
export const LAUNCH_EXTERNAL = "external";
export const LAUNCH_ONCHAIN = "onchain";

export function makeGame({ key, title, source, kind, image, tags, launch, providerId, studio }) {
  return {
    key,
    title,
    favId: `${source}:${key}`,
    source,
    kind,
    image,
    tags: tags ?? [],
    launch,
    // Legacy fields the existing lobby still reads directly. `src` stays the
    // iframe URL so every current call site keeps working unchanged.
    src: launch?.src,
    providerId,
    studio,
  };
}
