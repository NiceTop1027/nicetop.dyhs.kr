"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
  maxSize?: number // MB 단위
  acceptedFileTypes?: string
  isUploading?: boolean
}

export function FileUploader({
  onFilesSelected,
  disabled = false,
  maxFiles = 5,
  maxSize = 10, // 기본 10MB
  acceptedFileTypes = "*",
  isUploading = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = []
    const errors: string[] = []

    // 최대 파일 개수 확인
    if (files.length > maxFiles) {
      errors.push(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
      return { valid: validFiles, errors }
    }

    for (const file of files) {
      // 파일 크기 확인
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name}: 파일 크기가 ${maxSize}MB를 초과합니다.`)
        continue
      }

      // 파일 타입 확인 (acceptedFileTypes가 '*'가 아닌 경우)
      if (acceptedFileTypes !== "*") {
        const fileTypes = acceptedFileTypes.split(",")
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
        const mimeType = file.type

        const isValidType = fileTypes.some(
          (type) =>
            type.trim() === `.${fileExtension}` ||
            type.trim() === mimeType ||
            (type.trim().endsWith("/*") && mimeType.startsWith(type.trim().replace("/*", ""))),
        )

        if (!isValidType) {
          errors.push(`${file.name}: 지원되지 않는 파일 형식입니다.`)
          continue
        }
      }

      validFiles.push(file)
    }

    return { valid: validFiles, errors }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isUploading) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    const { valid, errors } = validateFiles(droppedFiles)

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (valid.length > 0) {
      onFilesSelected(valid)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isUploading || !e.target.files?.length) return

    const selectedFiles = Array.from(e.target.files)
    const { valid, errors } = validateFiles(selectedFiles)

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (valid.length > 0) {
      onFilesSelected(valid)
    }

    // 같은 파일을 다시 선택할 수 있도록 input 값 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleButtonClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        (disabled || isUploading) && "opacity-50 cursor-not-allowed",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">{isUploading ? "파일 업로드 중..." : "파일을 여기에 드래그하거나"}</p>
          <p className="text-sm text-muted-foreground">
            최대 {maxFiles}개 파일, 각 {maxSize}MB 이하
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          className="hidden"
          accept={acceptedFileTypes}
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
          className="mt-2"
        >
          {isUploading ? "업로드 중..." : "파일 선택"}
        </Button>
      </div>
    </div>
  )
}
