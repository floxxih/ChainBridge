"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";
import { WalletConnect } from "../swap/WalletConnect";
import { useSettingsStore } from "@/hooks/useSettings";
import { Layers, Menu } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { NAV_LINKS } from "@/components/layout/navigation";
import { SUPPORTED_LOCALES, stripLocaleFromPathname } from "@/lib/i18n/config";
import { CommandPalette } from "./CommandPalette";
import { MobileNavDrawer } from "./MobileNavDrawer";


export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPathname = stripLocaleFromPathname(pathname);
  const { t, localizePath } = useI18n();
  const networkMode = useSettingsStore((state) => state.settings.network.mode);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo & Desktop Links */}
          <div className="flex items-center gap-8">
            <Link
              href={localizePath("/")}
              className="flex items-center gap-2 transition hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-text-primary">
                ChainBridge
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={localizePath(link.href)}
                  aria-current={normalizedPathname === link.href ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    normalizedPathname === link.href
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  )}
                >
                  {t(link.key)}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side: Actions & Mobile Toggle */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                Stellar
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
                <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                Bitcoin
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary opacity-50">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Ethereum
              </span>
            </div>

            <div className="hidden sm:block">
              <CommandPalette />
            </div>

            <select
              aria-label="Language selector"
              value={pathname.split("/").filter(Boolean)[0] || "en"}
              onChange={(event) => {
                const basePath = stripLocaleFromPathname(pathname);
                router.push(`/${event.target.value}${basePath === "/" ? "" : basePath}`);
              }}
              className="hidden rounded-lg border border-border bg-surface-overlay px-2 py-1 text-xs text-text-secondary md:block"
            >
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}
                </option>
              ))}
            </select>

            <div className="hidden lg:block">
              <WalletConnect />
            </div>

            <div className="hidden h-6 w-px bg-border md:block" />

            <span className="hidden rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted lg:inline-flex">
              {networkMode}
            </span>

            <div className="hidden md:block">
              <DarkModeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-overlay text-text-primary md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={isOpen}
              aria-haspopup="dialog"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <MobileNavDrawer open={isOpen} onClose={() => setIsOpen(false)} />
    </nav>
  );
}
