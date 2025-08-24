export interface UploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  error?: string
  details?: any
}

// S3에 파일 업로드 (개선된 버전)
export async function uploadToS3(file: File, folder = "challenges"): Promise<UploadResult> {
  console.log("=== Client-side uploadToS3 called ===")
  console.log("File details:", {
    name: file.name,
    size: file.size,
    type: file.type,
    folder: folder,
  })

  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    console.log("Trying S3 upload first...")

    // 먼저 S3 업로드 시도
    let response = await fetch("/api/upload-to-s3", {
      method: "POST",
      body: formData,
    })

    // S3 실패 시 간단한 업로드로 폴백
    if (!response.ok) {
      console.warn("S3 upload failed, trying simple upload...")
      response = await fetch("/api/simple-upload", {
        method: "POST",
        body: formData,
      })
    }

    console.log("Response status:", response.status)

    const responseText = await response.text()
    console.log("Response text:", responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse response:", parseError)
      return {
        success: false,
        error: "Invalid response format",
        details: responseText,
      }
    }

    if (!response.ok) {
      console.error("Upload failed:", result)
      return {
        success: false,
        error: result.error || "Upload failed",
        details: result,
      }
    }

    console.log("✅ Upload successful:", result)
    return {
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }
  } catch (error) {
    console.error("❌ Client-side upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
      details: error,
    }
  }
}

// S3 Signed URL 생성
export async function generateSignedUrl(fileName: string, folder = "challenges"): Promise<UploadResult> {
  console.log("=== generateSignedUrl called ===")
  console.log("File details:", { fileName, folder })

  try {
    const response = await fetch("/api/generate-signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileName, folder }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("Signed URL generation failed:", result)
      return {
        success: false,
        error: result.error || "Failed to generate signed URL",
        details: result,
      }
    }

    console.log("✅ Signed URL generated successfully:", result)
    return {
      success: true,
      fileUrl: result.signedUrl,
      fileName: result.fileName,
    }
  } catch (error) {
    console.error("❌ Signed URL generation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate signed URL",
      details: error,
    }
  }
}

// EC2로 파일 전송
export async function transferToEC2(fileUrl: string, fileName: string): Promise<UploadResult> {
  console.log("=== transferToEC2 called ===")
  console.log("Transfer details:", { fileUrl, fileName })

  try {
    const response = await fetch("/api/transfer-to-ec2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl, fileName }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("EC2 transfer failed:", result)
      return {
        success: false,
        error: result.error || "Failed to transfer to EC2",
        details: result,
      }
    }

    console.log("✅ EC2 transfer successful:", result)
    return {
      success: true,
      fileUrl: result.ec2Path,
      fileName: result.fileName,
    }
  } catch (error) {
    console.error("❌ EC2 transfer error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transfer to EC2",
      details: error,
    }
  }
}
