import { type NextRequest, NextResponse } from "next/server"

// 간단한 로컬 파일 저장 (임시 해결책)
export async function POST(request: NextRequest) {
  console.log("=== Simple Upload API Called ===")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "challenges"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // 파일을 base64로 인코딩하여 반환 (임시)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")

    // 임시 파일 URL 생성
    const timestamp = Date.now()
    const fileName = `${folder}/${timestamp}/${file.name}`
    const fileUrl = `data:${file.type};base64,${base64}`

    console.log("✅ File processed successfully")

    return NextResponse.json({
      success: true,
      fileUrl: fileUrl,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      method: "base64",
    })
  } catch (error) {
    console.error("❌ Simple upload error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
