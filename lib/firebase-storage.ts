import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./firebase-config"

export interface UploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  error?: string
  details?: any
}

// 파일명 안전하게 변환
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w\s.-]/g, "_") // 특수문자를 언더스코어로
    .replace(/\s+/g, "_") // 공백을 언더스코어로
    .replace(/_{2,}/g, "_") // 연속된 언더스코어를 하나로
    .toLowerCase()
}

// Firebase Storage에 파일 업로드
export async function uploadToFirebaseStorage(
  file: File,
  folder = "challenges",
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  console.log("=== Firebase Storage upload started ===")
  console.log("File details:", {
    name: file.name,
    size: file.size,
    type: file.type,
    folder: folder,
  })

  try {
    // 파일 유효성 검사
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      }
    }

    if (file.size === 0) {
      return {
        success: false,
        error: "File is empty",
      }
    }

    // 파일 크기 제한 (100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File too large (max 100MB)",
      }
    }

    // 안전한 파일명 생성
    const timestamp = Date.now()
    const safeName = sanitizeFileName(file.name)
    const finalName = `${timestamp}_${safeName}`

    // Storage 참조 생성
    const storageRef = ref(storage, `${folder}/${finalName}`)

    console.log("Uploading to path:", `${folder}/${finalName}`)

    // 파일 업로드
    const snapshot = await uploadBytes(storageRef, file)
    console.log("Upload completed:", snapshot.metadata.fullPath)

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log("Download URL:", downloadURL)

    return {
      success: true,
      fileUrl: downloadURL,
      fileName: finalName,
    }
  } catch (error) {
    console.error("❌ Firebase Storage upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
      details: error,
    }
  }
}

// Firebase Storage에서 파일 삭제
export async function deleteFromFirebaseStorage(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fileRef = ref(storage, filePath)
    await deleteObject(fileRef)
    console.log("File deleted successfully:", filePath)

    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    }
  }
}

// URL에서 파일 경로 추출
export function extractFilePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/)
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1])
    }
    return null
  } catch {
    return null
  }
}

// 파일 존재 여부 확인
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, filePath)
    await getDownloadURL(fileRef)
    return true
  } catch {
    return false
  }
}
