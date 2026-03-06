"use client";

import { useTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes"
import { Toaster } from 'sonner'
import QueryProvider from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import NextTopLoader from 'nextjs-toploader';
import { TooltipProvider } from "@/components/ui/tooltip";

function ThemedToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={theme === "dark" ? "dark" : "light"}
      closeButton
      expand
    />
  )
}

export default function Providers({ children, ...props }: ThemeProviderProps) {

  return (
      <ThemeProvider>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>
            <NextTopLoader height={6} color="#0ea5e9" showSpinner={false} easing="ease"/>
            <ThemedToaster />
              {children}
              </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
  )
}

