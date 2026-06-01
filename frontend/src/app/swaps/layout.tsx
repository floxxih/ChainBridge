import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Swap History",
  description:
    "Track and monitor your cross-chain atomic swaps. View lifecycle status, timeline events, and transaction links for each swap.",
  alternates: { canonical: "/swaps" },
  openGraph: {
    title: "Swap History | ChainBridge",
    description:
      "Monitor the lifecycle status of your cross-chain atomic swaps on ChainBridge.",
    url: "/swaps",
  },
};

export default function SwapsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
