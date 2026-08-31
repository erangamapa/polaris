import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Copy, Loader2, X, ArrowRight } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { toast } from "@/lib/toast";
import { track } from "@/lib/telemetry";
import { CASINO_CHAIN_ID } from "@shared/chains";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CARD_H } from "@/components/shell/PromoCard";
import { MicroLabel } from "@/components/ui/micro-label";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";

export { CARD_H };

// LOBBY HIERARCHY PASS — Casino's top-of-page area was pushed for a more
// compact top area so the first game rail sits higher in the viewport
// (~10% mobile/tablet, ~15% desktop reduction: 160->144px, 208->176px).
// This used to be a LOCAL constant here, deliberately kept separate from
// the shared `CARD_H` this file imports/re-exports from PromoCard.jsx —
// at the time, that constant also sized Sports'/Predictions' promo cards
// (via PromoCard.jsx directly), and shrinking it there would have been an
// unrelated-page regression. The CASINO PARITY PASS brought Sports/
// Predictions' promo cards up to this same corrected height instead (see
// PromoCard.jsx), which is what makes the shared `CARD_H` the right value
// for Casino to consume directly now — the two constants had converged,
// so the local copy was removed rather than kept in sync by hand.

// CLICKABLE CARD PASS: every promo card's own nested "real" control (CTA,
// the wallet copy button) sits inside the card's own onClick region — a
// plain click on any of them bubbles up to the card's onClick too unless
// stopped, which would either double-fire the same action (CTA) or fire
// an action that specific control must never trigger (Copy must never
// also open the wallet). One small helper rather than repeating the same
// `(e) => { e.stopPropagation(); fn?.(e); }` six times across the file.
const stopAnd = (fn) => (e) => {
  e.stopPropagation();
  fn?.(e);
};

// WALLET PROMO ARTWORK — replaces the previous inline SVG (WalletMark) with
// the supplied wallet illustration (public/heroes/wallet-promo.webp).
// SIZE-UP PASS: the first cut of this asset kept the source's original
// framing (1536x1024, wallet occupying only the right ~52% of its own
// canvas, the rest genuinely-transparent dead space to its left). Under
// object-fit:contain, that dead space renders too — it doesn't disappear,
// it just becomes part of the "fitted" box — so the wallet itself came out
// reading like a small icon floating in a mostly-empty zone. Fixed at the
// source: re-cropped tight around the actual opaque wallet+coin bounding
// box (found by alpha-density sampling, not eyeballing) plus a deliberate
// margin for the glow/light-trail bleed the direction calls for, then
// re-exported at 900x935 WebP (alpha re-verified intact post-crop). Same
// fix applies to every card that reuses this file — it's a property of
// the asset, not the layout.
//
// object-contain + object-right: the crop's real content still touches
// its own right edge with no dead margin, so anchoring right keeps the
// wallet flush with the zone's right edge (matching the other two cards'
// artwork). No CSS mask (unlike WelcomeArtwork/RaceArtwork's hand-drawn
// SVGs below) — the asset's own alpha already handles the fade, a mask on
// top would be a no-op.
//
// SLIGHT SIZE-UP PASS: scale-[1.265] origin-right is a deliberate, small
// supplement on top of the zone's own (now-maximized) dimensions below —
// not the primary sizing mechanism. Why it's needed: with CARD_H fixed
// (untouchable) and this crop's aspect ratio narrower than the zone's,
// object-contain is height-bound — the zone's own content-box height is a
// hard ceiling that widening the zone further can't push past. Growing
// the zone to its practical max only got partway to the requested size
// increase; this closes the remaining gap. origin-right keeps the growth
// pushing left/vertically-centered (into the zone's own unused slack),
// never rightward past the already-correct right-edge inset — combined
// with the zone's own overflow-hidden below, any excess clips at the
// text/artwork boundary rather than ever touching the copy column.
// +10% PASS: 1.265 = 1.15 * 1.10 — this task asked for "the current
// illustration" (already at 1.15) enlarged by exactly 10% more, not for
// the scale value itself to become 1.10 (that would be a decrease).
// Zone dimensions, vertical centering and right-edge alignment below are
// all untouched — only this multiplier changed.
//
// CLIP FIX (asset, not CSS): scale-[1.265] (at the time) with a
// vertically-centered origin always magnifies the SAME proportional
// fraction of the source image's own height off both its top and bottom
// — (s-1)/(2s) — regardless of how big the zone/box is. Widening the
// zone can't fix that (confirmed by measurement: doing so only grows the
// absolute clip amount in lockstep, since the fraction is fixed by the
// scale value alone). The +10% pass pushed that fraction past the coin's
// real position in the previous crop. Re-cropped public/heroes/
// wallet-promo.webp from the original source with the full available
// natural top/bottom margin, plus a modest amount of added transparent
// canvas (padding, not stretching — verified alpha=0 in the added rows)
// to push both margins safely past the clip line.
//
// +15% PASS: 1.455 = 1.265 * 1.15 — same reading as the prior +10% pass:
// "increase the [current, already-enlarged] illustration by 15%," not
// "set the scale value to 1.15" (which would shrink it from 1.265). A
// bigger scale means a bigger clip fraction too — (s-1)/(2s) grows from
// ~10.5% at s=1.265 to ~15.6% at s=1.455 — which would have eaten back
// into the coin again with the previous asset's margins (recomputed: top
// margin was only ~4.6 rows short at this new fraction, i.e. right on the
// edge). Added another 60px of transparent top padding to
// wallet-promo.webp (same padding-not-stretching technique, alpha=0
// verified in the added rows) to restore real buffer at the new scale —
// this is the asset, not this component, growing again; the CSS below is
// otherwise unchanged from the prior pass.
//
// +10% PASS (again): 1.6005 = 1.455 * 1.10, same "grow the current size"
// reading as every prior +N% pass. This task's own preference — grow the
// wrapper's dimensions instead of a transform, since a transform "may
// cause blur or unexpected overflow" — was checked first: the wrapper
// (WalletCard's zone below, top-4/bottom-4) is already sized to the
// maximum available space under a fixed CARD_H and fixed card padding
// (both explicitly off-limits this task, as every task before it) — there
// is no more room to give it. transform:scale remains the only lever left
// that doesn't touch either. It's a pure CSS matrix scale on a raster
// image already exported at a resolution well above its rendered size, so
// it doesn't blur in practice, and "unexpected overflow" is exactly what
// the asset-margin work below (and every prior +N% pass) exists to
// prevent by design, not leave to chance. Clip fraction at s=1.6005 is
// (s-1)/(2s)≈18.76%; added another 60px of transparent padding to BOTH
// top and bottom of wallet-promo.webp this time (previous margins were
// only ~5-7px from the new clip line at this fraction — real risk, not
// just "in principle") to restore ~42-44px of buffer on both sides.
// HOVER/PRESS ZOOM PASS: origin-right + scale-[1.6005] (this card's own
// baseline size, built up over several prior passes) live on the
// `.promo-card__visual` wrapper in WalletCard below, not this <img>
// directly — see ONE-LAYER PASS: the illustration and its glow now scale
// together as a single visual unit, so the scale/origin machinery moved
// up to whatever wraps both of them. object-contain/object-right (the
// actual image-fit behavior) stay right here on the image itself.
function WalletArtwork() {
  return (
    <img
      src="/heroes/wallet-promo.webp"
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className="promo-card__illustration h-full w-full object-contain object-right"
    />
  );
}

// Two-column shell every wallet-tile state shares: text column (~60-64%, its
// own justify-between so heading/body/CTA space out instead of clustering at
// the top) + a fixed-width illustration column (~36-40%) that can never be
// overlapped by text since they're separate flex children, not a text-over-
// image overlay. Same CARD_H/radius/border/padding as PromoCard (this tile
// sits in the exact same row — WALLET PROMO ARTWORK: background is now its
// own dedicated tokens, see below, everything else still matches) — a bare
// <button> is inline-block
// and won't stretch on its own, which is why the outer div (not the button)
// owns `w-full`. Illustration hidden below `sm:`: at the ~110px mobile card
// width fixed by the existing 3-col grid there isn't room for a legible
// illustration alongside readable text and a tappable CTA.
function WalletCard({ children, tone = "neutral", onActivate, activateLabel }) {
  return (
    <div
      // CARD POLISH: same subtle resting elevation as the promo cards
      // beside it in this row (--elevation-low).
      // WALLET PROMO ARTWORK: default tone's flat --card fill replaced
      // with --wallet-card-bg (the broad, static navy-to-indigo diagonal
      // wash — see index.css) so the card blends with the illustration's
      // own violet-blue palette — border, radius, padding and CTA sizing
      // are all untouched, so it stays equal to Welcome Offer/Weekly Race
      // in every dimension. The wrong-network warning tone keeps its
      // existing flat --card fill and amber border exactly as before.
      // RESTORE NOTE: an intermediate pass moved this whole wash off the
      // card and into the hover-scaling wrapper, which visibly stripped
      // the card's intended surface (confirmed against the last approved
      // screenshots) — reverted. Only the small, localized radial glow
      // (--wallet-card-glow, in `.promo-card__ambient` below) travels with
      // the illustration; this broad wash stays right here, static.
      //
      // CLICKABLE CARD PASS: onActivate is the SAME handler the state's
      // own visible CTA below already calls (connect/switchTo/onManageWallet
      // — see PlayerTile) — never a separate/new action, so "the card and
      // its CTA trigger the same action" holds by construction. Deliberately
      // a plain <div> with role="button" (not a real <button> or <a>
      // wrapping everything) — a real button/link element can't validly
      // contain another nested interactive control (the CTA, and for the
      // connected state the Copy button too), which is exactly the invalid-
      // markup trap a stretched-link naively risks. role="button" +
      // tabIndex + onKeyDown (Enter/Space) recreates the same semantics and
      // keyboard behavior by hand instead. Omitted entirely (undefined)
      // for the "connecting" state — nothing to activate yet, matches that
      // state's own disabled button. The nested CTA/Copy buttons each wrap
      // their own onClick in `stopAnd(...)` so a click on them never also
      // bubbles up and re-fires (or wrongly fires) this handler — see
      // PlayerTile.
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
      aria-label={onActivate ? activateLabel : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate(e);
              }
            }
          : undefined
      }
      // FLUSH RIGHT-EDGE PASS: this outer element itself is now
      // deliberately unpadded (p-4 moved to the text wrapper below).
      // Absolutely positioned children (the artwork, below) are placed
      // relative to their nearest positioned ancestor's PADDING box, not
      // its border box — so as long as ANY ancestor in the chain up to
      // here carries padding, `right: 0` on the artwork can only ever
      // reach that padding edge, never the card's true outer edge, no
      // matter how the artwork itself is styled. Moving p-4 off this
      // element removes that ceiling entirely instead of fighting it with
      // a compensating negative offset.
      className={cn(
        CARD_H,
        "promo-card relative flex w-full min-w-0 overflow-hidden rounded-lg border text-left shadow-[var(--elevation-low)]",
        tone === "warning" ? "border-[var(--warning)]/30 bg-[var(--card)]" : "border-[var(--border)]",
        onActivate && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      style={tone === "warning" ? undefined : { background: "var(--wallet-card-bg)" }}
    >
      {/* Carries the p-4 this element used to have, plus a max-width cap
          (complementing the artwork's own width tiers below with a couple
          points of buffer) — needed now because, with the artwork out of
          flow, this column would otherwise stretch to the card's full
          width. relative z-10 is what keeps it — and everything in it:
          status, address, balance, Retry, CTA, copy button — painted
          above the artwork: an absolutely positioned element with
          z-index:auto (the artwork) paints above normal in-flow content
          by default regardless of DOM order, so without an explicit
          higher z-index here the artwork would sit on top, not behind. */}
      <div className="promo-card__content relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between p-4">
        {children}
      </div>
      {/* WALLET PROMO ARTWORK — FLUSH RIGHT-EDGE PASS: absolutely
          positioned against this card's own (now unpadded) box instead of
          being an in-flow flex sibling, specifically so `right-0` lands
          on the card's true inner-right edge with zero gap, per the
          asset itself having zero transparent margin on its own right
          edge (verified by alpha-sampling the exported WebP's last
          column — content is opaque there, nothing being hidden).
          top-4/bottom-4 (not inset-y-0) is deliberate: it reproduces the
          exact same box height as the old p-4-bounded flex zone
          (CARD_H minus 32px), not the card's full height, so the
          artwork's own height and vertical position are byte-for-byte
          unchanged from the prior pass — only the positioning mechanism
          and horizontal placement changed. Width tiers (40/44/46%) also
          unchanged; the containing block is now the card's border box
          rather than its old content-box, but the render stays
          height-bound either way (confirmed empirically — the extra
          width is unused slack, not extra rendered size). Same
          overflow-hidden + scale-[1.15] safety pairing as before.
          pointer-events-none so this decorative layer can never
          intercept clicks. `promo-card` on the outer element above is
          what the hover/press zoom (index.css's `.promo-card:hover` /
          `:active`) actually keys off of — the whole card is the
          interaction target, not just this zone.

          ONE-LAYER PASS: this div is `promo-card__visual` — the scaling
          wrapper itself (see index.css) — with the LOCALIZED glow
          (`.promo-card__ambient`, --wallet-card-glow only — the small
          radial bloom immediately around the asset, not the card's broad
          background wash above) as its first child and the illustration
          as its second, so the illustration and its immediate glow scale
          together as one unit. --illustration-base-scale is set here (not
          on WalletArtwork's own <img> anymore) since the WRAPPER is what
          scales now. Ambient is only rendered for the non-warning tone,
          matching the card's own background conditional above exactly
          (the warning/wrong-network state never had a glow, only the flat
          --card fill). The inner `relative z-10` div around WalletArtwork
          keeps the illustration painting above the ambient glow (same
          z-index:auto/positioned-sibling reasoning as promo-card__content
          above, one level down). Still no mask — see WalletArtwork's own
          comment. */}
      <div
        className="promo-card__visual pointer-events-none absolute top-4 bottom-4 right-0 hidden w-[40%] overflow-hidden sm:block lg:w-[44%] xl:w-[46%]"
        style={{ "--illustration-base-scale": 1.6005 }}
      >
        {tone !== "warning" && (
          <div className="promo-card__ambient absolute inset-0" style={{ background: "var(--wallet-card-glow)" }} />
        )}
        <div className="relative z-10 h-full w-full">
          <WalletArtwork />
        </div>
      </div>
    </div>
  );
}

// MOCKUP ALIGNMENT CORRECTION: the previous pass filled these slots with
// the repository's raster hero photos (public/heroes/casino-welcome.png,
// casino-race.png). Reviewed against the approved direction and found
// wrong on two counts: (1) at this card's actual rendered box they read
// as small disconnected photo thumbnails, not integrated artwork — a hard
// object-cover rectangle sitting inside an otherwise plain card, exactly
// the "thumbnail-card-inside-card" effect the correction calls out; (2)
// both photos are warm pink/magenta/gold, contradicting the approved
// blue/violet atmosphere ("avoid red or magenta-dominant cards"). No
// transparent PNG/WebP asset in the correct palette exists in the repo,
// so per the task's own fallback guidance ("if proper standalone artwork
// is not available, use tasteful abstract CSS-backed art zones rather
// than low-quality thumbnail images") these were restrained SVG motifs — a
// handful of shapes, one brand-tinted radial glow, color-mix() strokes/
// fills reading var(--global-cta) directly so a future brand recolor
// reaches these too. GlowBackdrop (shell/artwork/GlowBackdrop.jsx) is
// still shared with Sports/Predictions' own artwork elsewhere in the app,
// but is no longer imported here — WALLET PROMO ARTWORK: the Wallet
// card's own artwork moved to a real supplied photo (WalletArtwork above)
// rather than this SVG technique. WELCOME OFFER ARTWORK / WEEKLY RACE
// ARTWORK: both cards' SVG motifs (gift box, trophy) have since also been
// replaced by real supplied illustrations, for the same reason — real
// campaign artwork existed for all three, so the SVG/GlowBackdrop
// fallback isn't needed for any Casino promo card anymore. All three
// (Wallet, Welcome Offer, Weekly Race) are now bespoke card components,
// no longer routed through the shared PromoCard (still used by Sports/
// Predictions' own promo tiles, imported separately there).

// Gift-box illustration for the welcome/deposit-bonus offer
// (public/heroes/welcome-offer-promo.webp). SOURCE ASSET NOTE: the file as
// supplied was NOT a transparent PNG — sips/`file` both reported plain
// 8-bit RGB, no alpha channel, and pixel-sampling the "empty" left region
// found it was a literal checkerboard pattern (alternating ~(243,243,243)/
// ~(253,253,253) pixels) baked in as real, opaque color — i.e. whatever
// tool exported it had flattened its transparency indicator onto the
// canvas instead of preserving real alpha. Reconstructed a genuine alpha
// channel from this rather than using the file as-is (which would have
// rendered a literal grey-and-white checker block on the card) or assuming
// a flat white background (naive white-removal would have left checker
// residue): computed per-pixel saturation (max−min of R/G/B) and mapped it
// through a soft ramp (0 alpha at saturation ≤4, 255 at saturation ≥60,
// linear between) — the checkerboard is essentially zero-saturation
// gray/white, the real illustration is highly saturated blue/violet/gold,
// so this cleanly separates the two without touching genuine bright
// content (the gold coin and light ribbon highlights are desaturated-but-
// bright, not desaturated-and-gray, so they survive intact). Verified no
// white-matte fringing post-reconstruction (edge pixels trend violet/blue,
// not white) and that the real content still touches the source's own
// right edge with zero dead margin, matching WalletArtwork's asset.
// Cropped away most of the dead checkerboard region, then exported at
// 900x985 WebP (~245KB, alpha verified intact).
//
// FULL-BLEED PASS: no scale transform here (unlike WalletArtwork) — the
// zone below is now inset-y-0 (full CARD_H, not top-4/bottom-4), and this
// crop's aspect ratio keeps it height-bound under object-contain, so the
// rendered image already fills that full height exactly with zero gap;
// this asset's own alpha genuinely reaches non-zero right at its top and
// bottom rows (verified — the artist's own soft fade, not dead margin),
// so there's real visible content meeting the card's top/bottom edges
// without needing a supplemental scale. Adding one here (as Wallet does)
// would grow the image further from a vertically-centered origin and get
// clipped by the zone's own overflow-hidden at the card's true top/bottom
// edges — i.e. it would crop the gift box, which this task explicitly
// forbids. The zone's own height increase is the entire size-up here.
// ONE-LAYER PASS: the hover/press zoom (index.css's `.promo-card__visual`)
// now lives on WelcomeOfferCard's wrapping div, not this <img> — see
// WalletArtwork's own comment for why. No --illustration-base-scale
// override needed on that wrapper (unlike Wallet's), the shared rule's
// own `1` fallback is already correct since this artwork has no static
// baseline scale of its own.
function WelcomeOfferArtwork() {
  return (
    <img
      src="/heroes/welcome-offer-promo.webp"
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className="promo-card__illustration h-full w-full object-contain object-right"
    />
  );
}

// Card shell for the Welcome Offer promo — structurally identical to
// WalletCard above (same CARD_H/radius/border/shadow, same "outer element
// unpadded, p-4 moved to a z-10 text wrapper, artwork absolutely
// positioned flush right" pattern, for the same reason: `right: 0` on an
// absolutely positioned child can only ever reach its nearest positioned
// ancestor's PADDING edge, never its border edge, so the only way to get
// truly zero gap against the card's real right edge is to keep this outer
// element itself unpadded). GRADIENT PASS: uses the exact same
// --wallet-card-glow/--wallet-card-bg pair as WalletCard (see index.css)
// instead of the flat --card fill — reusing the identical tokens rather
// than a new pair guarantees the direction/colors/intensity match exactly.
// --wallet-card-bg (the broad, static wash) stays on this card's own
// background; --wallet-card-glow (the small, localized bloom) lives only
// in `.promo-card__ambient` below, scaling with the illustration. Weekly
// Race (WeeklyRaceCard, below) matches this exactly too, for the same
// reason — all three promo cards share one static background and one
// scaling localized-glow treatment.
function WelcomeOfferCard({ eyebrow, title, metadata, cta, onCtaClick }) {
  return (
    <div
      // CLICKABLE CARD PASS: same pattern as WalletCard — see that
      // component's own comment for the full reasoning (plain div +
      // role="button" rather than a real <button>/<a> wrapping the CTA,
      // which would be invalid nested-interactive markup). onActivate
      // here is just onCtaClick itself — this card only ever had the one
      // action, so "the card and its CTA trigger the same action" is
      // automatic, not a separate wire-up. Currently a no-op in practice
      // (PromoStrip's own render call below doesn't pass onCtaClick a
      // value yet — this is still mock/placeholder promo content with no
      // real destination), which this task's "preserve routing
      // destinations" leaves exactly as-is: nothing to route to yet, so
      // nothing fires, on the card OR the button, same as before.
      role={onCtaClick ? "button" : undefined}
      tabIndex={onCtaClick ? 0 : undefined}
      aria-label={onCtaClick ? cta : undefined}
      onClick={onCtaClick}
      onKeyDown={
        onCtaClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCtaClick(e);
              }
            }
          : undefined
      }
      className={cn(
        CARD_H,
        "promo-card relative flex w-full min-w-0 overflow-hidden rounded-lg border border-[var(--border)] text-left shadow-[var(--elevation-low)]",
        onCtaClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      style={{ background: "var(--wallet-card-bg)" }}
    >
      <div className="promo-card__content relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between p-4">
        <div className="min-w-0">
          <MicroLabel className="-ml-[9px]">{eyebrow}</MicroLabel>
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">
            {title}
          </h3>
          {metadata && (
            <p className="promo-card__body mt-1 text-[var(--ink-dim)]">
              {metadata}
            </p>
          )}
        </div>
        {/* SECONDARY CTA PASS: promo-outline (index.css/button.jsx) — the
            header's own filled --global-cta button is now the app's one
            true primary CTA; this and Weekly Race's "View race" are the
            two the task names for the optional small trailing arrow. */}
        <Button variant="promo-outline" size="sm" onClick={stopAnd(onCtaClick)} className="w-fit">
          {cta}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {/* FULL-BLEED PASS: inset-y-0 (was top-4/bottom-4) — spans the
          card's full, true height so the illustration's top/bottom
          touch the card's own inner border with zero gap, per this
          task's explicit ask (distinct from Wallet, which keeps its
          top-4/bottom-4 inset — "maintain vertical center" there, not
          "touch the edges"). overflow-hidden here is still the safety
          net; at every tested size the content-based render doesn't
          exceed the box, so nothing actually clips.

          ONE-LAYER PASS: `promo-card__visual` — the LOCALIZED glow
          (`.promo-card__ambient`, --wallet-card-glow only, not the card's
          broad background wash above) plus the illustration, scaling
          together on hover/press as one unit (see index.css and
          WalletCard's own comment for the full reasoning). No
          --illustration-base-scale override needed — this card has no
          static rest-state scale. */}
      <div className="promo-card__visual pointer-events-none absolute inset-y-0 right-0 hidden w-[40%] overflow-hidden sm:block lg:w-[44%] xl:w-[46%]">
        <div className="promo-card__ambient absolute inset-0" style={{ background: "var(--wallet-card-glow)" }} />
        <div className="relative z-10 h-full w-full">
          <WelcomeOfferArtwork />
        </div>
      </div>
    </div>
  );
}

// Trophy illustration for the weekly race/leaderboard promo
// (public/heroes/weekly-race-promo.webp), replacing the SVG trophy motif
// for the same reason Welcome Offer's gift box was replaced: real supplied
// campaign artwork now exists for this card too. SOURCE ASSET NOTE: unlike
// Welcome Offer's asset, this one genuinely has a working alpha channel
// (sips/`file` both confirm real RGBA, not a flattened checkerboard) — no
// reconstruction needed, just the standard crop-for-margin treatment. One
// difference from Wallet/Welcome Offer's assets: this trophy's own glow
// doesn't touch its source canvas's right edge at full opacity — it fades
// out gradually over roughly its last 30px (alpha ~25 at the very edge,
// not 0) — cropped tightly to just past where that fade becomes
// imperceptible rather than to a hard content edge, so object-position:
// right still reads as flush with no dead gap, just a soft natural taper
// (consistent with "let glow extend, fade before the text zone" elsewhere
// on these cards). Cropped from the 1536x1024 source with generous margin
// around the solid trophy/coins core, exported at 900x805 WebP (~298KB).
// ONE-LAYER PASS: the hover/press zoom (index.css's `.promo-card__visual`)
// now lives on WeeklyRaceCard's wrapping div, not this <img> — same
// reasoning as WelcomeOfferArtwork above, no base-scale override needed
// since this artwork has no static scale of its own either.
function WeeklyRaceArtwork() {
  return (
    <img
      src="/heroes/weekly-race-promo.webp"
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className="promo-card__illustration h-full w-full object-contain object-right"
    />
  );
}

// Card shell for the Weekly Race promo — structurally identical to
// WalletCard/WelcomeOfferCard above (unpadded outer element, p-4 moved to
// a z-10 text wrapper, artwork absolutely positioned flush right — see
// WalletCard's comment for why this is the only way to reach the card's
// true right edge with zero gap). Static background is --wallet-card-bg
// (the broad wash), same as the other two — --wallet-card-glow (the
// small, localized bloom) lives only in `.promo-card__ambient` below,
// scaling with the illustration. top-3/bottom-3 (12px each, not Welcome
// Offer's inset-y-0 full-bleed) is deliberate — this task asked for
// ~85-90% of card height with a small safe margin at top/bottom, not a
// zero-gap touch: zone height = CARD_H-24, which is 85%/88.5% of the full
// 160/208px CARD_H at the two breakpoints, landing inside the requested
// range without needing the "touches the edge" treatment Welcome Offer
// specifically asked for.
function WeeklyRaceCard({ eyebrow, title, metadata, cta, onCtaClick }) {
  return (
    <div
      // CLICKABLE CARD PASS: same pattern as WalletCard/WelcomeOfferCard —
      // see WalletCard's own comment for the full reasoning.
      role={onCtaClick ? "button" : undefined}
      tabIndex={onCtaClick ? 0 : undefined}
      aria-label={onCtaClick ? cta : undefined}
      onClick={onCtaClick}
      onKeyDown={
        onCtaClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCtaClick(e);
              }
            }
          : undefined
      }
      className={cn(
        CARD_H,
        "promo-card relative flex w-full min-w-0 overflow-hidden rounded-lg border border-[var(--border)] text-left shadow-[var(--elevation-low)]",
        onCtaClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      style={{ background: "var(--wallet-card-bg)" }}
    >
      <div className="promo-card__content relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between p-4">
        <div className="min-w-0">
          <MicroLabel className="-ml-[9px]">{eyebrow}</MicroLabel>
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">
            {title}
          </h3>
          {metadata && (
            <p className="promo-card__body mt-1 text-[var(--ink-dim)]">
              {metadata}
            </p>
          )}
        </div>
        <Button variant="promo-outline" size="sm" onClick={stopAnd(onCtaClick)} className="w-fit">
          {cta}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {/* ONE-LAYER PASS: `promo-card__visual` — the LOCALIZED glow
          (`.promo-card__ambient`, --wallet-card-glow only, not the card's
          broad background wash above) plus the illustration, scaling
          together on hover/press as one unit (see index.css and
          WalletCard's own comment for the full reasoning). No
          --illustration-base-scale override needed — this card has no
          static rest-state scale. */}
      <div className="promo-card__visual pointer-events-none absolute top-3 bottom-3 right-0 hidden w-[40%] overflow-hidden sm:block lg:w-[44%] xl:w-[46%]">
        <div className="promo-card__ambient absolute inset-0" style={{ background: "var(--wallet-card-glow)" }} />
        <div className="relative z-10 h-full w-full">
          <WeeklyRaceArtwork />
        </div>
      </div>
    </div>
  );
}

// Exported: this is the one shared "Tribet infrastructure" tile reused as the
// first card on Casino, Sports and Predictions (see ArenaTileRow). It has no
// arena-specific content by design — same wallet, same CTA, everywhere.
export function PlayerTile({ onManageWallet }) {
  const {
    address, isConnected, status, onCasinoChain, isSwitching,
    casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError, refetchCasinoBalance,
    connect, switchTo,
  } = useWallet();

  const connecting = !isConnected && (status === "connecting" || status === "reconnecting");

  // 1. Connecting — reuses the same connect() call already in flight; the
  // button is disabled so a second click can't fire another connect attempt.
  if (connecting) {
    return (
      <WalletCard>
        <div className="min-w-0" role="status" aria-live="polite">
          <MicroLabel>Wallet</MicroLabel>
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">Connecting…</h3>
          <p className="promo-card__body mt-1 text-[var(--ink-dim)]">Approve the request in your wallet.</p>
        </div>
        <Button size="sm" disabled className="w-fit" aria-label="Connecting to wallet">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Connecting…
        </Button>
      </WalletCard>
    );
  }

  // 2. Disconnected — the product utility pitch. Same connect() the header's
  // WalletButton uses; no second wallet-connect implementation.
  if (!isConnected) {
    return (
      <WalletCard onActivate={connect} activateLabel="Connect wallet">
        <div className="min-w-0">
          <MicroLabel>Wallet</MicroLabel>
          {/* MOCKUP ALIGNMENT CORRECTION: text-base -> text-lg, matching
              PromoCard's title scale exactly ("consistent title scale
              across all three cards, no card title significantly smaller
              than another") — was visibly smaller than the other two
              cards' titles. Second line keeps the Casino/system accent
              (--global-cta-hover, not raw --global-cta — same AA-on-dark-
              surface reasoning as Sidebar.jsx's ACTIVE_ACCENT), still just
              two words of accent colour, not body copy. Supporting copy
              is no longer breakpoint-gated — shown at every size now,
              same as the other two cards' metadata. */}
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">
            One wallet.
            <br />
            <span className="text-[var(--global-cta-hover)]">Every game.</span>
          </h3>
          <p className="promo-card__body mt-1 text-[var(--ink-dim)]">Play, earn and withdraw with one connection.</p>
        </div>
        {/* Not converted to the promo-outline secondary style — the task's
            own list ("View wallet, Claim bonus, View race") doesn't
            include this button, and it's this card's only action in this
            state, closer to a primary "get started" prompt than a quiet
            secondary one. */}
        <Button size="sm" onClick={stopAnd(connect)} data-test-id="wallet-tile-connect" className="w-fit">
          Connect wallet
        </Button>
      </WalletCard>
    );
  }

  // 3. Connected on the wrong chain — same switchTo() the auth gate uses.
  if (!onCasinoChain) {
    return (
      <WalletCard
        tone="warning"
        onActivate={isSwitching ? undefined : () => switchTo(CASINO_CHAIN_ID)}
        activateLabel="Switch network"
      >
        <div className="min-w-0" role="status" aria-live="polite">
          <MicroLabel className="text-amber-400/80">Wallet</MicroLabel>
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">Wrong network</h3>
          <p className="promo-card__body mt-1 text-[var(--ink-dim)]">Switch to Base Sepolia to continue.</p>
        </div>
        <Button
          size="sm"
          onClick={stopAnd(() => switchTo(CASINO_CHAIN_ID))}
          disabled={isSwitching}
          data-test-id="wallet-tile-switch-network"
          className="w-fit"
        >
          {isSwitching && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {isSwitching ? "Switching…" : "Switch network"}
        </Button>
      </WalletCard>
    );
  }

  // 4/5. Connected + right network — balance loading, load error, or ready.
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  return (
    <WalletCard onActivate={onManageWallet} activateLabel="View wallet">
      <div className="min-w-0">
        <MicroLabel className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
          Wallet connected
        </MicroLabel>
        <div className="mt-1.5 truncate font-mono text-xs text-[var(--ink-dim)]">{shortAddress(address)}</div>
        {/* MOCKUP ALIGNMENT CORRECTION: text-lg -> text-2xl — the balance
            IS this card's "title" moment (there's no separate headline
            here the way the other two states have "One wallet./Every
            game."), so it needs the same visual weight, not a small
            operational-widget number squeezed into the top-left. */}
        <div className="mt-2">
          {casinoBalanceLoading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-white/10" role="status" aria-live="polite" aria-label="Loading balance" />
          ) : casinoBalanceError ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Balance unavailable</span>
              <button
                type="button"
                onClick={stopAnd(() => refetchCasinoBalance?.())}
                className="text-xs font-semibold text-[var(--global-cta-hover)] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            // RESKIN v2 CALIBRATION: was font-black (weight 900, unaffected
            // by the app-wide font-weight-bold override) — a balance is
            // DATA (JetBrains Mono, tabular numerics), not display text.
            <div className="truncate font-mono text-2xl font-semibold tabular-nums text-white">
              {casinoBalance.toFixed(5)} <span className="text-xs font-semibold text-[var(--ink-dim)]">{casinoSymbol}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* SECONDARY CTA PASS: promo-outline — this card's own explicit
            "View wallet" entry in the approved list. */}
        <Button size="sm" variant="promo-outline" onClick={stopAnd(onManageWallet)} data-test-id="wallet-tile-view" className="w-fit">
          View wallet
        </Button>
        {/* CLICKABLE CARD PASS: this is the one control that must NEVER
            trigger the card's own onActivate (onManageWallet) — copying the
            address is a distinct, self-contained action, not "view
            wallet". stopAnd still runs copyAddress itself; it only stops
            the click from also bubbling up to the card. */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={stopAnd(copyAddress)}
          aria-label="Copy wallet address"
          data-test-id="wallet-tile-copy"
        >
          <Copy className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </WalletCard>
  );
}

// `mobilePlaceholder` is shorter — the full desktop copy ("Search prediction
// markets") clips inside the narrower mobile input; desktop copy is
// unchanged. Search-specific copy stays local (not "availability" data —
// see lib/arenas.js); id/label come from the shared ARENAS list.
const SEARCH_COPY = {
  casino: { placeholder: "Search casino games", mobilePlaceholder: "Search games" },
  predictions: { placeholder: "Search prediction markets", mobilePlaceholder: "Search markets" },
  sports: { placeholder: "Search sports, leagues or teams", mobilePlaceholder: "Search teams or leagues" },
};
const SEARCH_SCOPES = ARENAS.map((a) => ({ ...a, ...SEARCH_COPY[a.id] }));

// One combined control — a borderless scope <select> and a borderless input
// sharing a single outer border/height/radius/focus ring, not two separate
// controls. Switching scope only swaps the placeholder copy: it doesn't
// navigate — Casino/Sports/Predictions each search their own page's own
// content, and `defaultScope` just seeds which one this instance opens on
// (Sports opens on "sports", Predictions on "predictions", etc). Exported:
// this is the one search implementation shared by all three arenas — the
// focus ring uses the one Tribet brand colour (--global-cta), same on
// every arena — no per-arena tint anymore.
//
// `panel` is optional — Casino passes a grouped results/empty/no-results
// ReactNode (see CasinoSearch.jsx) to get real combobox behaviour: this
// component owns only the input/scope-select chrome and the anchored
// positioning wrapper, never the panel's contents, grouping, or keyboard
// semantics — those are entirely the caller's (see `onInputKeyDown`,
// `activeDescendantId`). Sports/Predictions pass none of this and keep their
// original plain-input behaviour untouched: no dropdown, no combobox roles.
//
// `mobileMode="fullscreen"` (Casino-only) suppresses the inline dropdown
// below `md:` entirely — focusing the input calls `onMobileFocus` instead,
// so the caller can mount its own full-screen search surface rather than
// this component trying to be both an inline combobox and a modal.
//
// `open`/`onOpenChange` are optionally controlled: Casino passes both (it
// needs to force-close the panel after a mouse selection, since results use
// onMouseDown={preventDefault} to keep focus in the input while clicking —
// see CasinoSearch.jsx). Sports/Predictions pass neither and get the
// original uncontrolled focus/blur-driven open state, unchanged.
export function ScopedSearch({
  query, onQuery, defaultScope = "casino",
  panel, panelId, onInputKeyDown, activeDescendantId,
  open: openProp, onOpenChange,
  mobileMode = "inline", onMobileFocus,
}) {
  const [scope, setScope] = useState(defaultScope);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlledOpen = openProp !== undefined;
  const open = isControlledOpen ? openProp : internalOpen;
  const rootRef = useRef(null);
  const active = SEARCH_SCOPES.find((s) => s.id === scope);
  const setOpen = (next) => {
    if (!isControlledOpen) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this
  // app. Casino is always selectable (see lib/platformScope.js's
  // isArenaAllowed); Predictions/Sports are only disabled here while
  // MVP-scoped.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";
  // Mirrors App.jsx's "switching to MVP while inside a disabled arena
  // immediately redirects" effect: if scope somehow points at a
  // now-disallowed arena (e.g. Platform Scope flips to MVP live while
  // "Sports" was selected here), snap back to Casino rather than leaving
  // an impossible-to-search scope selected.
  useEffect(() => {
    if (!isArenaAllowed(scope, platformScope)) setScope("casino");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to scope-mode flips, not every scope change
  }, [platformScope]);

  // Placeholder text only — matches the shared md: breakpoint the rest of
  // the mobile shell uses (Sidebar/MobileBottomNav).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const hasPanel = panel !== undefined;
  const fullscreenOnMobile = mobileMode === "fullscreen" && isMobile;
  // Casino's panel decides its own content for every state (empty query,
  // results, no-results) — no query-length gate here, unlike the old
  // results-only dropdown. On mobile in fullscreen mode this never renders
  // inline at all; onMobileFocus below opens the caller's own surface.
  const showPanel = hasPanel && open && !fullscreenOnMobile;

  // All keyboard semantics beyond a bare Escape fallback belong to the
  // caller (Casino owns a flattened cross-group active index ScopedSearch
  // has no visibility into). If the caller's handler already dealt with
  // Escape (e.g. clearing the active selection first), it calls
  // preventDefault() and this fallback close is skipped — see
  // CasinoSearch.jsx's two-stage Escape.
  const onKeyDown = (e) => {
    onInputKeyDown?.(e);
    if (e.key === "Escape" && !e.defaultPrevented && hasPanel && open) setOpen(false);
  };

  // Close only when focus truly leaves the whole combobox (input, panel,
  // scope select) — not on every internal focus move.
  const onBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
  };

  // NAV SPEC §8 — "the scrim absorbs the outside click": clicking a sidebar
  // row (or anything else outside this combobox) while the panel is open
  // must close search WITHOUT that same click also registering as a real
  // navigation click on whatever it landed on.
  //
  // The naive version of this (a click-capture listener attached only while
  // `open` is true) does not work: for a real mouse user, `mousedown` moves
  // focus to the outside element FIRST, which fires `onBlur` above and
  // closes the panel — and React's resulting re-render (which tears down
  // the "while open" listener as its cleanup) reliably finishes before the
  // browser dispatches the follow-up `click` event for that same gesture.
  // So by the time `click` arrives, open is already false and the listener
  // meant to catch it has already unmounted (verified empirically: adding
  // logging showed the effect cleanup running between mousedown and click
  // every time). The fix is to stop depending on React state's timing
  // entirely: `openRef` mirrors `open` synchronously (no render involved),
  // and the swallow decision is made and latched at `mousedown` — before
  // blur/focus/any re-render can happen — then consumed by the next `click`
  // regardless of what `open` has become by then. Both listeners stay
  // attached for the component's whole lifetime (gated only on `hasPanel`,
  // never on `open`), so there is no attach/detach race to begin with.
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  const swallowNextClickRef = useRef(false);
  useEffect(() => {
    if (!hasPanel) return undefined;
    const onDocumentMouseDownCapture = (e) => {
      swallowNextClickRef.current = Boolean(
        openRef.current && rootRef.current && !rootRef.current.contains(e.target)
      );
    };
    const onDocumentClickCapture = (e) => {
      if (!swallowNextClickRef.current) return;
      swallowNextClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("mousedown", onDocumentMouseDownCapture, true);
    document.addEventListener("click", onDocumentClickCapture, true);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDownCapture, true);
      document.removeEventListener("click", onDocumentClickCapture, true);
    };
  }, [hasPanel]);

  return (
    <div>
      {/* VISUAL REFRESH: visible "Search" caption removed (redundant next
          to the scope selector + search icon + placeholder) — sr-only
          preserves the exact same programmatic accessible name via the
          existing label/input association, nothing lost for screen
          readers. */}
      <label htmlFor="arena-search-input" className="sr-only">
        Search
      </label>
      <div ref={rootRef} onBlur={onBlur} className="relative">
        {/* SURFACE HIERARCHY POLISH: border-white/10 -> /8. Dimensions,
            radius, category selector, icon, placeholder and interaction
            are all untouched — bg-zinc-900 already reads as distinguishable
            from the lifted --background (see index.css), verified after
            the background change; this only softens the border itself. */}
        <div className="flex h-11 items-center rounded-lg border border-white/8 bg-zinc-900 focus-within:ring-2 focus-within:ring-[var(--global-cta)]">
          <div className="relative flex h-full shrink-0 items-center">
            {/* A real <select> can't carry a Radix Tooltip or custom opacity
                per <option> — the browser renders that native popup itself,
                opaque to CSS/JS once open — so disabled-arena scope options
                need a real (Radix) menu instead. Casino is never disabled
                (see lib/platformScope.js's isArenaAllowed); Predictions/
                Sports gate the same way the main arena nav does. */}
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label="Search scope"
                  data-test-id="search-scope"
                  className="flex h-full items-center whitespace-nowrap rounded-l-lg border-0 bg-transparent py-0 pl-2.5 pr-6 text-sm font-medium text-white outline-none focus-visible:outline-none sm:pl-3 sm:pr-7"
                >
                  {active.label}
                </button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                  align="start"
                  sideOffset={8}
                  className="z-[var(--z-header-popover)] min-w-[10rem] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 p-1 text-white outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                  style={{ boxShadow: "var(--elevation-medium)" }}
                >
                  <DropdownMenuPrimitive.RadioGroup
                    value={scope}
                    onValueChange={(v) => { setScope(v); track("casino_search_scope_changed", { searchScope: v }); }}
                  >
                    {SEARCH_SCOPES.map((s) => {
                      const scopeDisabled = DEV_PANEL_ENABLED && !isArenaAllowed(s.id, platformScope);
                      const item = (
                        <DropdownMenuPrimitive.RadioItem
                          key={s.id}
                          value={s.id}
                          disabled={scopeDisabled}
                          className={cn(
                            "flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-white/10",
                            scopeDisabled && "cursor-not-allowed opacity-50 data-[highlighted]:bg-transparent"
                          )}
                        >
                          {s.label}
                        </DropdownMenuPrimitive.RadioItem>
                      );
                      // Tooltip only wraps disabled options — same "Coming
                      // soon", hover/focus-only (never tap-triggered), no
                      // layout shift pattern as the main arena nav (see
                      // Sidebar.jsx).
                      return DEV_PANEL_ENABLED && scopeDisabled ? (
                        <Tooltip key={s.id}>
                          <TooltipTrigger asChild>{item}</TooltipTrigger>
                          <TooltipContent side="right">Coming soon</TooltipContent>
                        </Tooltip>
                      ) : item;
                    })}
                  </DropdownMenuPrimitive.RadioGroup>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
            <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-zinc-500 sm:right-2" />
          </div>
          <span className="h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500 sm:left-3" />
            <input
              id="arena-search-input"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => {
                track("casino_search_focused", { searchScope: scope });
                if (fullscreenOnMobile) { onMobileFocus?.(); return; }
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder={isMobile ? active.mobilePlaceholder : active.placeholder}
              data-test-id="arena-search"
              role={hasPanel ? "combobox" : undefined}
              aria-expanded={hasPanel ? showPanel : undefined}
              aria-controls={hasPanel ? panelId : undefined}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete={hasPanel ? "list" : undefined}
              autoComplete="off"
              className={cn(
                "h-full w-full min-w-0 rounded-r-lg border-0 bg-transparent pl-8 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none sm:pl-9",
                query && "pr-8 sm:pr-9"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQuery(""); document.getElementById("arena-search-input")?.focus(); }}
                aria-label="Clear search"
                data-test-id="arena-search-clear"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-2.5"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showPanel && (
          <div
            id={panelId}
            data-test-id="arena-search-panel"
            className="tribet-scrollbar absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[28rem] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900"
            style={{ boxShadow: "var(--elevation-medium)" }}
          >
            {panel}
          </div>
        )}
      </div>
    </div>
  );
}

// MOCKUP ALIGNMENT CORRECTION: the previous pass gave the wallet card a
// dominant ~48% column against two ~26% secondary cards — reads as one
// hero widget plus two afterthoughts, not "one coherent system" of three
// equal promotional cards. Corrected to a strict equal-thirds system:
// mobile (base) keeps the existing real horizontal snap-scroll carousel
// (three equal 82%-viewport-width columns — unrelated to this fix, and
// already what produced the accidental "200% u…" / "$50,00…" clipping
// this file's history refers to); tablet (sm+) keeps the wallet card
// spanning a full-width row above the two secondary cards sharing a row
// beneath it (one of the task's two explicitly pre-approved tablet
// patterns — three columns are too narrow to stay readable at sm:/md:
// widths); desktop (lg+) is now three GENUINELY equal columns
// (grid-cols-3, i.e. repeat(3, minmax(0,1fr))) — no card gets a wider
// grid track than another. Any visual "importance" a card carries now
// comes only from its own copy/artwork, never from a larger column span.
export function PromoStrip({ query, onQuery, searchPanelProps, onManageWallet }) {
  const [p1, p2] = PROMOS;
  return (
    <div className="casino-content-column w-full space-y-4">
      <div className="top-card-grid -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        <div className="w-[82%] shrink-0 snap-start sm:col-span-2 sm:w-auto sm:shrink lg:col-span-1"><PlayerTile onManageWallet={onManageWallet} /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink">
          <WelcomeOfferCard eyebrow={p1.eyebrow} title={p1.title} metadata={p1.body} cta={p1.cta} />
        </div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink">
          <WeeklyRaceCard eyebrow={p2.eyebrow} title={p2.title} metadata={p2.body} cta={p2.cta} />
        </div>
      </div>
      <ScopedSearch
        query={query}
        onQuery={onQuery}
        {...searchPanelProps}
      />
    </div>
  );
}
