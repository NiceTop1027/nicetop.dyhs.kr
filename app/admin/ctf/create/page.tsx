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
import { AlertCircle, ArrowLeft, Loader2, Calendar, Clock, Eye, EyeOff } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { Switch } from "@/components/ui/switch"
import { sendNewCTFContestNotification } from "@/lib/notification-utils"

export default function CreateCTFPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [bannerImage, setBannerImage] = useState("") // 배너 이미지 URL 상태 추가
  const [isValidImage, setIsValidImage] = useState(true) // 이미지 유효성 상태 추가

  // 이미지 URL 유효성 검사 함수 추가
  const checkImageUrl = (url: string) => {
    if (!url.trim()) {
      setIsValidImage(true)
      return
    }

    const img = new Image()
    img.onload = () => setIsValidImage(true)
    img.onerror = () => setIsValidImage(false)
    img.src = url
  }

  // 이미지 URL 변경 핸들러
  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setBannerImage(url)
    checkImageUrl(url)
  }

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
      setError("대회 설명을 입력해주세요.")
      return
    }
    if (!startDate || !startTime) {
      setError("시작 일시를 입력해주세요.")
      return
    }
    if (!endDate || !endTime) {
      setError("종료 일시를 입력해주세요.")
      return
    }

    // 비밀번호 검증
    if (isPasswordProtected && !password.trim()) {
      setError("비밀번호를 입력해주세요.")
      return
    }

    // 시작 및 종료 시간 검증
    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    const endDateTime = new Date(`${endDate}T${endTime}:00`)
    const now = new Date()

    if (startDateTime < now) {
      setError("시작 시간은 현재 시간 이후여야 합니다.")
      return
    }

    if (endDateTime <= startDateTime) {
      setError("종료 시간은 시작 시간 이후여야 합니다.")
      return
    }

    setIsSubmitting(true)

    try {
      // CTF 대회 데이터 생성
      const ctfData = {
        title,
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        problemCount: 0,
        participants: [],
        author: userProfile?.username || user?.displayName || "관리자",
        authorId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublic,
        isPasswordProtected,
        password: isPasswordProtected ? password : "",
        authorizedUsers: [],
        bannerImage: bannerImage.trim() || "", // 배너 이미지 URL 추가
      }

      // Firestore에 CTF 대회 추가
      const docRef = await addDoc(collection(db, "ctf_contests"), ctfData)

      // 새 CTF 대회 알림 전송
      try {
        await sendNewCTFContestNotification(docRef.id, title, startDateTime)
        console.log("CTF 대회 생성 알림 전송 완료")
      } catch (notificationError) {
        console.error("알림 전송 오류:", notificationError)
        // 알림 전송 실패해도 계속 진행
      }

      toast({
        title: "CTF 대회가 생성되었습니다",
        description: "새로운 CTF 대회가 성공적으로 생성되었습니다.",
        variant: "default",
      })

      // CTF 대회 목록 페이지로 이동
      router.push("/admin/ctf")
    } catch (error) {
      console.error("Error creating CTF contest:", error)
      setError("CTF 대회 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin/ctf")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              CTF 대회 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">CTF 대회 만들기</h1>
            <p className="text-muted-foreground mt-2">새로운 CTF 대회를 생성합니다.</p>
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
                    <CardDescription>CTF 대회의 기본 정보를 입력해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">제목</Label>
                      <Input
                        id="title"
                        placeholder="CTF 대회 제목"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* 배너 이미지 URL 입력 필드 추가 */}
                    <div className="space-y-2">
                      <Label htmlFor="bannerImage">배너 이미지 URL (선택사항)</Label>
                      <Input
                        id="bannerImage"
                        placeholder="https://example.com/banner.jpg"
                        value={bannerImage}
                        onChange={handleBannerImageChange}
                        disabled={isSubmitting}
                        className={!isValidImage ? "border-red-500" : ""}
                      />
                      {!isValidImage && <p className="text-xs text-red-500">유효하지 않은 이미지 URL입니다.</p>}
                      {bannerImage.trim() && isValidImage && (
                        <div className="mt-2 rounded-md overflow-hidden border">
                          <img
                            src={bannerImage || "/placeholder.svg"}
                            alt="배너 미리보기"
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=128&width=256"
                              e.currentTarget.alt = "이미지 로드 실패"
                            }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        대회 배너로 사용할 이미지의 URL을 입력하세요. 권장 크기: 1200x400px
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">시작 날짜</Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="startTime">시작 시간</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="endDate">종료 날짜</Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endTime">종료 시간</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} disabled={isSubmitting} />
                      <Label htmlFor="isPublic">공개 대회</Label>
                      <p className="text-xs text-muted-foreground ml-2">
                        {isPublic ? "모든 사용자가 볼 수 있습니다." : "관리자만 볼 수 있습니다."}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPasswordProtected"
                        checked={isPasswordProtected}
                        onCheckedChange={setIsPasswordProtected}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="isPasswordProtected">비밀번호 보호</Label>
                      <p className="text-xs text-muted-foreground ml-2">
                        {isPasswordProtected
                          ? "참가자는 비밀번호를 입력해야 합니다."
                          : "비밀번호 없이 참가할 수 있습니다."}
                      </p>
                    </div>

                    {isPasswordProtected && (
                      <div className="space-y-2">
                        <Label htmlFor="password">비밀번호</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="대회 비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">참가자들에게 공유할 비밀번호를 설정하세요.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>대회 설명</CardTitle>
                    <CardDescription>CTF 대회에 대한 상세한 설명을 작성해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[400px]">
                      <MarkdownEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="대회 설명을 입력하세요..."
                        minHeight="400px"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/ctf")} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "대회 만들기"
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
