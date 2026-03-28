"use client";

import { ThemeProvider } from "next-themes";
import { RealTimeManager } from "@/components/RealTimeManager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <RealTimeManager />
      {children}
    </ThemeProvider>
  );
}
