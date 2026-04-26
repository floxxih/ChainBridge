import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tracking",
  description:
    "Track cross-chain swap execution status, confirmations, and proof verification in real time.",
  alternates: { canonical: "/tracking" },
  openGraph: {
    title: "Swap Tracking | ChainBridge",
    description:
      "Monitor each stage of your atomic swaps with live confirmations and proof checks.",
    url: "/tracking",
  },
};

export default function TrackingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
