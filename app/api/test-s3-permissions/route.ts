import { NextResponse } from "next/server"
import AWS from "aws-sdk"

const s3 = new AWS.S3({
  accessKeyId: "AKIA6JQ44OGI7KIS4NAV",
  secretAccessKey: "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",
  region: "ap-northeast-2",
})

const S3_BUCKET_NAME = "nt-security-challenges-files"

export async function GET() {
  const results = {
    bucket: S3_BUCKET_NAME,
    tests: {} as Record<string, { success: boolean; error?: string }>,
  }

  // 1. HeadBucket 테스트
  try {
    await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise()
    results.tests.headBucket = { success: true }
  } catch (error) {
    results.tests.headBucket = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }

  // 2. ListObjects 테스트
  try {
    await s3.listObjectsV2({ Bucket: S3_BUCKET_NAME, MaxKeys: 1 }).promise()
    results.tests.listObjects = { success: true }
  } catch (error) {
    results.tests.listObjects = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }

  // 3. PutObject 테스트
  const testKey = `test/permission-test-${Date.now()}.txt`
  try {
    await s3
      .putObject({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
        Body: "Permission test",
        ContentType: "text/plain",
      })
      .promise()
    results.tests.putObject = { success: true }

    // 4. DeleteObject 테스트
    try {
      await s3.deleteObject({ Bucket: S3_BUCKET_NAME, Key: testKey }).promise()
      results.tests.deleteObject = { success: true }
    } catch (error) {
      results.tests.deleteObject = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  } catch (error) {
    results.tests.putObject = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }

  const allSuccess = Object.values(results.tests).every((test) => test.success)

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess ? "All permissions working!" : "Some permissions failed",
    ...results,
  })
}
