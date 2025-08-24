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
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { calculatePointsByLevel } from "@/lib/wargame-types"
import { FirebaseFileUploader } from "@/components/firebase-file-uploader"

export default function EditChallengePage({ params }: { params: { id: string } }) {
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
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [newFileUrl, setNewFileUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // 추가 리소스 상태
  const [additionalResources, setAdditionalResources] = useState<
    Array<{ title: string; url: string; type: "link" | "code" }>
  >([])
  const [newResourceTitle, setNewResourceTitle] = useState("")
  const [newResourceUrl, setNewResourceUrl] = useState("")
  const [newResourceType, setNewResourceType] = useState<"link" | "code">("link")

  // 계산된 점수
  const calculatedPoints = calculatePointsByLevel(level)

  // 관리자 권한 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    if (user && userProfile && !isAdmin) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, userProfile, isAdmin, router, toast])

  // 문제 정보 불러오기
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!params.id) {
        setIsLoading(false)
        setError("유효하지 않은 문제 ID입니다.")
        return
      }

      try {
        const challengeRef = doc(db, "wargame_challenges", params.id)
        const challengeSnap = await getDoc(challengeRef)

        if (challengeSnap.exists()) {
          const data = challengeSnap.data()

          // 폼 상태 초기화
          setTitle(data.title || "")
          setDescription(data.description || "")
          setCategory(data.category || "")
          setDifficulty(data.difficulty || "")
          setLevel(data.level || 5)
          setPort(data.port?.toString() || "")
          setFlag(data.flag || "")
          setFileUrls(data.files || [])
          setAdditionalResources(Array.isArray(data.additionalResources) ? data.additionalResources : [])
        } else {
          setError("요청하신 문제가 존재하지 않습니다.")
          toast({
            title: "문제를 찾을 수 없습니다",
            description: "요청하신 문제가 존재하지 않습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching challenge:", error)
        setError("문제를 불러오는 중 오류가 발생했습니다.")
        toast({
          title: "오류 발생",
          description: "문제를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id && isAdmin) {
      fetchChallenge()
    }
  }, [params.id, isAdmin, toast])

  // 파일 URL 추가 핸들러
  const handleAddFileUrl = () => {
    if (newFileUrl.trim()) {
      const fileName = newFileUrl.split("/").pop() || "external-file"
      setUploadedFiles((prev) => [...prev, { name: fileName, url: newFileUrl.trim() }])
      setNewFileUrl("")
    }
  }

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 외부 파일 URL 제거 핸들러 (기존 파일용)
  const handleRemoveFileUrl = (index: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== index))
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
      // 문제 데이터 업데이트 - undefined 값 제거
      const challengeData: any = {
        title,
        description,
        category,
        difficulty,
        level: Number(level),
        points: calculatedPoints,
        flag,
        files: [...fileUrls.map((url) => ({ name: url.split("/").pop() || "file", url })), ...uploadedFiles],
        additionalResources: Array.isArray(additionalResources) ? additionalResources : [],
        updatedAt: serverTimestamp(),
      }

      // 포트가 있는 경우에만 추가
      if (port && Number(port) > 0) {
        challengeData.port = Number(port)
      }

      // Firestore 문제 업데이트
      await updateDoc(doc(db, "wargame_challenges", params.id), challengeData)

      toast({
        title: "문제가 수정되었습니다",
        description: "워게임 문제가 성공적으로 수정되었습니다.",
        variant: "default",
      })

      // 문제 목록 페이지로 이동
      router.push("/admin/wargame")
    } catch (error) {
      console.error("Error updating challenge:", error)
      setError("문제 수정 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin/wargame")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">워게임 문제 수정</h1>
            <p className="text-muted-foreground mt-2">기존 워게임 문제를 수정합니다.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>기본 정보</CardTitle>
                      <CardDescription>문제의 기본 정보를 수정해주세요.</CardDescription>
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
                                레벨 {lvl}
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
                            placeholder="NTCTF{flag_format}"
                            value={flag}
                            onChange={(e) => setFlag(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <p className="text-xs text-muted-foreground">플래그 형식: NT{"{flag}"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>파일 업로드</CardTitle>
                      <CardDescription>문제에 필요한 파일을 업로드하거나 URL을 추가하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FirebaseFileUploader
                        folder="wargame"
                        maxFiles={10}
                        maxSize={100}
                        existingFiles={uploadedFiles}
                        onFilesChange={(files) => {
                          setUploadedFiles(files)
                        }}
                        disabled={isSubmitting}
                      />

                      {fileUrls.length > 0 && (
                        <div className="space-y-2">
                          <Label>기존 파일 URL</Label>
                          <div className="space-y-2">
                            {fileUrls.map((url, index) => (
                              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                                <div className="flex-1">
                                  <p className="text-sm truncate">{url}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFileUrl(index)}
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

                      <div className="space-y-2 pt-4">
                        <Label htmlFor="fileUrl">외부 파일 URL (선택사항)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="fileUrl"
                            placeholder="https://example.com/file.zip"
                            value={newFileUrl}
                            onChange={(e) => setNewFileUrl(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddFileUrl}
                            disabled={isSubmitting || !newFileUrl.trim()}
                          >
                            추가
                          </Button>
                        </div>
                      </div>
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

                      {Array.isArray(additionalResources) && additionalResources.length > 0 && (
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
                      <CardDescription>문제에 대한 상세한 설명을 수정해주세요.</CardDescription>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/wargame")}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    "문제 수정"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
