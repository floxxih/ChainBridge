import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View and manage your open and historical cross-chain swap orders on ChainBridge.",
  alternates: { canonical: "/orders" },
  openGraph: {
    title: "My Orders | ChainBridge",
    description: "View and manage your open and historical cross-chain swap orders on ChainBridge.",
    url: "/orders",
  },
};

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
