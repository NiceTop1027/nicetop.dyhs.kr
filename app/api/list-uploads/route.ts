import { NextResponse } from "next/server"
import { readdir, stat } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    console.log("=== List uploads request ===")

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    console.log("Uploads directory:", uploadsDir)

    async function listFiles(dir: string, baseDir = ""): Promise<any[]> {
      const files: any[] = []

      try {
        const items = await readdir(dir)

        for (const item of items) {
          const itemPath = path.join(dir, item)
          const stats = await stat(itemPath)
          const relativePath = path.join(baseDir, item)

          if (stats.isDirectory()) {
            const subFiles = await listFiles(itemPath, relativePath)
            files.push({
              name: item,
              type: "directory",
              path: relativePath,
              children: subFiles,
            })
          } else {
            files.push({
              name: item,
              type: "file",
              path: relativePath,
              size: stats.size,
              modified: stats.mtime,
              url: `/uploads/${relativePath.replace(/\\/g, "/")}`,
            })
          }
        }
      } catch (error) {
        console.error("Error reading directory:", dir, error)
      }

      return files
    }

    const files = await listFiles(uploadsDir)

    console.log("✅ Files listed successfully, count:", files.length)
    return NextResponse.json({
      success: true,
      files: files,
      uploadsDir: uploadsDir,
    })
  } catch (error) {
    console.error("❌ List uploads error:", error)
    return NextResponse.json(
      {
        error: "Failed to list uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
