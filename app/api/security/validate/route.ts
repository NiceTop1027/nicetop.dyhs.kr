import { type NextRequest, NextResponse } from "next/server"
import { validateInput, checkRateLimit } from "@/lib/security-utils"

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    // Rate limiting 체크
    const rateLimit = checkRateLimit(ip, 50, 15 * 60 * 1000) // 15분에 50회

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "50",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        },
      )
    }

    const body = await request.json()

    // 입력 검증
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && !validateInput(value)) {
        return NextResponse.json({ error: `Invalid input detected in field: ${key}` }, { status: 400 })
      }
    }

    return NextResponse.json({
      valid: true,
      remaining: rateLimit.remaining,
    })
  } catch (error) {
    console.error("Security validation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
