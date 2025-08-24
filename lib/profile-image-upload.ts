import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./firebase-config"

export interface UploadProgress {
  progress: number
  isUploading: boolean
  error?: string
}

// 파일명 안전하게 변환
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w\s.-]/g, "_") // 특수문자를 언더스코어로
    .replace(/\s+/g, "_") // 공백을 언더스코어로
    .replace(/_{2,}/g, "_") // 연속된 언더스코어를 하나로
    .toLowerCase()
}

// 프로필 이미지 업로드
export async function uploadProfileImage(
  file: File,
  userId: string,
  onProgress: (progress: UploadProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 파일 유효성 검사
    if (!file.type.startsWith("image/")) {
      reject(new Error("이미지 파일만 업로드할 수 있습니다."))
      return
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      reject(new Error("파일 크기는 10MB 이하여야 합니다."))
      return
    }

    // 안전한 파일명 생성
    const timestamp = Date.now()
    const safeName = sanitizeFileName(file.name)
    const fileName = `${timestamp}_${safeName}`

    // Storage 참조 생성 - wargame 폴더 사용 (권한이 있는 폴더)
    const storageRef = ref(storage, `wargame/${fileName}`)

    // 업로드 시작
    const uploadTask = uploadBytesResumable(storageRef, file)

    onProgress({ progress: 0, isUploading: true })

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // 진행률 업데이트
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress({ progress, isUploading: true })
      },
      (error) => {
        // 에러 처리
        console.error("Upload error:", error)
        let errorMessage = "업로드 중 오류가 발생했습니다."

        if (error.code === "storage/unauthorized") {
          errorMessage = "파일 업로드 권한이 없습니다. 관리자에게 문의하세요."
        } else if (error.code === "storage/canceled") {
          errorMessage = "업로드가 취소되었습니다."
        } else if (error.code === "storage/unknown") {
          errorMessage = "알 수 없는 오류가 발생했습니다."
        }

        onProgress({ progress: 0, isUploading: false, error: errorMessage })
        reject(new Error(errorMessage))
      },
      async () => {
        // 업로드 완료
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          onProgress({ progress: 100, isUploading: false })
          resolve(downloadURL)
        } catch (error) {
          console.error("Error getting download URL:", error)
          onProgress({ progress: 0, isUploading: false, error: "다운로드 URL 생성에 실패했습니다." })
          reject(new Error("다운로드 URL 생성에 실패했습니다."))
        }
      },
    )
  })
}

// 프로필 이미지 삭제
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Firebase Storage URL에서 파일 경로 추출
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/)

    if (pathMatch && pathMatch[1]) {
      const filePath = decodeURIComponent(pathMatch[1])
      const fileRef = ref(storage, filePath)
      await deleteObject(fileRef)
      console.log("File deleted successfully:", filePath)
    }
  } catch (error) {
    console.error("Error deleting file:", error)
    // 삭제 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
}
