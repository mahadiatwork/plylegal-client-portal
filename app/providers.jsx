"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthGuard } from "@/components/AuthGuard";
import { NavigationLoadingProvider } from "@/components/NavigationLoadingProvider";

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ply-theme">
        <AuthGuard>
          <NavigationLoadingProvider>
            {children}
          </NavigationLoadingProvider>
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
