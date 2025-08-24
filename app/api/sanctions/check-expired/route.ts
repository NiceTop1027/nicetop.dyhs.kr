// 서버 사이드 제재 만료 확인 API
import { type NextRequest, NextResponse } from "next/server"
import { checkExpiredSanctions } from "@/lib/admin-utils"

export async function POST(request: NextRequest) {
  try {
    const result = await checkExpiredSanctions()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Expired sanctions checked successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in sanctions check API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
