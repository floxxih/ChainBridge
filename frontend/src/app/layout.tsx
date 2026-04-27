import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { EnvValidationWrapper } from "@/components/EnvValidationWrapper";
import { cn } from "@/lib/utils";
import { AppLayoutErrorBoundary } from "@/components/layout/AppLayoutErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chainbridge.io";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ChainBridge | Trustless Cross-Chain Swaps",
    template: "%s | ChainBridge",
  },
  description:
    "Secure, non-custodial atomic swaps on Stellar, Bitcoin, and Ethereum using HTLCs. Zero counterparty risk, no intermediaries.",
  keywords: ["cross-chain", "atomic swap", "HTLC", "Stellar", "Bitcoin", "Ethereum", "DeFi"],
  authors: [{ name: "ChainBridge" }],
  creator: "ChainBridge",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChainBridge",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "ChainBridge",
    title: "ChainBridge | Trustless Cross-Chain Swaps",
    description:
      "Secure, non-custodial atomic swaps on Stellar, Bitcoin, and Ethereum using HTLCs. Zero counterparty risk, no intermediaries.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChainBridge — Trustless Cross-Chain Swaps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainBridge | Trustless Cross-Chain Swaps",
    description:
      "Secure, non-custodial atomic swaps on Stellar, Bitcoin, and Ethereum using HTLCs.",
    images: ["/og-image.png"],
    creator: "@chainbridge_io",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased selection:bg-brand-500/30 selection:text-brand-900",
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        {/* Skip-to-main link — visible on keyboard focus, hidden otherwise */}
        <a
          href="#main-content"
          className="skip-to-main"
        >
          Skip to main content
        </a>
        <AppLayoutErrorBoundary>
          <EnvValidationWrapper>
            <Providers>
              <ServiceWorkerRegistrar />
              <div className="flex min-h-screen">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Main Shell */}
                <div className="relative flex flex-1 flex-col lg:pl-64">
                  <Navbar />
                  <main id="main-content" className="flex-1" tabIndex={-1}>
                    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                      {children}
                    </div>
                  </main>
                  <Footer />
                </div>
              </div>
            </Providers>
          </EnvValidationWrapper>
        </AppLayoutErrorBoundary>
      </body>
    </html>
  );
}
