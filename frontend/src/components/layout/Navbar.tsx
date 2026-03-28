"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";
import { WalletConnect } from "../swap/WalletConnect";
import { Layers, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { name: "Swap", href: "/swap" },
  { name: "Market", href: "/marketplace" },
  { name: "Orders", href: "/orders" },
  { name: "HTLCs", href: "/htlcs" },
  { name: "Protocol", href: "/protocol" },
  { name: "Explorer", href: "/transactions" },
  { name: "About", href: "/about" },
  { name: "Admin", href: "/admin" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo & Desktop Links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
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
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side: Actions & Mobile Toggle */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:block">
              <WalletConnect />
            </div>

            <div className="hidden h-6 w-px bg-border md:block" />

            <div className="hidden md:block">
              <DarkModeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-overlay text-text-primary md:hidden"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          "absolute left-0 right-0 top-16 z-50 overflow-hidden border-b border-border bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out md:hidden",
          isOpen ? "max-h-[400px] py-4 shadow-xl" : "max-h-0 py-0 border-none"
        )}
      >
        <div className="container mx-auto px-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all",
                pathname === link.href
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-text-secondary active:bg-surface-overlay"
              )}
            >
              {link.name}
              {pathname === link.href && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          ))}
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-text-secondary">Theme Control</span>
              <DarkModeToggle />
            </div>
            <div className="mt-4 sm:hidden">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
