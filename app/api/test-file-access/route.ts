import { NextResponse } from "next/server"
import { readdir, stat } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    console.log("=== Test file access ===")

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const wargameDir = path.join(uploadsDir, "wargame")

    console.log("Testing directories:")
    console.log("  Uploads dir:", uploadsDir)
    console.log("  Wargame dir:", wargameDir)

    const results: any = {
      uploadsDir: {
        path: uploadsDir,
        exists: false,
        files: [],
      },
      wargameDir: {
        path: wargameDir,
        exists: false,
        files: [],
      },
    }

    // uploads 디렉토리 확인
    try {
      const uploadsStat = await stat(uploadsDir)
      results.uploadsDir.exists = uploadsStat.isDirectory()
      if (results.uploadsDir.exists) {
        results.uploadsDir.files = await readdir(uploadsDir)
      }
    } catch (error) {
      console.log("Uploads directory not found or inaccessible")
    }

    // wargame 디렉토리 확인
    try {
      const wargameStat = await stat(wargameDir)
      results.wargameDir.exists = wargameStat.isDirectory()
      if (results.wargameDir.exists) {
        const files = await readdir(wargameDir)
        results.wargameDir.files = []

        for (const file of files) {
          const filePath = path.join(wargameDir, file)
          const fileStat = await stat(filePath)
          results.wargameDir.files.push({
            name: file,
            size: fileStat.size,
            modified: fileStat.mtime,
            url: `/uploads/wargame/${file}`,
          })
        }
      }
    } catch (error) {
      console.log("Wargame directory not found or inaccessible")
    }

    console.log("✅ File access test completed")
    return NextResponse.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Test file access error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
