import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Swap",
  description:
    "Launch ChainBridge's Swap Wizard to exchange assets trustlessly between Stellar, Bitcoin, and Ethereum with no intermediaries.",
  alternates: { canonical: "/swap" },
  openGraph: {
    title: "Cross-Chain Swap | ChainBridge",
    description:
      "Exchange assets trustlessly between Stellar, Bitcoin, and Ethereum using HTLC atomic swaps.",
    url: "/swap",
  },
};

export default function SwapLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
