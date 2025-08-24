"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { AlertCircle, ArrowLeft, Loader2, Plus, X, ExternalLink, Code } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { sendNewWargameChallengeNotification } from "@/lib/notification-utils"
import { calculatePointsByLevel } from "@/lib/wargame-types"
import { FirebaseFileUploader } from "@/components/firebase-file-uploader"

export default function CreateChallengePage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [level, setLevel] = useState(5)
  const [port, setPort] = useState("")
  const [flag, setFlag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // 계산된 점수
  const calculatedPoints = calculatePointsByLevel(level)

  // 파일 관련 상태
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([])
  const [newFileUrl, setNewFileUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  // 추가 리소스 상태
  const [additionalResources, setAdditionalResources] = useState<
    Array<{ title: string; url: string; type: "link" | "code" }>
  >([])
  const [newResourceTitle, setNewResourceTitle] = useState("")
  const [newResourceUrl, setNewResourceUrl] = useState("")
  const [newResourceType, setNewResourceType] = useState<"link" | "code">("link")

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

  // 파일 URL 추가 핸들러 (외부 URL용)
  const handleAddFileUrl = () => {
    if (newFileUrl.trim()) {
      const fileName = newFileUrl.split("/").pop() || "external-file"
      setUploadedFiles((prev) => [...prev, { name: fileName, url: newFileUrl.trim() }])
      setNewFileUrl("")
    }
  }

  // 파일 URL 제거 핸들러
  const handleRemoveFileUrl = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 업로드된 파일 제거 핸들러
  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 추가 리소스 추가 핸들러
  const handleAddResource = () => {
    if (newResourceTitle.trim() && newResourceUrl.trim()) {
      setAdditionalResources((prev) => [
        ...prev,
        {
          title: newResourceTitle.trim(),
          url: newResourceUrl.trim(),
          type: newResourceType,
        },
      ])
      setNewResourceTitle("")
      setNewResourceUrl("")
      setNewResourceType("link")
    }
  }

  // 추가 리소스 제거 핸들러
  const handleRemoveResource = (index: number) => {
    setAdditionalResources((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    console.log("=== Form submission started ===")

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
    if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
      setError("유효한 포트 번호를 입력해주세요 (1-65535).")
      return
    }
    if (!flag.trim()) {
      setError("플래그를 입력해주세요.")
      return
    }

    // 플래그 형식 검증 추가
    if (!flag.startsWith("NT{") || !flag.endsWith("}")) {
      setError("플래그는 NT{...} 형식이어야 합니다.")
      return
    }

    setIsSubmitting(true)
    setIsUploading(uploadedFiles.length > 0)

    try {
      // 사용자 권한 재확인
      if (!user || !userProfile) {
        throw new Error("사용자 인증이 필요합니다.")
      }

      const isAdmin = userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
      if (!isAdmin) {
        throw new Error("관리자 권한이 필요합니다.")
      }

      // 문제 데이터 생성
      const challengeData = {
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        level: Number(level),
        points: calculatedPoints,
        port: port ? Number(port) : null,
        flag: flag.trim(),
        files: uploadedFiles,
        additionalResources: additionalResources.length > 0 ? additionalResources : [],
        author: userProfile?.username || user?.displayName || "관리자",
        authorId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        solvedCount: 0,
        solvedBy: [],
        isVisible: true,
        totalAttempts: 0,
        firstBlood: null,
      }

      console.log("Creating challenge with data:", challengeData)

      // Firestore에 문제 추가
      const docRef = await addDoc(collection(db, "wargame_challenges"), challengeData)
      console.log("Challenge created with ID:", docRef.id)

      // 새 문제 추가 알림 전송
      try {
        await sendNewWargameChallengeNotification(docRef.id, title, category, difficulty)
        console.log("워게임 문제 추가 알림 전송 완료")
      } catch (notificationError) {
        console.error("알림 전송 오류:", notificationError)
        // 알림 전송 실패는 문제 생성을 막지 않음
      }

      toast({
        title: "문제가 생성되었습니다",
        description: "새로운 워게임 문제가 성공적으로 생성되었습니다.",
        variant: "default",
      })

      // 폼 초기화
      setTitle("")
      setDescription("")
      setCategory("")
      setDifficulty("")
      setLevel(5)
      setPort("")
      setFlag("")
      setUploadedFiles([])
      setAdditionalResources([])

      router.push("/wargame")
    } catch (error: any) {
      console.error("Error creating challenge:", error)

      // 구체적인 에러 메시지 제공
      if (error.code === "permission-denied") {
        setError("권한이 없습니다. 관리자에게 문의하세요.")
      } else if (error.code === "network-error") {
        setError("네트워크 연결을 확인해주세요.")
      } else if (error.message) {
        setError(error.message)
      } else {
        setError("문제 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
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
                            <SelectItem value="네트워크">네트워크</SelectItem>
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

                    <div className="space-y-2">
                      <Label htmlFor="level">레벨 (1-10)</Label>
                      <Select
                        value={level.toString()}
                        onValueChange={(value) => setLevel(Number.parseInt(value))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="level">
                          <SelectValue placeholder="레벨 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                            <SelectItem key={lvl} value={lvl.toString()}>
                              레벨 {lvl} ({calculatePointsByLevel(lvl)}점)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="flag">플래그</Label>
                        <Input
                          id="flag"
                          placeholder="NT{flag}"
                          value={flag}
                          onChange={(e) => setFlag(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">플래그 형식: NT{flag}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>파일 업로드</CardTitle>
                    <CardDescription>
                      문제에 필요한 파일을 업로드하세요. (선택사항)
                      <br />
                      <span className="text-xs text-muted-foreground">
                        지원 파일: .zip, .rar, .7z, .exe, .bin, .txt, .py, .c, .cpp, .java, .pdf, .jpg, .png, .html,
                        .js, .css 등
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FirebaseFileUploader
                      folder="wargame"
                      maxFiles={10}
                      maxSize={100}
                      onFilesChange={(files) => {
                        setUploadedFiles(files)
                      }}
                      disabled={isSubmitting}
                    />
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <Label>업로드된 파일</Label>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                              <ExternalLink className="h-4 w-4 text-green-500" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUploadedFile(index)}
                                disabled={isSubmitting}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>추가 리소스</CardTitle>
                    <CardDescription>문제와 관련된 추가 링크나 코드 사이트를 추가하세요. (선택사항)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="resourceTitle">리소스 제목</Label>
                        <Input
                          id="resourceTitle"
                          placeholder="예: 공식 문서, 참고 사이트"
                          value={newResourceTitle}
                          onChange={(e) => setNewResourceTitle(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resourceUrl">URL</Label>
                        <Input
                          id="resourceUrl"
                          placeholder="https://example.com"
                          value={newResourceUrl}
                          onChange={(e) => setNewResourceUrl(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resourceType">타입</Label>
                        <Select
                          value={newResourceType}
                          onValueChange={(value: "link" | "code") => setNewResourceType(value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="resourceType">
                            <SelectValue placeholder="타입 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">일반 링크</SelectItem>
                            <SelectItem value="code">코드 사이트</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddResource}
                        disabled={isSubmitting || !newResourceTitle.trim() || !newResourceUrl.trim()}
                        className="w-full bg-transparent"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        리소스 추가
                      </Button>
                    </div>

                    {additionalResources.length > 0 && (
                      <div className="space-y-2">
                        <Label>추가된 리소스</Label>
                        <div className="space-y-2">
                          {additionalResources.map((resource, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                              {resource.type === "code" ? (
                                <Code className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ExternalLink className="h-4 w-4 text-green-500" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{resource.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{resource.url}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveResource(index)}
                                disabled={isSubmitting}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
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
                      <MarkdownEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="문제 설명을 입력하세요..."
                        minHeight="400px"
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
              <Button type="submit" disabled={isSubmitting}>
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
