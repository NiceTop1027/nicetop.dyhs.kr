import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 보안 헤더 설정
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'self' https://vercel.live;",
  )
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

  // API 요청 제한 (간단한 rate limiting)
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

  // 민감한 경로 보호
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // 관리자 페이지 접근 로그
    console.log(`Admin access attempt from IP: ${ip} at ${new Date().toISOString()}`)
  }

  // SQL Injection 패턴 감지
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
    /(<script|<iframe|<object|<embed)/i,
  ]

  const url = request.nextUrl.toString()
  const hasQuery = request.nextUrl.search

  if (hasQuery) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        console.warn(`Suspicious request blocked from IP: ${ip} - URL: ${url}`)
        return new NextResponse("Forbidden", { status: 403 })
      }
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
