import { uploadToFirebaseStorage, type UploadResult } from "./firebase-storage"

// 메인 파일 업로드 함수 - Firebase Storage 사용
export async function uploadFile(
  file: File,
  folder = "challenges",
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  console.log("=== uploadFile function called ===")
  console.log("Using Firebase Storage for upload")

  // 파일 유효성 검사
  if (!file) {
    console.error("No file provided")
    return {
      success: false,
      error: "No file provided",
    }
  }

  if (!(file instanceof File) && !(file instanceof Blob)) {
    console.error("Invalid file type:", typeof file, file?.constructor?.name)
    return {
      success: false,
      error: "Invalid file type",
    }
  }

  if (file.size === 0) {
    console.error("File is empty")
    return {
      success: false,
      error: "File is empty",
    }
  }

  // Firebase Storage에 업로드
  return await uploadToFirebaseStorage(file, folder, onProgress)
}

// 다중 파일 업로드
export async function uploadMultipleFiles(
  files: File[],
  folder = "challenges",
  onProgress?: (fileIndex: number, progress: number) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`)

    const result = await uploadFile(file, folder, (progress) => {
      onProgress?.(i, progress)
    })

    results.push(result)

    if (!result.success) {
      console.error(`Failed to upload ${file.name}:`, result.error)
    }
  }

  return results
}
