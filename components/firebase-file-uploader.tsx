"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, File, ImageIcon, Archive, Code2, AlertCircle, Download, FileText } from "lucide-react"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase-config"
import { useToast } from "@/hooks/use-toast"

interface FileUploadItem {
  name: string
  url: string
  size?: number
  type?: string
}

interface FirebaseFileUploaderProps {
  folder: string
  maxFiles?: number
  maxSize?: number // MB
  onFilesChange: (files: FileUploadItem[]) => void
  existingFiles?: FileUploadItem[]
  disabled?: boolean
  accept?: string
}

// 웹 파일 확장자 목록
const WEB_FILE_EXTENSIONS = [
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".xml",
  ".svg",
  ".php",
  ".asp",
  ".jsp",
]

// 코드 파일 확장자 목록
const CODE_FILE_EXTENSIONS = [
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".cs",
  ".rb",
  ".go",
  ".rs",
  ".swift",
  ".kt",
  ".scala",
  ".pl",
  ".sh",
  ".bat",
  ".ps1",
]

export function FirebaseFileUploader({
  folder,
  maxFiles = 5,
  maxSize = 10,
  onFilesChange,
  existingFiles = [],
  disabled = false,
  accept = "*/*",
}: FirebaseFileUploaderProps) {
  const [files, setFiles] = useState<FileUploadItem[]>(existingFiles)
  const [uploading, setUploading] = useState<{ [key: string]: number }>({})
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 파일 아이콘 결정
  const getFileIcon = (fileName: string, fileType?: string) => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))

    if (fileType?.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(extension)) {
      return <ImageIcon className="h-4 w-4 text-green-500" />
    }

    if ([".pdf", ".doc", ".docx", ".txt", ".rtf"].includes(extension)) {
      return <FileText className="h-4 w-4 text-blue-500" />
    }

    if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(extension)) {
      return <Archive className="h-4 w-4 text-purple-500" />
    }

    if (WEB_FILE_EXTENSIONS.includes(extension) || CODE_FILE_EXTENSIONS.includes(extension)) {
      return <Code2 className="h-4 w-4 text-cyan-500" />
    }

    return <File className="h-4 w-4 text-gray-500" />
  }

  // 파일 타입 배지 색상
  const getFileTypeBadge = (fileName: string) => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))

    if (WEB_FILE_EXTENSIONS.includes(extension)) {
      return (
        <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
          웹 파일
        </Badge>
      )
    }

    if (CODE_FILE_EXTENSIONS.includes(extension)) {
      return (
        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
          코드
        </Badge>
      )
    }

    if ([".zip", ".rar", ".7z"].includes(extension)) {
      return (
        <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
          압축
        </Badge>
      )
    }

    return null
  }

  // 웹 파일인지 확인
  const isWebFile = (fileName: string) => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    return WEB_FILE_EXTENSIONS.includes(extension)
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 파일 업로드 처리
  const handleFileUpload = useCallback(
    async (selectedFiles: FileList) => {
      if (disabled) return

      setError("")

      // 파일 개수 확인
      if (files.length + selectedFiles.length > maxFiles) {
        setError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
        return
      }

      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        // 파일 크기 확인
        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`${file.name}: 파일 크기가 ${maxSize}MB를 초과합니다.`)
        }

        const fileName = `${Date.now()}_${file.name}`
        const storageRef = ref(storage, `${folder}/${fileName}`)
        const uploadTask = uploadBytesResumable(storageRef, file)

        return new Promise<FileUploadItem>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              setUploading((prev) => ({ ...prev, [file.name]: progress }))
            },
            (error) => {
              console.error("Upload error:", error)
              setUploading((prev) => {
                const newState = { ...prev }
                delete newState[file.name]
                return newState
              })
              reject(new Error(`${file.name}: 업로드 실패`))
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
                setUploading((prev) => {
                  const newState = { ...prev }
                  delete newState[file.name]
                  return newState
                })
                resolve({
                  name: file.name,
                  url: downloadURL,
                  size: file.size,
                  type: file.type,
                })
              } catch (error) {
                reject(new Error(`${file.name}: URL 생성 실패`))
              }
            },
          )
        })
      })

      try {
        const uploadedFiles = await Promise.all(uploadPromises)
        const newFiles = [...files, ...uploadedFiles]
        setFiles(newFiles)
        onFilesChange(newFiles)

        toast({
          title: "업로드 완료",
          description: `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`,
          variant: "default",
        })
      } catch (error: any) {
        setError(error.message)
        toast({
          title: "업로드 실패",
          description: error.message,
          variant: "destructive",
        })
      }
    },
    [files, maxFiles, maxSize, folder, onFilesChange, disabled, toast],
  )

  // 파일 제거
  const handleRemoveFile = async (index: number) => {
    if (disabled) return

    const fileToRemove = files[index]

    try {
      // Firebase Storage에서 파일 삭제 (기존 파일이 아닌 경우에만)
      if (fileToRemove.url.includes("firebase")) {
        const fileRef = ref(storage, fileToRemove.url)
        await deleteObject(fileRef)
      }

      const newFiles = files.filter((_, i) => i !== index)
      setFiles(newFiles)
      onFilesChange(newFiles)

      toast({
        title: "파일 삭제",
        description: `${fileToRemove.name}이 삭제되었습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error removing file:", error)
      toast({
        title: "삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 드래그 앤 드롭 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles)
    }
  }

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileUpload(selectedFiles)
    }
    // input 값 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 웹 파일 미리보기 URL 생성
  const getPreviewUrl = (file: FileUploadItem) => {
    if (isWebFile(file.name)) {
      // 실제로는 코드 뷰어 사이트로 연결 (예: CodePen, JSFiddle 등)
      // 여기서는 파일 URL을 그대로 반환하지만, 실제로는 코드 뷰어로 연결
      return file.url
    }
    return file.url
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 파일 업로드 영역 */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          disabled ? "border-gray-300 bg-gray-50" : "border-gray-300 hover:border-gray-400 cursor-pointer"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className={`h-10 w-10 mb-4 ${disabled ? "text-gray-400" : "text-gray-500"}`} />
          <p className={`text-sm ${disabled ? "text-gray-400" : "text-gray-600"} mb-2`}>
            {disabled ? "업로드 비활성화됨" : "파일을 드래그하거나 클릭하여 업로드"}
          </p>
          <p className="text-xs text-gray-400">
            최대 {maxFiles}개, 각 파일 최대 {maxSize}MB
          </p>
          <p className="text-xs text-gray-400 mt-1">
            지원 형식: 압축파일, 이미지, 문서, 웹파일(HTML/CSS/JS), 코드파일 등
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 업로드 진행률 */}
      {Object.keys(uploading).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploading).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{fileName}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* 업로드된 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            업로드된 파일 ({files.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                {getFileIcon(file.name, file.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {getFileTypeBadge(file.name)}
                  </div>
                  {file.size && <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {isWebFile(file.name) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(getPreviewUrl(file), "_blank")
                      }}
                      className="text-cyan-600 hover:text-cyan-700"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(file.url, "_blank")
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile(index)
                    }}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
