import type { ReactNode } from "react"
import { Inter, Noto_Sans_KR } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"
import { Suspense } from "react"
import { SanctionInitializer } from "@/components/sanction-initializer"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
})

export const metadata: Metadata = {
  title: "NiceTop-CTF",
  description:
    "NiceTop이 개발한 정보보안 교육 플랫폼입니다. NiceTop 팀과 덕영고등학교의 지원으로 구현된 이 플랫폼은 워게임, CTF 대회, 커뮤니티 기능을 통해 다양한 경험을 제공합니다. 미래 사이버 보안 전문가를 위한 최적의 훈련 환경을 경험해보세요.",
  icons: {
    icon: "/NT-Logo_v2.png",
  },
  generator: "v0.dev",
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${inter.variable} ${notoSansKR.variable}`}>
      <body className={`${inter.className} dark antialiased`}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              }
            >
              <>
                <SanctionInitializer />
                {children}
              </>
            </Suspense>
          </ThemeProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
