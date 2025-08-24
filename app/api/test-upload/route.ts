import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== Test Upload Endpoint ===")

  try {
    // 기본 정보 확인
    const info = {
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
      },
    }

    console.log("System info:", info)

    return NextResponse.json({
      success: true,
      message: "Test endpoint working",
      info,
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
