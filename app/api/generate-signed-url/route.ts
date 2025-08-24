import { type NextRequest, NextResponse } from "next/server"
import AWS from "aws-sdk"

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "nt-security-challenges-files"

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    // 서명된 URL 생성 (1시간 유효)
    const signedUrl = await s3.getSignedUrlPromise("getObject", {
      Bucket: S3_BUCKET_NAME,
      Key: fileName,
      Expires: 3600, // 1시간
    })

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl,
    })
  } catch (error) {
    console.error("Signed URL generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate signed URL: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
