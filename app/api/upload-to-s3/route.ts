import { type NextRequest, NextResponse } from "next/server"

// AWS SDK 대신 fetch를 사용한 직접 S3 API 호출
const AWS_ACCESS_KEY_ID = "AKIA6JQ44OGI7KIS4NAV"
const AWS_SECRET_ACCESS_KEY = "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"
const AWS_REGION = "ap-northeast-2"
const S3_BUCKET_NAME = "nt-security-challenges-files"

// 허용된 파일 확장자
const ALLOWED_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".exe",
  ".bin",
  ".out",
  ".elf",
  ".so",
  ".dll",
  ".txt",
  ".md",
  ".html",
  ".css",
  ".js",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".py",
  ".c",
  ".cpp",
  ".h",
  ".java",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".sh",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".pcap",
  ".pcapng",
  ".log",
  ".conf",
  ".cfg",
  ".ini",
]

// AWS 서명 생성 함수
async function createAwsSignature(method: string, url: string, headers: Record<string, string>, payload = "") {
  const crypto = await import("crypto")

  const algorithm = "AWS4-HMAC-SHA256"
  const service = "s3"
  const region = AWS_REGION
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const datetime = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "") + "Z"

  // 정규화된 요청 생성
  const canonicalUri = new URL(url).pathname
  const canonicalQueryString = ""
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key]}\n`)
    .join("")
  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(";")

  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex")

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  // 서명 문자열 생성
  const credentialScope = `${date}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    datetime,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n")

  // 서명 키 생성
  const kDate = crypto.createHmac("sha256", `AWS4${AWS_SECRET_ACCESS_KEY}`).update(date).digest()
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest()
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest()
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest()

  // 최종 서명
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex")

  // Authorization 헤더
  const authorization = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    authorization,
    datetime,
    payloadHash,
  }
}

export async function POST(request: NextRequest) {
  console.log("=== S3 Upload API Called (Direct Method) ===")

  try {
    // 1. 요청 데이터 파싱
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "challenges"

    console.log("Request data:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      folder: folder,
    })

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 2. 파일 검증
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large (max 50MB)" }, { status: 400 })
    }

    const fileExtension = "." + (file.name.split(".").pop()?.toLowerCase() || "")
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json({ error: `File type not allowed: ${fileExtension}` }, { status: 400 })
    }

    // 3. 파일 준비
    const timestamp = Date.now()
    const { v4: uuidv4 } = await import("uuid")
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${folder}/${timestamp}/${uuidv4()}_${safeFileName}`

    console.log("Preparing file upload:", {
      originalName: file.name,
      s3Key: fileName,
    })

    // 4. 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 5. S3 직접 업로드 (AWS SDK 없이)
    const s3Url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`

    const headers = {
      Host: `${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": buffer.length.toString(),
      "X-Amz-Content-Sha256": "",
      "X-Amz-Date": "",
    }

    // AWS 서명 생성
    const { authorization, datetime, payloadHash } = await createAwsSignature("PUT", s3Url, headers, buffer.toString())

    headers["X-Amz-Date"] = datetime
    headers["X-Amz-Content-Sha256"] = payloadHash
    headers["Authorization"] = authorization

    console.log("Uploading to S3 directly:", {
      url: s3Url,
      method: "PUT",
      contentType: headers["Content-Type"],
      contentLength: headers["Content-Length"],
    })

    // 6. S3에 직접 업로드
    const uploadResponse = await fetch(s3Url, {
      method: "PUT",
      headers: headers,
      body: buffer,
    })

    console.log("S3 upload response:", {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      ok: uploadResponse.ok,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error("S3 upload failed:", errorText)

      return NextResponse.json(
        {
          error: "S3 upload failed",
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          details: errorText,
        },
        { status: uploadResponse.status },
      )
    }

    // 7. 성공 응답
    const fileUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`

    console.log("✅ S3 upload successful:", {
      fileUrl: fileUrl,
      fileName: fileName,
    })

    return NextResponse.json({
      success: true,
      fileUrl: fileUrl,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      bucket: S3_BUCKET_NAME,
      key: fileName,
    })
  } catch (error) {
    console.error("❌ Upload error:", error)

    // 상세한 에러 정보 반환
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        errorString: String(error),
      },
      { status: 500 },
    )
  }
}
