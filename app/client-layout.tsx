"use client"

import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-context"
import { SearchProvider } from "@/components/search-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationListener } from "@/components/notification-listener"
import { Suspense } from "react"

interface RootLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: RootLayoutProps) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          }
        >
          <SearchProvider>
            <NotificationListener />
            {children}
          </SearchProvider>
        </Suspense>
      </ThemeProvider>
      <Toaster />
    </AuthProvider>
  )
}
