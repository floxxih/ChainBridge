"use client";

import Link from "next/link";
import { Layers, Globe, Share2, ExternalLink } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-text-primary">
                ChainBridge
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              A trustless, non-custodial gateway for cross-chain atomic swaps. Built on Stellar,
              Bitcoin, and Ethereum.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/swap" className="hover:text-brand-500 transition">
                  Create Swap
                </Link>
              </li>
              <li>
                <Link href="/swaps" className="hover:text-brand-500 transition">
                  Swap History
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand-500 transition">
                  How it Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">Ecosystem</h3>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>
                <a
                  href="https://stellar.org"
                  target="_blank"
                  className="flex items-center gap-1 hover:text-brand-500 transition"
                >
                  Stellar <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://ethereum.org"
                  target="_blank"
                  className="flex items-center gap-1 hover:text-brand-500 transition"
                >
                  Ethereum <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://bitcoin.org"
                  target="_blank"
                  className="flex items-center gap-1 hover:text-brand-500 transition"
                >
                  Bitcoin <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Stay Connected</h3>
            <div className="mt-4 flex gap-4">
              <a href="#" className="text-text-muted hover:text-text-primary transition">
                <Globe className="h-5 w-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-text-primary transition">
                <Share2 className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs text-text-muted">
            © {currentYear} ChainBridge Platform. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center gap-6 sm:mt-0">
            <Link
              href="/terms"
              className="text-xs text-text-muted hover:text-text-primary transition"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-text-muted hover:text-text-primary transition"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
