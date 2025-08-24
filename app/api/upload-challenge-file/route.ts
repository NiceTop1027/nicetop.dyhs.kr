import { type NextRequest, NextResponse } from "next/server"
import { uploadToS3, transferToEC2 } from "@/lib/aws-upload"
import { getServerSession } from "next-auth"

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const challengeType = formData.get("type") as string // 'wargame' or 'ctf'
    const challengeId = formData.get("challengeId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 파일 크기 및 확장자 검증
    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const allowedExtensions = [".zip", ".tar", ".gz", ".7z", ".rar", ".pdf", ".txt", ".md"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    // S3에 업로드
    const folder = `${challengeType}/${challengeId}`
    const uploadResult = await uploadToS3(file, folder)

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 })
    }

    // EC2로 파일 전송 (선택적)
    const ec2Path = `/var/www/challenges/${folder}/${file.name}`
    const transferSuccess = await transferToEC2(uploadResult.fileName!, ec2Path)

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      ec2Transferred: transferSuccess,
      downloadUrl: `/api/download-challenge-file?file=${uploadResult.fileName}`,
    })
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
