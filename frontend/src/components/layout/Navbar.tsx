"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";
import { WalletConnect } from "../swap/WalletConnect";
import { useSettingsStore } from "@/hooks/useSettings";
import { Layers, Menu, Globe, Cpu } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { SUPPORTED_LOCALES, stripLocaleFromPathname } from "@/lib/i18n/config";
import { CommandPalette } from "./CommandPalette";
import { MobileNavDrawer } from "./MobileNavDrawer";


export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { localizePath } = useI18n();
  const networkMode = useSettingsStore((state) => state.settings.network.mode);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md"
      aria-label="Top navigation"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo (Visible only on mobile) */}
          <div className="flex items-center gap-4">
            <Link
              href={localizePath("/")}
              className="flex items-center gap-2 transition hover:opacity-80 lg:hidden"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-text-primary">
                ChainBridge
              </span>
            </Link>

            {/* Network Breadcrumb (Visible on desktop) */}
            <div className="hidden items-center gap-2 lg:flex">
                <span className="flex items-center gap-2 rounded-lg bg-surface-overlay px-3 py-1.5 text-xs font-semibold text-text-secondary border border-border">
                  <Globe className="h-3.5 w-3.5 text-brand-500" />
                  Mainnet Beta
                </span>
            </div>
          </div>

          {/* Right Side: Actions & Mobile Toggle */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:block">
              <CommandPalette />
            </div>

            <div className="hidden md:flex items-center gap-2 mr-1">
              <select
                aria-label="Language selector"
                value={pathname.split("/").filter(Boolean)[0] || "en"}
                onChange={(event) => {
                  const basePath = stripLocaleFromPathname(pathname);
                  router.push(`/${event.target.value}${basePath === "/" ? "" : basePath}`);
                }}
                className="rounded-lg border border-border bg-surface-overlay px-2 py-1 text-xs font-medium text-text-secondary outline-none transition hover:border-brand-500/50"
              >
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex h-8 items-center gap-2 rounded-xl bg-surface-overlay px-2 border border-border">
              <div className="hidden md:flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">Stellar Live</span>
              </div>
              <div className="h-4 w-px bg-border hidden md:block" />
              <div className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-text-muted" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {networkMode}
                  </span>
              </div>
            </div>

            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

            <div className="hidden sm:block">
              <DarkModeToggle />
            </div>

            <div className="ml-1 items-center gap-2 flex">
              <WalletConnect />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-overlay text-text-primary md:hidden ml-1"
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
