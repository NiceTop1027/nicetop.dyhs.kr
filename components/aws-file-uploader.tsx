"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle, AlertCircle, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface AWSFileUploaderProps {
  challengeType: "wargame" | "ctf"
  challengeId: string
  onUploadComplete: (fileData: { url: string; name: string; downloadUrl: string }) => void
  disabled?: boolean
  maxFiles?: number
  maxSize?: number // MB
}

export function AWSFileUploader({
  challengeType,
  challengeId,
  onUploadComplete,
  disabled = false,
  maxFiles = 5,
  maxSize = 100,
}: AWSFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      name: string
      url: string
      downloadUrl: string
      size: number
    }>
  >([])
  const [error, setError] = useState<string>("")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || isUploading) return

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    // 파일 검증
    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        setError(`파일 "${file.name}"이 최대 크기(${maxSize}MB)를 초과합니다.`)
        return
      }
    }

    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
      return
    }

    setError("")
    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        await uploadFile(file)
        setUploadProgress(((i + 1) / files.length) * 100)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("파일 업로드 중 오류가 발생했습니다.")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", challengeType)
    formData.append("challengeId", challengeId)

    const response = await fetch("/api/upload-challenge-file", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Upload failed")
    }

    const result = await response.json()

    const fileData = {
      name: file.name,
      url: result.fileUrl,
      downloadUrl: result.downloadUrl,
      size: file.size,
    }

    setUploadedFiles((prev) => [...prev, fileData])
    onUploadComplete(fileData)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && document.getElementById("file-input")?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">{isUploading ? "파일 업로드 중..." : "파일을 여기에 드래그하거나 클릭하세요"}</p>
            <p className="text-sm text-muted-foreground">
              최대 {maxFiles}개 파일, 각 {maxSize}MB 이하
            </p>
            <p className="text-xs text-muted-foreground mt-1">지원 형식: ZIP, TAR, GZ, 7Z, RAR, PDF, TXT, MD</p>
          </div>
        </div>

        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          accept=".zip,.tar,.gz,.7z,.rar,.pdf,.txt,.md"
        />
      </div>

      {/* 업로드 진행률 */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>업로드 진행률</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">업로드된 파일 ({uploadedFiles.length}개)</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(file.downloadUrl, "_blank")}>
                    <Download className="h-3 w-3 mr-1" />
                    다운로드
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeFile(index)} disabled={isUploading}>
                    삭제
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
