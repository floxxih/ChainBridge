"use client";

import { useToastStore } from "@/hooks/useToast";
import { ToastContainer } from "./toast";

export function ToastProvider() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Screen-reader-only live region for toast announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {toasts.length > 0 && toasts[toasts.length - 1]
          ? `${toasts[toasts.length - 1].type}: ${toasts[toasts.length - 1].title}`
          : null}
      </div>
    </>
  );
}
