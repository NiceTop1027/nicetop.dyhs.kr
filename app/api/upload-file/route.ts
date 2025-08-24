import { type NextRequest, NextResponse } from "next/server"
import { uploadToFirebaseStorage } from "@/lib/firebase-storage"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Firebase Storage Upload API called ===")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "challenges"
    const originalName = formData.get("originalName") as string

    console.log("Request details:", {
      file: file
        ? {
            name: file.name,
            size: file.size,
            type: file.type,
          }
        : null,
      folder,
      originalName,
    })

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    // 파일 크기 제한 (100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File too large (max 100MB)" }, { status: 400 })
    }

    // 허용된 파일 확장자 검사
    const allowedExtensions = [
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
      ".pdf",
      ".txt",
      ".md",
      ".doc",
      ".docx",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".exe",
      ".bin",
      ".py",
      ".c",
      ".cpp",
      ".java",
    ]

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ success: false, error: `File type ${fileExtension} not allowed` }, { status: 400 })
    }

    // Firebase Storage에 업로드
    const uploadResult = await uploadToFirebaseStorage(file, folder)

    if (!uploadResult.success) {
      console.error("Upload failed:", uploadResult.error)
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || "Upload failed",
          details: uploadResult.details,
        },
        { status: 500 },
      )
    }

    console.log("✅ Upload successful:", uploadResult)

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      originalName: originalName || file.name,
    })
  } catch (error) {
    console.error("❌ Upload API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}
