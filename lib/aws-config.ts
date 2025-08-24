import AWS from "aws-sdk"

// 환경 변수 또는 기본값 사용
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "AKIA6JQ44OGI7KIS4NAV"
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "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"
const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2"

// AWS 설정
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
})

// 설정 검증
console.log("AWS Config:", {
  accessKeyId: AWS_ACCESS_KEY_ID ? "Present" : "Missing",
  secretAccessKey: AWS_SECRET_ACCESS_KEY ? "Present" : "Missing",
  region: AWS_REGION,
})

export const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
  signatureVersion: "v4",
})

export const ec2 = new AWS.EC2({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
})

// S3 버킷 설정 - 실제 값으로 업데이트
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "nt-security-challenges-files"
export const EC2_INSTANCE_ID = process.env.AWS_EC2_INSTANCE_ID || "i-0bed387f9f4e30541"
export const EC2_HOST = process.env.AWS_EC2_HOST || "43.201.67.239"
export const EC2_USERNAME = process.env.AWS_EC2_USERNAME || "ubuntu"

// 파일 업로드 설정
export const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: [".zip", ".tar", ".gz", ".7z", ".rar", ".pdf", ".txt", ".md", ".exe", ".bin"],
  uploadPath: "/var/www/challenges", // EC2 내 업로드 경로
}

// AWS 연결 테스트 함수
export async function testAWSConnection() {
  try {
    console.log("Testing AWS connection...")

    // S3 연결 테스트
    const buckets = await s3.listBuckets().promise()
    console.log("✅ S3 연결 성공:", buckets.Buckets?.length, "개 버킷 발견")

    // 특정 버킷 존재 확인
    try {
      await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise()
      console.log("✅ 대상 버킷 접근 가능:", S3_BUCKET_NAME)
    } catch (bucketError) {
      console.error("❌ 대상 버킷 접근 실패:", S3_BUCKET_NAME, bucketError)
    }

    return { success: true, message: "AWS 연결 성공" }
  } catch (error) {
    console.error("❌ AWS 연결 실패:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
