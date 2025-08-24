import { type NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"
import { lookup } from "mime-types"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    console.log("=== File serving request ===")
    console.log("Requested path:", params.path)
    console.log("Request URL:", request.url)

    // 경로 검증
    if (!params.path || params.path.length === 0) {
      console.error("No path provided")
      return new NextResponse("File not found", { status: 404 })
    }

    // 파일 경로 구성
    const filePath = path.join(process.cwd(), "public", "uploads", ...params.path)
    console.log("Full file path:", filePath)

    // 보안 검증: public/uploads 디렉토리 밖으로 나가는 것 방지
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadsDir = path.resolve(uploadsDir)

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      console.error("Path traversal attempt detected:", resolvedPath)
      return new NextResponse("Access denied", { status: 403 })
    }

    // 파일 존재 여부 확인
    try {
      const stats = await stat(filePath)
      if (!stats.isFile()) {
        console.error("Path is not a file:", filePath)
        return new NextResponse("File not found", { status: 404 })
      }
      console.log("File found, size:", stats.size)
    } catch (statError) {
      console.error("File not found:", filePath, statError)
      return new NextResponse("File not found", { status: 404 })
    }

    // 파일 읽기
    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filePath)
      console.log("File read successfully, buffer size:", fileBuffer.length)
    } catch (readError) {
      console.error("Failed to read file:", readError)
      return new NextResponse("Failed to read file", { status: 500 })
    }

    // MIME 타입 결정
    const fileName = params.path[params.path.length - 1]
    const mimeType = lookup(fileName) || "application/octet-stream"
    console.log("File name:", fileName, "MIME type:", mimeType)

    // 응답 헤더 설정
    const headers = new Headers()
    headers.set("Content-Type", mimeType)
    headers.set("Content-Length", fileBuffer.length.toString())
    headers.set("Cache-Control", "public, max-age=31536000") // 1년 캐시
    headers.set("X-Content-Type-Options", "nosniff") // MIME 타입 스니핑 방지
    headers.set("Access-Control-Allow-Origin", "*") // CORS 허용

    // 파일명에 따른 추가 헤더
    if (mimeType.startsWith("image/")) {
      headers.set("Content-Disposition", `inline; filename="${fileName}"`)
    } else {
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`)
    }

    console.log("✅ File served successfully")
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    })
  } catch (error) {
    console.error("❌ File serving error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

// OPTIONS 메서드도 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
