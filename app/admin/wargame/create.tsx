"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Upload, X, Loader2, FileText } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase-config"
import dynamic from "next/dynamic"

// 리치 텍스트 에디터 동적 임포트 (SSR 비활성화)
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false })
import "react-quill/dist/quill.snow.css"

export default function CreateChallengePage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [points, setPoints] = useState("")
  const [port, setPort] = useState("")
  const [flag, setFlag] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // 관리자 권한 확인
  useEffect(() => {
    if (user && userProfile) {
      const isAdmin = userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
      if (!isAdmin) {
        toast({
          title: "접근 권한이 없습니다",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        })
        router.push("/")
      }
    }
  }, [user, userProfile, router, toast])

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setFiles((prevFiles) => [...prevFiles, ...newFiles])
    }
  }

  // 파일 제거 핸들러
  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  // 파일 업로드 함수
  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return []

    setIsUploading(true)
    setUploadProgress(0)

    const uploadPromises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const storageRef = ref(storage, `wargame_files/${Date.now()}_${file.name}`)
        const uploadTask = uploadBytesResumable(storageRef, file)

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            setUploadProgress(progress)
          },
          (error) => {
            console.error("Upload error:", error)
            reject(error)
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              resolve(downloadURL)
            } catch (error) {
              reject(error)
            }
          },
        )
      })
    })

    try {
      const urls = await Promise.all(uploadPromises)
      setUploadedFiles(urls)
      setIsUploading(false)
      return urls
    } catch (error) {
      console.error("Error uploading files:", error)
      setIsUploading(false)
      throw error
    }
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 입력 검증
    if (!title.trim()) {
      setError("제목을 입력해주세요.")
      return
    }
    if (!description.trim()) {
      setError("문제 설명을 입력해주세요.")
      return
    }
    if (!category) {
      setError("카테고리를 선택해주세요.")
      return
    }
    if (!difficulty) {
      setError("난이도를 선택해주세요.")
      return
    }
    if (!points || isNaN(Number(points)) || Number(points) <= 0) {
      setError("유효한 점수를 입력해주세요.")
      return
    }
    if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
      setError("유효한 포트 번호를 입력해주세요 (1-65535).")
      return
    }
    if (!flag.trim()) {
      setError("플래그를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      // 파일 업로드
      let fileUrls: string[] = []
      if (files.length > 0) {
        fileUrls = await uploadFiles()
      }

      // 문제 데이터 생성
      const challengeData = {
        title,
        description,
        category,
        difficulty,
        points: Number(points) || 100, // 점수가 없거나 0이면 기본값 100 사용
        port: port ? Number(port) : null,
        flag,
        files: uploadedFiles.map((file) => file.url),
        author: userProfile?.username || user?.displayName || "관리자",
        authorId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        solvedCount: 0,
        solvedBy: [],
        isVisible: true,
      }

      // Firestore에 문제 추가
      const docRef = await addDoc(collection(db, "wargame_challenges"), challengeData)

      toast({
        title: "문제가 생성되었습니다",
        description: "새로운 워게임 문제가 성공적으로 생성되었습니다.",
        variant: "default",
      })

      // 문제 목록 페이지로 이동
      router.push("/wargame")
    } catch (error) {
      console.error("Error creating challenge:", error)
      setError("문제 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 리치 텍스트 에디터 모듈 설정
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["link", "image", "code-block"],
      ["clean"],
    ],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/wargame")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">워게임 문제 생성</h1>
            <p className="text-muted-foreground mt-2">새로운 워게임 문제를 생성합니다.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>기본 정보</CardTitle>
                    <CardDescription>문제의 기본 정보를 입력해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">제목</Label>
                      <Input
                        id="title"
                        placeholder="문제 제목"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">카테고리</Label>
                        <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="웹 해킹">웹 해킹</SelectItem>
                            <SelectItem value="시스템 해킹">시스템 해킹</SelectItem>
                            <SelectItem value="리버싱">리버싱</SelectItem>
                            <SelectItem value="암호학">암호학</SelectItem>
                            <SelectItem value="포렌식">포렌식</SelectItem>
                            <SelectItem value="기타">기타</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="difficulty">난이도</Label>
                        <Select value={difficulty} onValueChange={setDifficulty} disabled={isSubmitting}>
                          <SelectTrigger id="difficulty">
                            <SelectValue placeholder="난이도 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="초급">초급</SelectItem>
                            <SelectItem value="중급">중급</SelectItem>
                            <SelectItem value="고급">고급</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="points">점수</Label>
                        <Input
                          id="points"
                          type="number"
                          placeholder="100"
                          min="1"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="port">포트 번호 (선택사항)</Label>
                        <Input
                          id="port"
                          type="number"
                          placeholder="예: 1337"
                          min="1"
                          max="65535"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="flag">플래그</Label>
                      <Input
                        id="flag"
                        placeholder="NT{flag}"
                        value={flag}
                        onChange={(e) => setFlag(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">플래그 형식: NT{"{flag}"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>파일 업로드</CardTitle>
                    <CardDescription>문제에 필요한 파일을 업로드하세요. (선택사항)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting || isUploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        파일 선택
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isSubmitting || isUploading}
                      />
                      <p className="text-sm text-muted-foreground">최대 10MB까지 업로드 가능합니다.</p>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">선택된 파일 ({files.length}개)</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate text-sm">{file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemoveFile(index)}
                                disabled={isSubmitting || isUploading}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {uploadProgress.toFixed(0)}% 업로드 중...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>문제 설명</CardTitle>
                    <CardDescription>문제에 대한 상세한 설명을 작성해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[400px]">
                      <ReactQuill
                        theme="snow"
                        value={description}
                        onChange={setDescription}
                        modules={modules}
                        placeholder="문제 설명을 입력하세요..."
                        className="h-[350px] mb-12"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/wargame")} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "문제 생성"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
