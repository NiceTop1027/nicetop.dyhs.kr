import { NextResponse } from "next/server"
import AWS from "aws-sdk"

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "AKIA6JQ44OGI7KIS4NAV",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "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",
  region: process.env.AWS_REGION || "ap-northeast-2",
})

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "nt-security-challenges-files"

export async function GET() {
  try {
    // 1. 버킷 존재 확인
    await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise()
    console.log("✅ Bucket exists and accessible")

    // 2. 버킷 리스트 권한 확인
    await s3.listObjectsV2({ Bucket: S3_BUCKET_NAME, MaxKeys: 1 }).promise()
    console.log("✅ ListObjects permission OK")

    // 3. 테스트 파일 업로드 시도
    const testKey = `test/${Date.now()}-permission-test.txt`
    await s3
      .putObject({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
        Body: "Permission test file",
        ContentType: "text/plain",
      })
      .promise()
    console.log("✅ PutObject permission OK")

    // 4. 테스트 파일 삭제
    await s3
      .deleteObject({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
      })
      .promise()
    console.log("✅ DeleteObject permission OK")

    return NextResponse.json({
      success: true,
      message: "All S3 permissions are working correctly",
      permissions: {
        headBucket: true,
        listObjects: true,
        putObject: true,
        deleteObject: true,
      },
    })
  } catch (error) {
    console.error("S3 permission check failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "S3 permissions check failed. Please verify IAM policies.",
      },
      { status: 403 },
    )
  }
}
