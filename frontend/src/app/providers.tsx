"use client";

import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { RealTimeManager } from "@/components/RealTimeManager";
import { SettingsEffects } from "@/components/SettingsEffects";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { UnifiedWalletProvider } from "@/components/wallet/UnifiedWalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange={false}
      >
        <SettingsEffects />
        <RealTimeManager />
        <ToastProvider />
        <UnifiedWalletProvider>
          <I18nProvider>{children}</I18nProvider>
        </UnifiedWalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
