"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-brand-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: "border-emerald-500/20",
  error: "border-red-500/20",
  info: "border-brand-500/20",
  warning: "border-yellow-500/20",
};

export function Toast({
  id,
  type = "info",
  title,
  message,
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, duration);
    return () => clearTimeout(t);
  }, [id, duration, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-surface-raised p-4 shadow-card-dark",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        BORDER_COLORS[type]
      )}
    >
      <div className="shrink-0 mt-0.5">{ICONS[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {message && <p className="mt-0.5 text-xs text-text-secondary">{message}</p>}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(id), 300);
        }}
        className="shrink-0 rounded-lg p-0.5 text-text-muted hover:text-text-primary transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Toast container rendered at fixed bottom-right */
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: (Omit<ToastProps, "onDismiss"> & { id: string })[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 w-80">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
