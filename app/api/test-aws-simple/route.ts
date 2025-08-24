import { NextResponse } from "next/server"
import AWS from "aws-sdk"

// 간단한 AWS 연결 테스트
export async function GET() {
  try {
    const s3 = new AWS.S3({
      accessKeyId: "AKIA6JQ44OGI7KIS4NAV",
      secretAccessKey: "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",
      region: "ap-northeast-2",
    })

    console.log("Testing AWS S3 connection...")

    // 1. 버킷 목록 조회
    const buckets = await s3.listBuckets().promise()
    console.log(
      "Available buckets:",
      buckets.Buckets?.map((b) => b.Name),
    )

    // 2. 특정 버킷 확인
    const bucketName = "nt-security-challenges-files"
    try {
      const bucketLocation = await s3.getBucketLocation({ Bucket: bucketName }).promise()
      console.log("Bucket location:", bucketLocation.LocationConstraint)
    } catch (bucketError) {
      console.error("Bucket access error:", bucketError)
      return NextResponse.json({
        success: false,
        error: "Bucket access failed",
        buckets: buckets.Buckets?.map((b) => b.Name) || [],
        details: bucketError instanceof Error ? bucketError.message : "Unknown error",
      })
    }

    // 3. 간단한 업로드 테스트
    const testKey = `test/connection-test-${Date.now()}.txt`
    await s3
      .putObject({
        Bucket: bucketName,
        Key: testKey,
        Body: "Connection test",
        ContentType: "text/plain",
      })
      .promise()

    // 4. 테스트 파일 삭제
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: testKey,
      })
      .promise()

    return NextResponse.json({
      success: true,
      message: "AWS S3 connection successful!",
      buckets: buckets.Buckets?.map((b) => b.Name) || [],
      targetBucket: bucketName,
    })
  } catch (error) {
    console.error("AWS connection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "AWS connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
