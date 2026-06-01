import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "New Swap",
  description:
    "Create a new cross-chain atomic swap. Exchange assets trustlessly between Stellar, Bitcoin, and Ethereum with no intermediaries.",
  alternates: { canonical: "/swap" },
  openGraph: {
    title: "New Cross-Chain Swap | ChainBridge",
    description:
      "Create a new HTLC atomic swap to exchange assets trustlessly between Stellar, Bitcoin, and Ethereum.",
    url: "/swap",
  },
};

export default function SwapLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
