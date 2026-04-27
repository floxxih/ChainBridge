"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { captureError } from "@/lib/errorMonitor";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  resetKeys?: unknown[];
  contextName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const contextName = this.props.contextName ?? "UnknownBoundary";
    console.error(`[ErrorBoundary:${contextName}]`, error, info.componentStack);
    captureError(error, {
      errorBoundary: contextName,
      componentStack: info.componentStack ?? "",
    });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    if (!this.state.hasError || !resetKeys || !prevProps.resetKeys) return;

    const hasResetKeyChanged =
      resetKeys.length !== prevProps.resetKeys.length ||
      resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys?.[index]));

    if (hasResetKeyChanged) {
      this.handleReset();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className={cn(
            "mx-auto flex w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center",
            this.props.className
          )}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-text-primary">Something went wrong</h2>
          <p className="mb-6 max-w-sm text-sm text-text-secondary">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-hover"
            >
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
