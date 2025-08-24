"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUploader } from "@/components/file-uploader"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

export default function EditCTFProblemPage({ params }: { params: { contestId: string; problemId: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [points, setPoints] = useState("")
  const [flag, setFlag] = useState("")
  const [port, setPort] = useState("")
  const [files, setFiles] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [contestTitle, setContestTitle] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [newFileUrl, setNewFileUrl] = useState("")

  // 관리자 권한 확인 및 문제 정보 불러오기
  useEffect(() => {
    const fetchProblemInfo = async () => {
      if (!user) {
        toast({
          title: "로그인이 필요합니다",
          description: "이 기능을 사용하려면 로그인이 필요합니다.",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      if (userProfile) {
        const isAdmin = userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
        if (!isAdmin) {
          toast({
            title: "접근 권한이 없습니다",
            description: "관리자만 접근할 수 있는 페이지입니다.",
            variant: "destructive",
          })
          router.push("/")
          return
        }
      }

      try {
        setLoading(true)

        // 대회 정보 불러오기
        const contestRef = doc(db, "ctf_contests", params.contestId)
        const contestSnap = await getDoc(contestRef)

        if (!contestSnap.exists()) {
          toast({
            title: "대회를 찾을 수 없습니다",
            description: "요청하신 CTF 대회가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/admin/ctf")
          return
        }

        setContestTitle(contestSnap.data().title)

        // 문제 정보 불러오기
        const problemRef = doc(db, "ctf_problems", params.problemId)
        const problemSnap = await getDoc(problemRef)

        if (!problemSnap.exists()) {
          toast({
            title: "문제를 찾을 수 없습니다",
            description: "요청하신 CTF 문제가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push(`/admin/ctf/problems/${params.contestId}`)
          return
        }

        const problemData = problemSnap.data()

        // 폼 상태 설정
        setTitle(problemData.title || "")
        setDescription(problemData.description || "")
        setCategory(problemData.category || "")
        setDifficulty(problemData.difficulty || "")
        setPoints(problemData.points?.toString() || "")
        setFlag(problemData.flag || "")
        setPort(problemData.port?.toString() || "")

        // 파일 URL 설정
        if (problemData.files && Array.isArray(problemData.files)) {
          setFiles(problemData.files.join("\n"))
        }

        // 기존 파일 URL을 업로드된 파일 형식으로 변환
        if (problemData.files && Array.isArray(problemData.files)) {
          const formattedFiles = problemData.files.map((url: string) => {
            const fileName = url.split("/").pop() || "file"
            return { name: fileName, url }
          })
          setUploadedFiles(formattedFiles)
        }
      } catch (error) {
        console.error("Error fetching problem info:", error)
        setError("문제 정보를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchProblemInfo()
  }, [user, userProfile, params.contestId, params.problemId, router, toast])

  // 파일 URL 추가 핸들러
  const handleAddFileUrl = () => {
    if (newFileUrl.trim()) {
      const fileName = newFileUrl.split("/").pop() || "file"
      const newFile = { name: fileName, url: newFileUrl.trim() }
      setUploadedFiles([...uploadedFiles, newFile])
      setNewFileUrl("")
    }
  }

  // 파일 업로드 핸들러 함수 추가
  const handleFileUpload = async (files: File[]) => {
    if (!user) return

    setIsUploading(true)
    const storage = getStorage()
    const newUploadedFiles = [...uploadedFiles]

    try {
      for (const file of files) {
        const fileName = `ctf/${params.contestId}/${params.problemId}/${Date.now()}_${file.name}`
        const storageRef = ref(storage, fileName)

        await uploadBytes(storageRef, file)
        const downloadUrl = await getDownloadURL(storageRef)

        newUploadedFiles.push({
          name: file.name,
          url: downloadUrl,
        })
      }

      setUploadedFiles(newUploadedFiles)

      toast({
        title: "파일 업로드 완료",
        description: `${files.length}개의 파일이 업로드되었습니다.`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        title: "파일 업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 업로드된 파일 삭제 핸들러 추가
  const handleRemoveUploadedFile = async (index: number) => {
    try {
      const fileToRemove = uploadedFiles[index]
      const storage = getStorage()

      // URL에서 경로 추출 시도
      try {
        const url = new URL(fileToRemove.url)
        const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/)
        if (pathMatch && pathMatch[1]) {
          const decodedPath = decodeURIComponent(pathMatch[1])
          const fileRef = ref(storage, decodedPath)
          await deleteObject(fileRef).catch(() => {
            console.log("파일이 스토리지에 없거나 삭제할 수 없습니다.")
          })
        }
      } catch (e) {
        console.log("외부 URL이거나 경로를 추출할 수 없습니다.")
      }

      // 상태에서 파일 제거
      const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index)
      setUploadedFiles(newUploadedFiles)

      toast({
        title: "파일 삭제 완료",
        description: "파일이 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error removing file:", error)
      toast({
        title: "파일 삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
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
    if (!flag.trim()) {
      setError("플래그를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      // 문제 데이터 업데이트
      const problemData: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        points: Number(points),
        flag: flag.trim(),
        updatedAt: serverTimestamp(),
      }

      // 선택적 필드 추가
      if (port && !isNaN(Number(port))) {
        problemData.port = Number(port)
      } else {
        // port 필드가 비어있으면 null로 설정
        problemData.port = null
      }

      // 파일 URL 처리
      try {
        problemData.files = uploadedFiles.map((file) => file.url)
      } catch (fileError) {
        console.error("Error processing file URLs:", fileError)
        // 파일 처리 오류가 있어도 계속 진행
        problemData.files = []
      }

      // Firestore에 문제 업데이트
      try {
        const problemRef = doc(db, "ctf_problems", params.problemId)
        await updateDoc(problemRef, problemData)
      } catch (updateError) {
        console.error("Error updating problem document:", updateError)
        throw new Error("문제 업데이트 중 오류가 발생했습니다.")
      }

      toast({
        title: "문제가 수정되었습니다",
        description: "CTF 문제가 성공적으로 수정되었습니다.",
        variant: "default",
      })

      // 문제 목록 페이지로 이동
      router.push(`/admin/ctf/problems/${params.contestId}`)
    } catch (error) {
      console.error("Error updating CTF problem:", error)
      setError("문제 수정 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/ctf/problems/${params.contestId}`)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">CTF 문제 수정</h1>
            <p className="text-muted-foreground mt-2">
              {contestTitle ? `"${contestTitle}" 대회의 문제를 수정합니다.` : "CTF 문제를 수정합니다."}
            </p>
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

                    <div className="space-y-2">
                      <Label htmlFor="points">점수</Label>
                      <Input
                        id="points"
                        type="number"
                        placeholder="100"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">포트 (선택사항)</Label>
                      <Input
                        id="port"
                        type="number"
                        placeholder="예: 1337"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        원격 서버 접속이 필요한 문제인 경우 포트 번호를 입력하세요.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>첨부 파일</Label>
                      <FileUploader
                        onFilesSelected={handleFileUpload}
                        isUploading={isUploading}
                        maxFiles={5}
                        maxSize={50} // MB 단위
                        accept=".zip,.rar,.7z,.tar,.gz,.pdf,.txt,.png,.jpg,.jpeg"
                      />

                      <div className="flex items-center gap-2 mt-2">
                        <Input
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
                          URL 추가
                        </Button>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-sm font-medium">업로드된 파일 ({uploadedFiles.length}개)</p>
                          <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                            {uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                              >
                                <div className="truncate text-sm flex items-center gap-2">
                                  <span className="bg-muted rounded px-2 py-1 text-xs">{file.name}</span>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-xs"
                                  >
                                    다운로드
                                  </a>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUploadedFile(index)}
                                  disabled={isSubmitting}
                                >
                                  삭제
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        문제에 필요한 파일을 업로드하거나 외부 URL을 추가하세요.
                      </p>
                    </div>
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
                onClick={() => router.push(`/admin/ctf/problems/${params.contestId}`)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
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
