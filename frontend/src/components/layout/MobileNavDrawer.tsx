"use client";

import Link from "next/link";
import { Layers, X } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { DarkModeToggle } from "./DarkModeToggle";
import { WalletConnect } from "@/components/swap/WalletConnect";
import { CommandPalette } from "./CommandPalette";
import { NAV_LINKS } from "./navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useSettingsStore } from "@/hooks/useSettings";
import { SUPPORTED_LOCALES, stripLocaleFromPathname } from "@/lib/i18n/config";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPathname = stripLocaleFromPathname(pathname);
  const { t, localizePath } = useI18n();
  const networkMode = useSettingsStore((s) => s.settings.network.mode);

  const header = (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <Link
        href={localizePath("/")}
        onClick={onClose}
        className="flex items-center gap-2 transition hover:opacity-80"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
          <Layers className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold tracking-tight text-text-primary">ChainBridge</span>
      </Link>
      <button
        onClick={onClose}
        aria-label="Close navigation menu"
        className="rounded-lg p-2 text-text-muted transition hover:bg-surface-overlay hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  const footer = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Theme</span>
        <DarkModeToggle />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Language</span>
        <select
          aria-label="Language selector"
          value={pathname.split("/").filter(Boolean)[0] || "en"}
          onChange={(e) => {
            const base = stripLocaleFromPathname(pathname);
            router.push(`/${e.target.value}${base === "/" ? "" : base}`);
            onClose();
          }}
          className="rounded-lg border border-border bg-surface-overlay px-2 py-1 text-xs text-text-secondary"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>{locale.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Network</span>
        <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {networkMode}
        </span>
      </div>
      <CommandPalette />
      <WalletConnect />
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      size="sm"
      header={header}
      footer={footer}
      aria-label="Mobile navigation"
    >
      <nav aria-label="Mobile navigation links">
        <ul className="space-y-1" role="list">
          {NAV_LINKS.map((link) => {
            const active = normalizedPathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={localizePath(link.href)}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all",
                    active
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary active:bg-surface-overlay"
                  )}
                >
                  {t(link.key)}
                  {active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Drawer>
  );
}
