import { type NextRequest, NextResponse } from "next/server"
import { generateSignedUrl } from "@/lib/aws-upload"
import { getServerSession } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("file")

    if (!fileName) {
      return NextResponse.json({ error: "File name required" }, { status: 400 })
    }

    // 서명된 URL 생성 (1시간 유효)
    const signedUrl = await generateSignedUrl(fileName, 3600)

    // 직접 리다이렉트하거나 URL 반환
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error("Download API error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
