"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/I18nProvider";
import { NAV_LINKS } from "./navigation";
import { Layers, ChevronRight } from "lucide-react";
import { stripLocaleFromPathname } from "@/lib/i18n/config";
import { shouldPrefetch } from "@/lib/prefetch";

export function Sidebar() {
  const pathname = usePathname();
  const normalizedPathname = stripLocaleFromPathname(pathname);
  const { t, localizePath } = useI18n();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-surface-raised transition-all lg:flex z-50">
      {/* Sidebar Header: Logo */}
      <div className="flex h-16 items-center px-6">
        <Link
          href={localizePath("/")}
          className="flex items-center gap-2.5 transition hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-primary">ChainBridge</span>
        </Link>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 no-scrollbar" aria-label="Main Navigation">
        <ul className="space-y-1.5" role="list">
          {NAV_LINKS.map((link) => {
            const isActive = normalizedPathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={localizePath(link.href)}
                  prefetch={shouldPrefetch(link.href, normalizedPathname)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-brand-500/10 text-brand-500 shadow-sm"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Visual indicator for active state */}
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all duration-300",
                        isActive
                          ? "bg-brand-500 scale-100"
                          : "bg-transparent scale-0 group-hover:bg-text-muted/30 group-hover:scale-100"
                      )}
                    />
                    {t(link.key)}
                  </div>
                  {isActive && (
                    <ChevronRight
                      size={14}
                      className="animate-in slide-in-from-left-1 duration-300"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-2xl bg-surface-overlay p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-status-success animate-pulse shadow-[0_0_8px_rgba(var(--status-success),0.4)]" />
            <span className="text-xs font-medium text-text-secondary">Network Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
