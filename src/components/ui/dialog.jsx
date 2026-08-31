"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      // RESKIN (Ultimate Reskin Spec v1 §1.7/§8.9): was plain bg-black/50,
      // no blur — the doc's own overlay scrim is a graphite-tinted
      // rgba(10,12,16,0.72) with an 8px backdrop blur, not flat black.
      className={cn(
        "fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      style={{ background: "var(--overlay-modal)", backdropFilter: "var(--overlay-blur)" }}
      {...props} />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Top-anchored (no vertical re-centering): top edge stays fixed, only the bottom grows.
          // Tall content scrolls internally instead of shifting the top. Motion = subtle fade + 8px slide, no zoom.
          // RESKIN (Ultimate Reskin Spec v1 §8.9): body background is
          // --surface-2 (was --background/surface-0 — a Dialog body is a
          // RAISED surface per the doc, not the page-level recessed tone),
          // padding 32px (doc's own explicit modal padding, not "unchanged"
          // like §8.2's cards). Shadow now correctly reads --elevation-
          // medium (doc's --shadow-overlay: modal/popover/dropdown) — this
          // was pointing at --elevation-high, which the same pass
          // repointed to the doc's distinct, tighter --shadow-toast value;
          // Dialog and Toaster must not share one shadow number.
          "fixed top-[7vh] left-[50%] z-50 grid max-h-[86vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 gap-4 overflow-x-hidden overflow-y-auto rounded-lg border bg-secondary p-8 outline-none duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=closed]:ease-in data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 sm:max-w-lg",
          className
        )}
        style={{ boxShadow: "var(--elevation-medium)" }}
        {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 grid size-7 place-items-center rounded-md text-muted-foreground opacity-80 ring-offset-background transition-colors hover:bg-secondary hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      // RESKIN (product-language unification): ONE typography system —
      // text-lg font-bold, the exact same recipe every page-title/card-
      // title/section-header in the app uses (font-weight-bold already
      // caps at 500 app-wide). Was a bespoke .text-title-m scale used only
      // here; collapsing the custom type-scale layer into the one plain
      // recipe already used everywhere else, per "create ONE typography
      // system" rather than maintaining several. Shared here so every
      // Dialog-based modal (Funds, Account, Bet History, KYC, Support,
      // etc.) picks it up without a per-file edit.
      className={cn("text-lg font-bold", className)}
      {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
