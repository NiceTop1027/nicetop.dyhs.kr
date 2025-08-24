"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Loader2,
  Lock,
  Menu,
  Edit,
  Save,
  X,
} from "lucide-react"
import { doc, getDoc, updateDoc, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Badge } from "@/components/ui/badge"
import type { Curriculum, CurriculumStep, UserCurriculumProgress } from "@/lib/curriculum-types"
import { PasswordModal } from "@/components/password-modal"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MarkdownEditor } from "@/components/markdown-editor"
import { parseMarkdown } from "@/lib/markdown-parser"

export default function CurriculumStepPage({ params }: { params: { id: string; stepIndex: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [currentStep, setCurrentStep] = useState<CurriculumStep | null>(null)
  const [userProgress, setUserProgress] = useState<UserCurriculumProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 현재 단계 인덱스
  const stepIndex = Number.parseInt(params.stepIndex)

  // 진행률 계산
  const completedSteps = userProgress?.completedSteps?.length || 0
  const totalSteps = curriculum?.steps?.length || 0
  const progressPercentage = totalSteps > 0 ? Math.min((completedSteps / totalSteps) * 100, 100) : 0

  // 현재 단계가 완료되었는지 확인
  const isStepCompleted = userProgress?.completedSteps?.includes(stepIndex.toString()) || false

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      const curriculumRef = doc(db, "curriculums", params.id)
      const curriculumSnap = await getDoc(curriculumRef)

      if (!curriculumSnap.exists()) {
        setError("존재하지 않는 커리큘럼입니다.")
        return
      }

      const curriculumData = curriculumSnap.data()

      if (!curriculumData.isPublished && !isAdmin) {
        setError("접근 권한이 없습니다.")
        return
      }

      const steps = curriculumData.steps || []
      const curriculum: Curriculum = {
        id: curriculumSnap.id,
        title: curriculumData.title || "",
        description: curriculumData.description || "",
        content: curriculumData.content || "",
        category: curriculumData.category || "",
        thumbnailUrl: curriculumData.thumbnailUrl,
        createdAt: curriculumData.createdAt || { toDate: () => new Date() },
        updatedAt: curriculumData.updatedAt || { toDate: () => new Date() },
        createdBy: curriculumData.createdBy || "",
        createdByName: curriculumData.createdByName || "",
        isPublished: curriculumData.isPublished || false,
        viewCount: curriculumData.viewCount || 0,
        tags: curriculumData.tags || [],
        password: curriculumData.password || "",
        isPasswordProtected: curriculumData.isPasswordProtected || false,
        steps: steps,
        totalSteps: steps.length,
        difficulty: curriculumData.difficulty || "Easy",
        estimatedTime: curriculumData.estimatedTime || "",
        prerequisites: curriculumData.prerequisites || [],
        learningObjectives: curriculumData.learningObjectives || [],
        instructor: curriculumData.instructor || "",
        courseType: curriculumData.courseType || "Skill Path",
        rating: curriculumData.rating || 4.5,
        enrollmentCount: curriculumData.enrollmentCount || 0,
      }

      setCurriculum(curriculum)

      // 현재 단계 설정
      if (curriculum.steps && curriculum.steps.length > stepIndex) {
        setCurrentStep(curriculum.steps[stepIndex])
      } else {
        setError("존재하지 않는 단계입니다.")
        return
      }

      // 사용자 진행상황 가져오기
      if (user?.uid) {
        try {
          const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)
          const progressSnap = await getDoc(progressRef)

          if (progressSnap.exists()) {
            const progressData = progressSnap.data()
            setUserProgress({
              userId: progressData.userId,
              curriculumId: progressData.curriculumId,
              currentStep: progressData.currentStep || 0,
              completedSteps: progressData.completedSteps || [],
              lastAccessedAt: progressData.lastAccessedAt,
              startedAt: progressData.startedAt,
              completedAt: progressData.completedAt,
            })
          } else {
            // 진행 상황이 없으면 새로 생성
            const now = new Date()
            const newProgress = {
              userId: user.uid,
              curriculumId: params.id,
              currentStep: stepIndex,
              completedSteps: [],
              lastAccessedAt: now,
              startedAt: now,
            }

            await setDoc(progressRef, newProgress)
            setUserProgress({
              ...newProgress,
              lastAccessedAt: { toDate: () => now },
              startedAt: { toDate: () => now },
            })
          }

          // 현재 단계 업데이트
          await updateDoc(progressRef, {
            currentStep: stepIndex,
            lastAccessedAt: serverTimestamp(),
          })
        } catch (progressError) {
          console.error("Error fetching/updating progress:", progressError)
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError("데이터를 불러오는 중 오류가 발생했습니다.")
      toast({
        title: "데이터 로딩 오류",
        description: `커리큘럼을 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 내용 저장 함수
  const saveStepContent = async () => {
    if (!user?.uid || !curriculum || !currentStep || !isAdmin) return

    try {
      setIsSaving(true)
      const curriculumRef = doc(db, "curriculums", params.id)
      const curriculumSnap = await getDoc(curriculumRef)

      if (curriculumSnap.exists()) {
        const curriculumData = curriculumSnap.data()
        const steps = [...(curriculumData.steps || [])]

        if (steps[stepIndex]) {
          steps[stepIndex] = {
            ...steps[stepIndex],
            content: editedContent,
          }

          await updateDoc(curriculumRef, {
            steps: steps,
            updatedAt: serverTimestamp(),
          })

          // 로컬 상태 업데이트
          setCurrentStep({
            ...currentStep,
            content: editedContent,
          })

          setCurriculum({
            ...curriculum,
            steps: steps,
          })

          setIsEditing(false)

          toast({
            title: "저장 완료",
            description: "단계 내용이 성공적으로 저장되었습니다.",
          })
        }
      }
    } catch (error: any) {
      console.error("Error saving step content:", error)
      toast({
        title: "저장 오류",
        description: "내용 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 편집 시작
  const startEditing = () => {
    setEditedContent(currentStep?.content || "")
    setIsEditing(true)
  }

  // 편집 취소
  const cancelEditing = () => {
    setIsEditing(false)
    setEditedContent("")
  }

  // 비밀번호 확인
  const verifyPassword = (enteredPassword: string) => {
    if (curriculum && curriculum.password === enteredPassword) {
      setPasswordVerified(true)
      setShowPasswordModal(false)
      sessionStorage.setItem(`curriculum_${params.id}_verified`, "true")
    } else {
      setPasswordError("비밀번호가 일치하지 않습니다.")
    }
  }

  // 단계 완료 처리
  const completeStep = async () => {
    if (!user?.uid || !curriculum) return

    try {
      setIsCompleting(true)
      const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)
      const progressSnap = await getDoc(progressRef)

      if (progressSnap.exists()) {
        const progressData = progressSnap.data()
        const completedSteps = progressData.completedSteps || []

        if (!completedSteps.includes(stepIndex.toString())) {
          // 완료된 단계 배열에 현재 단계 추가
          await updateDoc(progressRef, {
            completedSteps: arrayUnion(stepIndex.toString()),
            lastAccessedAt: serverTimestamp(),
          })

          // 모든 단계가 완료되었는지 확인
          const updatedCompletedSteps = [...completedSteps, stepIndex.toString()]
          const allCompleted = curriculum.steps?.length === updatedCompletedSteps.length

          if (allCompleted) {
            await updateDoc(progressRef, {
              completedAt: serverTimestamp(),
            })

            toast({
              title: "축하합니다!",
              description: "모든 단계를 완료했습니다.",
            })
          } else {
            toast({
              title: "단계 완료",
              description: "이 단계를 성공적으로 완료했습니다.",
            })
          }

          // 진행 상황 업데이트
          setUserProgress({
            ...userProgress!,
            completedSteps: [...(userProgress?.completedSteps || []), stepIndex.toString()],
          })
        }
      }
    } catch (error: any) {
      console.error("Error completing step:", error)
      toast({
        title: "오류 발생",
        description: "단계 완료 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // 다음 단계로 이동
  const goToNextStep = async () => {
    if (!curriculum) return
    if (stepIndex < curriculum.steps!.length - 1) {
      setIsNavigating(true)
      try {
        await router.push(`/curriculum/${params.id}/step/${stepIndex + 1}`)
      } catch (e) {
        console.error("Navigation error:", e)
        toast({
          title: "탐색 오류",
          description: "다음 단계로 이동하는 데 실패했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsNavigating(false)
      }
    }
  }

  // 이전 단계로 이동
  const goToPrevStep = async () => {
    if (stepIndex > 0) {
      setIsNavigating(true)
      try {
        await router.push(`/curriculum/${params.id}/step/${stepIndex - 1}`)
      } catch (e) {
        console.error("Navigation error:", e)
        toast({
          title: "탐색 오류",
          description: "이전 단계로 이동하는 데 실패했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsNavigating(false)
      }
    }
  }

  // 커리큘럼 목록으로 이동
  const goToCurriculum = () => {
    router.push(`/curriculum/${params.id}`)
  }

  // 특정 단계로 이동
  const goToStep = async (index: number) => {
    setIsNavigating(true)
    try {
      await router.push(`/curriculum/${params.id}/step/${index}`)
      setShowSidebar(false)
    } catch (e) {
      console.error("Navigation error:", e)
      toast({
        title: "탐색 오류",
        description: "특정 단계로 이동하는 데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsNavigating(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id, params.stepIndex, isAdmin, user])

  useEffect(() => {
    // No user question fetching
  }, [])

  // 비밀번호 확인
  useEffect(() => {
    if (curriculum && curriculum.isPasswordProtected) {
      const isVerified = sessionStorage.getItem(`curriculum_${params.id}_verified`) === "true"

      if (isVerified) {
        setPasswordVerified(true)
      } else {
        if (isAdmin) {
          setPasswordVerified(true)
        } else {
          setShowPasswordModal(true)
        }
      }
    }
  }, [curriculum, params.id, isAdmin])

  // 단계 내용 파싱 및 편집 모드 지원
  const renderStepContent = () => {
    if (!currentStep || !currentStep.content) return <p className="text-gray-500 italic">내용이 없습니다.</p>

    if (isEditing && isAdmin) {
      return (
        <div className="space-y-4">
          <MarkdownEditor
            value={editedContent}
            onChange={setEditedContent}
            placeholder="마크다운으로 단계 내용을 작성하세요..."
            minHeight="500px"
            className="border-gray-700"
          />
          <div className="flex gap-2">
            <Button onClick={saveStepContent} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={cancelEditing}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
          </div>
        </div>
      )
    }

    try {
      // 마크다운 파싱 및 렌더링
      const parsedContent = parseMarkdown(currentStep.content)

      // 링크, 이미지, 코드 블록이 제대로 작동하도록 추가 처리
      const enhancedContent = parsedContent
        // 이미지 태그에 loading="lazy" 및 클래스 추가
        .replace(/<img([^>]*)>/g, '<img$1 loading="lazy" class="max-w-full rounded-md my-4">')
        // 링크에 target="_blank" 및 rel 속성 추가
        .replace(/<a([^>]*)>/g, '<a$1 target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">')

      return (
        <div className="prose prose-invert max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-headings:text-white prose-a:text-blue-400">
          <div dangerouslySetInnerHTML={{ __html: enhancedContent }} />
        </div>
      )
    } catch (e) {
      console.error("마크다운 파싱 오류:", e)
      // 오류 발생 시 일반 텍스트로 표시
      return <div className="prose prose-invert max-w-none whitespace-pre-wrap">{currentStep.content}</div>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">커리큘럼을 불러오는 중입니다...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !curriculum || !currentStep) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-400 mb-2">{error || "커리큘럼을 찾을 수 없습니다."}</p>
            <div className="flex gap-4 mt-6 justify-center">
              <Button
                variant="outline"
                onClick={goToCurriculum}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                커리큘럼으로 돌아가기
              </Button>
              <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">
                다시 시도
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      {/* 미묘한 그레이드 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-gray-900/20 pointer-events-none"></div>

      {/* 격자 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      ></div>

      {showPasswordModal && curriculum?.isPasswordProtected && (
        <PasswordModal onSubmit={verifyPassword} error={passwordError} />
      )}

      <Navbar />

      {curriculum.isPasswordProtected && !passwordVerified ? (
        <main className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/80 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto border border-gray-700">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">비밀번호 보호됨</h2>
            <p className="text-gray-400 text-center mt-2 mb-4">이 커리큘럼은 비밀번호로 보호되어 있습니다.</p>
            <Button onClick={() => setShowPasswordModal(true)} className="bg-blue-600 hover:bg-blue-700">
              비밀번호 입력하기
            </Button>
          </div>
        </main>
      ) : (
        <main className="flex-1 relative z-10">
          {/* 상단 네비게이션 바 */}
          <div className="bg-black/80 border-b border-gray-800 sticky top-0 z-20 backdrop-blur-md">
            <div className="container mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToCurriculum}
                    className="hover:bg-gray-800/60 text-gray-400 hover:text-white"
                  >
                    <Home className="h-5 w-5" />
                  </Button>
                  <div className="hidden md:block">
                    <h1 className="text-lg font-medium text-white truncate max-w-md">{curriculum.title}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isEditing ? (isSaving ? undefined : saveStepContent) : startEditing}
                      disabled={isSaving}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isEditing ? (
                        <Save className="h-4 w-4" />
                      ) : (
                        <Edit className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">
                        {isSaving ? "저장 중..." : isEditing ? "저장" : "편집"}
                      </span>
                    </Button>
                  )}

                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">취소</span>
                    </Button>
                  )}

                  <div className="hidden md:flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevStep}
                      disabled={stepIndex === 0 || isNavigating}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 bg-transparent"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      이전
                    </Button>
                    <div className="text-sm text-gray-400">
                      <span className="font-medium text-white">{stepIndex + 1}</span> / {curriculum.steps?.length}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextStep}
                      disabled={stepIndex === (curriculum.steps?.length || 0) - 1 || isNavigating}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 bg-transparent"
                    >
                      다음
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="md:hidden border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="bg-black border-gray-800 text-white">
                      <SheetHeader>
                        <SheetTitle className="text-white">커리큘럼 목차</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-200">진행률</span>
                          <span className="text-sm text-gray-400">
                            {completedSteps} / {totalSteps} 완료
                          </span>
                        </div>

                        {/* 진행률 표시 */}
                        <div className="relative h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>

                        <div className="mt-6 space-y-2">
                          {curriculum.steps?.map((step, index) => {
                            const isCompleted = userProgress?.completedSteps?.includes(index.toString()) || false
                            const isCurrent = index === stepIndex

                            return (
                              <div
                                key={step.id}
                                className={`p-3 rounded-md cursor-pointer transition-colors ${
                                  isCurrent
                                    ? "bg-gray-800 border border-gray-600"
                                    : isCompleted
                                      ? "bg-gray-900/60 hover:bg-gray-900/80"
                                      : "bg-gray-900/40 hover:bg-gray-900/60"
                                }`}
                                onClick={() => goToStep(index)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <span className="text-sm font-medium text-gray-300">{index + 1}</span>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-200 truncate">{step.title}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </div>

          {/* 진행률 표시 */}
          <div className="bg-black border-b border-gray-800">
            <div className="container mx-auto px-4 md:px-6">
              <div className="relative h-1 w-full bg-gray-800 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="max-w-4xl mx-auto">
              {/* 단계 헤더 */}
              <div className="mb-6 bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                    단계 {stepIndex + 1} / {curriculum.steps?.length}
                  </Badge>
                  {currentStep.duration && (
                    <div className="text-sm text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {currentStep.duration}
                    </div>
                  )}
                  {isStepCompleted && (
                    <Badge className="bg-green-900/50 text-green-300 border-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      완료됨
                    </Badge>
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">{currentStep.title}</h2>
                <p className="text-gray-400">{currentStep.description}</p>
              </div>

              {/* 단계 내용 */}
              <div className="step-content bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 min-h-[400px] mb-6">
                {renderStepContent()}
              </div>

              {/* 하단 네비게이션 */}
              <div className="mt-8 flex justify-between bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                <Button
                  variant="outline"
                  onClick={goToPrevStep}
                  disabled={stepIndex === 0 || isNavigating}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 bg-transparent"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  이전 단계
                </Button>
                <Button
                  onClick={completeStep}
                  disabled={isCompleting || isStepCompleted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 shadow-lg transition-all duration-300 hover:scale-105"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      완료 중...
                    </>
                  ) : (
                    <>
                      단계 완료
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNextStep}
                  disabled={stepIndex === (curriculum.steps?.length || 0) - 1 || isNavigating}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 bg-transparent"
                >
                  다음 단계
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
