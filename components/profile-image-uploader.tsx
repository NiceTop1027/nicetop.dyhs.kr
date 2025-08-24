"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, Link, User, AlertCircle, CheckCircle2 } from "lucide-react"
import { uploadProfileImage, deleteProfileImage, type UploadProgress } from "@/lib/profile-image-upload"
import { toast } from "@/hooks/use-toast"

interface ProfileImageUploaderProps {
  currentImage?: string
  userId: string
  onImageUpdate: (imageUrl: string) => void
  className?: string
}

export default function ProfileImageUploader({
  currentImage,
  userId,
  onImageUpdate,
  className = "",
}: ProfileImageUploaderProps) {
  const [previewImage, setPreviewImage] = useState<string>(currentImage || "")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return

      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setPreviewImage(imageUrl)
        // 즉시 부모 컴포넌트에 알림
        onImageUpdate(imageUrl)
      }
      reader.readAsDataURL(file)

      try {
        // 이전 이미지 삭제 (Firebase Storage에서)
        if (currentImage && currentImage.includes("firebasestorage")) {
          await deleteProfileImage(currentImage)
        }

        // 새 이미지 업로드
        const downloadURL = await uploadProfileImage(file, userId, setUploadProgress)

        // 업로드 완료 후 최종 URL로 업데이트
        setPreviewImage(downloadURL)
        onImageUpdate(downloadURL)

        toast({
          title: "성공",
          description: "프로필 이미지가 업데이트되었습니다.",
        })
      } catch (error) {
        console.error("Upload error:", error)
        setPreviewImage(currentImage || "")
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        })
      }
    },
    [currentImage, userId, onImageUpdate],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file)
    } else {
      toast({
        title: "오류",
        description: "이미지 파일만 업로드 가능합니다.",
        variant: "destructive",
      })
    }
  }

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return

    try {
      // URL 유효성 검사
      new URL(imageUrl)

      // 이전 Firebase Storage 이미지 삭제
      if (currentImage && currentImage.includes("firebasestorage")) {
        await deleteProfileImage(currentImage)
      }

      // 즉시 미리보기 및 부모 컴포넌트 업데이트
      setPreviewImage(imageUrl)
      onImageUpdate(imageUrl)
      setImageUrl("")

      toast({
        title: "성공",
        description: "프로필 이미지가 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "유효한 이미지 URL을 입력해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveImage = async () => {
    try {
      // Firebase Storage 이미지 삭제
      if (currentImage && currentImage.includes("firebasestorage")) {
        await deleteProfileImage(currentImage)
      }

      setPreviewImage("")
      onImageUpdate("")

      toast({
        title: "성공",
        description: "프로필 이미지가 제거되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "이미지 제거에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 현재 프로필 이미지 미리보기 */}
      <div className="flex items-center space-x-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={previewImage || "/placeholder.svg"} alt="프로필 이미지" />
          <AvatarFallback>
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">프로필 이미지</h3>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, GIF, WEBP 파일을 업로드하거나 URL을 입력하세요 (최대 10MB)
          </p>
        </div>
        {previewImage && (
          <Button variant="outline" size="sm" onClick={handleRemoveImage} disabled={uploadProgress.isUploading}>
            <X className="w-4 h-4 mr-2" />
            제거
          </Button>
        )}
      </div>

      {/* 업로드 진행률 */}
      {uploadProgress.isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>업로드 중...</span>
                <span>{Math.round(uploadProgress.progress)}%</span>
              </div>
              <Progress value={uploadProgress.progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 성공 메시지 */}
      {uploadProgress.progress === 100 && !uploadProgress.isUploading && !uploadProgress.error && (
        <Alert className="border-green-500 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>프로필 이미지가 성공적으로 업로드되었습니다!</AlertDescription>
        </Alert>
      )}

      {/* 에러 메시지 */}
      {uploadProgress.error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{uploadProgress.error}</AlertDescription>
        </Alert>
      )}

      {/* 파일 업로드 영역 */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        } ${uploadProgress.isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">이미지를 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-muted-foreground mt-1">JPG, PNG, GIF, WEBP (최대 10MB)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploadProgress.isUploading}
      />

      {/* URL 입력 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label htmlFor="image-url" className="flex items-center space-x-2">
              <Link className="w-4 h-4" />
              <span>또는 이미지 URL 입력</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={uploadProgress.isUploading}
              />
              <Button onClick={handleUrlSubmit} disabled={!imageUrl.trim() || uploadProgress.isUploading}>
                적용
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
