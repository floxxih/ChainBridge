"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

type DrawerSide = "left" | "right" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title rendered in the default header slot */
  title?: string;
  description?: string;
  children?: React.ReactNode;
  side?: DrawerSide;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
  /** Replaces the default header entirely */
  header?: React.ReactNode;
  /** Rendered below the scrollable body */
  footer?: React.ReactNode;
  "aria-label"?: string;
}

const sideStyles: Record<DrawerSide, { base: string; open: string; closed: string }> = {
  right: {
    base: "fixed top-0 right-0 h-full border-l border-border",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
  left: {
    base: "fixed top-0 left-0 h-full border-r border-border",
    open: "translate-x-0",
    closed: "-translate-x-full",
  },
  bottom: {
    base: "fixed bottom-0 left-0 right-0 border-t border-border rounded-t-2xl",
    open: "translate-y-0",
    closed: "translate-y-full",
  },
};

const widthStyles: Record<"sm" | "md" | "lg" | "full", string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-md",
  lg: "w-full max-w-lg",
  full: "w-full",
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

/** Minimum swipe distance (px) to trigger close */
const SWIPE_THRESHOLD = 60;

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  size = "md",
  className,
  header,
  footer,
  "aria-label": ariaLabel,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const { base, open: openClass, closed: closedClass } = sideStyles[side];

  // Capture element that had focus before opening
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Move focus into drawer when it opens
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = getFocusable(panelRef.current);
    (focusable[0] ?? panelRef.current).focus();
  }, [open]);

  // Restore focus when drawer closes
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Keyboard: Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = getFocusable(panelRef.current);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Swipe-to-close (touch events on the panel)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const swipeRight = dx > SWIPE_THRESHOLD && Math.abs(dy) < Math.abs(dx);
    const swipeLeft = dx < -SWIPE_THRESHOLD && Math.abs(dy) < Math.abs(dx);
    const swipeDown = dy > SWIPE_THRESHOLD && Math.abs(dx) < Math.abs(dy);

    if (
      (side === "right" && swipeRight) ||
      (side === "left" && swipeLeft) ||
      (side === "bottom" && swipeDown)
    ) {
      onClose();
    }
  }, [side, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          base,
          side !== "bottom" ? widthStyles[size] : "max-h-[90dvh]",
          "flex flex-col bg-surface-raised shadow-2xl transition-transform duration-300 ease-in-out focus:outline-none",
          open ? openClass : closedClass,
          className
        )}
      >
        {/* Bottom drawer drag handle */}
        {side === "bottom" && (
          <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
        )}

        {/* Header slot */}
        {header ?? (
          (title || description) && (
            <div className="flex-shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-lg font-semibold text-text-primary">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-0.5 text-sm text-text-secondary">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-overlay hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        )}

        {/* Body slot */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer slot */}
        {footer && (
          <div className="flex-shrink-0 border-t border-border px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
