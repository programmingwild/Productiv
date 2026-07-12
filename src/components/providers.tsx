"use client"

import { SessionProvider } from "next-auth/react"
import { LanguageProvider } from "@/contexts/language"
import { TimezoneProvider } from "@/contexts/timezone"
import { ErrorBoundary } from "@/components/error-boundary"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <LanguageProvider>
          <TimezoneProvider>{children}</TimezoneProvider>
        </LanguageProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
