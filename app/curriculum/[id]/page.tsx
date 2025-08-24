"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Users,
  Star,
  CheckCircle,
  FileText,
  Code,
  Video,
  ExternalLink,
  AlertCircle,
  LogIn,
  UserPlus,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { doc, getDoc, arrayUnion, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Skeleton } from "@/components/ui/skeleton"

interface CurriculumStep {
  id: string
  title: string
  description: string
  content: string
  type: "video" | "text" | "quiz" | "practice"
  duration: number
  isCompleted: boolean
  resources?: {
    title: string
    url: string
    type: "pdf" | "code" | "link"
  }[]
}

interface Curriculum {
  id: string
  title: string
  description: string
  category: string
  difficulty: "beginner" | "intermediate" | "advanced"
  estimatedTime: number
  totalSteps: number
  completedSteps: number
  progress: number
  tags: string[]
  prerequisites: string[]
  learningObjectives: string[]
  steps: CurriculumStep[]
  isPublished: boolean
  createdAt: any
  updatedAt: any
}

export default function CurriculumDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState(0)

  // 접근 권한 확인 (로그인하지 않았거나 일회용 계정인 경우 false)
  const canAccess = user && !userProfile?.isTemporary

  // 커리큘럼 데이터 가져오기
  const fetchCurriculum = async () => {
    try {
      const curriculumRef = doc(db, "curriculums", params.id)
      const curriculumSnap = await getDoc(curriculumRef)

      if (!curriculumSnap.exists()) {
        setError("존재하지 않는 커리큘럼입니다.")
        return
      }

      const curriculumData = curriculumSnap.data()

      if (!curriculumData.isPublished) {
        setError("아직 공개되지 않은 커리큘럼입니다.")
        return
      }

      // 사용자 진행 상황 가져오기
      let userProgress = null
      if (user?.uid) {
        const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)
        const progressSnap = await getDoc(progressRef)
        if (progressSnap.exists()) {
          userProgress = progressSnap.data()
        }
      }

      const steps: CurriculumStep[] =
        curriculumData.steps?.map((step: any, index: number) => ({
          id: step.id || `step_${index}`,
          title: step.title || "",
          description: step.description || "",
          content: step.content || "",
          type: step.type || "text",
          duration: step.duration || 0,
          isCompleted: userProgress?.completedSteps?.includes(step.id) || false,
          resources: step.resources || [],
        })) || []

      const completedSteps = steps.filter((step) => step.isCompleted).length
      const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

      setCurriculum({
        id: curriculumSnap.id,
        title: curriculumData.title || "",
        description: curriculumData.description || "",
        category: curriculumData.category || "",
        difficulty: curriculumData.difficulty || "beginner",
        estimatedTime: curriculumData.estimatedTime || 0,
        totalSteps: steps.length,
        completedSteps,
        progress,
        tags: Array.isArray(curriculumData.tags) ? curriculumData.tags : [],
        prerequisites: Array.isArray(curriculumData.prerequisites) ? curriculumData.prerequisites : [],
        learningObjectives: Array.isArray(curriculumData.learningObjectives) ? curriculumData.learningObjectives : [],
        steps,
        isPublished: curriculumData.isPublished || false,
        createdAt: curriculumData.createdAt,
        updatedAt: curriculumData.updatedAt,
      })
    } catch (error: any) {
      console.error("Error fetching curriculum:", error)
      setError("커리큘럼을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 단계 완료 처리
  const completeStep = async (stepId: string) => {
    if (!user?.uid || !curriculum) return

    try {
      const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)

      await setDoc(
        progressRef,
        {
          userId: user.uid,
          curriculumId: params.id,
          completedSteps: arrayUnion(stepId),
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      // 로컬 상태 업데이트
      setCurriculum((prev) => {
        if (!prev) return null

        const updatedSteps = prev.steps.map((step) => (step.id === stepId ? { ...step, isCompleted: true } : step))

        const completedSteps = updatedSteps.filter((step) => step.isCompleted).length
        const progress = (completedSteps / updatedSteps.length) * 100

        return {
          ...prev,
          steps: updatedSteps,
          completedSteps,
          progress,
        }
      })

      toast({
        title: "단계 완료!",
        description: "이 단계를 성공적으로 완료했습니다.",
      })
    } catch (error: any) {
      console.error("Error completing step:", error)
      toast({
        title: "오류",
        description: "단계 완료 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 다음 단계로 이동
  const goToNextStep = () => {
    if (curriculum && currentStep < curriculum.steps.length - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // 이전 단계로 이동
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // 특정 단계로 이동
  const goToStep = (stepIndex: number) => {
    if (curriculum && stepIndex >= 0 && stepIndex < curriculum.steps.length) {
      setCurrentStep(stepIndex)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // 난이도 색상 반환
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "advanced":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  // 단계 타입 아이콘 반환
  const getStepIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "text":
        return <FileText className="h-4 w-4" />
      case "quiz":
        return <CheckCircle className="h-4 w-4" />
      case "practice":
        return <Code className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  useEffect(() => {
    fetchCurriculum()
    const script = document.createElement("script")
    script.innerHTML = generateCopyScript()
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [params.id, user])

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48 bg-gray-800/50" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full bg-gray-800/50" />
                <Skeleton className="h-32 w-full bg-gray-800/50" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full bg-gray-800/50" />
                <Skeleton className="h-32 w-full bg-gray-800/50" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 접근 권한이 없는 경우
  if (!canAccess) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-blue-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full"
          >
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-md">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <Shield className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">커리큘럼 접근 제한</h2>
                  <p className="text-gray-400">
                    {!user
                      ? "커리큘럼을 이용하려면 로그인이 필요합니다."
                      : "일회용 계정으로는 커리큘럼을 이용할 수 없습니다. 정식 계정으로 가입해주세요."}
                  </p>
                </div>

                <div className="space-y-3">
                  {!user ? (
                    <>
                      <Link href="/login" className="block">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                          <LogIn className="mr-2 h-4 w-4" />
                          로그인하기
                        </Button>
                      </Link>
                      <Link href="/register" className="block">
                        <Button
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          회원가입하기
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/register" className="block">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white">
                        <UserPlus className="mr-2 h-4 w-4" />
                        정식 계정 가입하기
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => router.push("/curriculum")}
                    className="w-full text-gray-400 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    커리큘럼 목록으로 돌아가기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  // 오류 상태
  if (error || !curriculum) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-400 mb-2">{error || "커리큘럼을 찾을 수 없습니다."}</p>
            <div className="flex gap-4 mt-6 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/curriculum")}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                커리큘럼 목록으로 돌아가기
              </Button>
              <Button onClick={fetchCurriculum} className="bg-blue-600 hover:bg-blue-700">
                다시 시도
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentStepData = curriculum.steps[currentStep]

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-blue-900">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 뒤로가기 버튼 */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Button
              variant="ghost"
              onClick={() => router.push("/curriculum")}
              className="mb-6 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              커리큘럼 목록으로 돌아가기
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 커리큘럼 헤더 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-700">
                            {curriculum.category}
                          </Badge>
                          <Badge variant="outline" className={getDifficultyColor(curriculum.difficulty)}>
                            {curriculum.difficulty}
                          </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{curriculum.title}</h1>
                        <p className="text-gray-400">{curriculum.description}</p>
                      </div>
                    </div>

                    {/* 진행률 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">진행률</span>
                        <span className="text-white font-medium">{Math.round(curriculum.progress)}%</span>
                      </div>
                      <Progress value={curriculum.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>
                          {curriculum.completedSteps}/{curriculum.totalSteps} 단계 완료
                        </span>
                        <span>예상 시간: {curriculum.estimatedTime}분</span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* 현재 단계 콘텐츠 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-md">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-blue-400">
                            {getStepIcon(currentStepData.type)}
                            <span className="text-sm font-medium">
                              {currentStepData.type.charAt(0).toUpperCase() + currentStepData.type.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{currentStepData.duration}분</span>
                          </div>
                        </div>
                        {currentStepData.isCompleted && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            완료
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl text-white">{currentStepData.title}</CardTitle>
                      <p className="text-gray-400">{currentStepData.description}</p>
                    </CardHeader>

                    <CardContent>
                      <div className="curriculum-content prose prose-invert prose-lg max-w-none mb-6 text-white">
                        <div
                          className="markdown-content text-white leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(currentStepData.content) }}
                        />
                      </div>

                      {/* 리소스 */}
                      {currentStepData.resources && currentStepData.resources.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-white">추가 자료</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currentStepData.resources.map((resource, index) => (
                              <a
                                key={index}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                              >
                                {resource.type === "pdf" && <FileText className="h-4 w-4 text-red-400" />}
                                {resource.type === "code" && <Code className="h-4 w-4 text-green-400" />}
                                {resource.type === "link" && <ExternalLink className="h-4 w-4 text-blue-400" />}
                                <span className="text-white text-sm">{resource.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 단계 완료 버튼 */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                        <Button
                          variant="ghost"
                          onClick={goToPreviousStep}
                          disabled={currentStep === 0}
                          className="text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          이전 단계
                        </Button>

                        <div className="flex items-center gap-3">
                          {!currentStepData.isCompleted && (
                            <Button
                              onClick={() => completeStep(currentStepData.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              단계 완료
                            </Button>
                          )}

                          <Button
                            onClick={goToNextStep}
                            disabled={currentStep === curriculum.steps.length - 1}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            다음 단계
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 사이드바 */}
            <div className="space-y-6">
              {/* 커리큘럼 정보 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">커리큘럼 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-400">총 {curriculum.totalSteps}개 단계</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-green-400" />
                      <span className="text-gray-400">예상 시간: {curriculum.estimatedTime}분</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span className="text-gray-400">{curriculum.difficulty} 레벨</span>
                    </div>

                    {/* 태그 */}
                    {curriculum.tags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">태그</p>
                        <div className="flex flex-wrap gap-1">
                          {curriculum.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs bg-gray-800 text-gray-300 border-gray-700"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 학습 목표 */}
                    {curriculum.learningObjectives.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">학습 목표</p>
                        <ul className="space-y-1">
                          {curriculum.learningObjectives.map((objective, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                              <Star className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 선수 조건 */}
                    {curriculum.prerequisites.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">선수 조건</p>
                        <ul className="space-y-1">
                          {curriculum.prerequisites.map((prerequisite, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                              <AlertCircle className="h-3 w-3 text-orange-400 mt-0.5 flex-shrink-0" />
                              <span>{prerequisite}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 단계 목록 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">단계 목록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {curriculum.steps.map((step, index) => (
                        <button
                          key={step.id}
                          onClick={() => goToStep(index)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            index === currentStep
                              ? "bg-blue-600/20 border border-blue-500/30"
                              : "bg-gray-800/30 hover:bg-gray-700/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                  step.isCompleted
                                    ? "bg-green-500 text-white"
                                    : index === currentStep
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-600 text-gray-300"
                                }`}
                              >
                                {step.isCompleted ? <CheckCircle className="h-3 w-3" /> : index + 1}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStepIcon(step.type)}
                                <span
                                  className={`text-sm font-medium ${
                                    index === currentStep ? "text-white" : "text-gray-300"
                                  }`}
                                >
                                  {step.title}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{step.duration}분</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
