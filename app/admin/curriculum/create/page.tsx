"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  BookOpen,
  FileText,
  Settings,
  Target,
  Video,
  LinkIcon,
  Clock,
  GripVertical,
  MoveUp,
  MoveDown,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { CurriculumCategory, CurriculumStep } from "@/lib/curriculum-types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { MarkdownEditor } from "@/components/markdown-editor"
import { parseMarkdown } from "@/lib/markdown-parser"
import { FirebaseFileUploader } from "@/components/firebase-file-uploader"

// 드래그 가능한 단계 컴포넌트
const SortableStep = ({
  step,
  index,
  updateStep,
  removeStep,
  stepsLength,
  moveStep,
}: {
  step: CurriculumStep
  index: number
  updateStep: (id: string, field: keyof CurriculumStep, value: any) => void
  removeStep: (id: string) => void
  stepsLength: number
  moveStep: (id: string, direction: "up" | "down") => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id })
  const [activeTab, setActiveTab] = useState("content")
  const [showPreview, setShowPreview] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <Card className="bg-gray-800 border-gray-600 shadow-lg">
        <CardHeader className="bg-gray-700/50 flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab">
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
              단계 {index + 1}
            </Badge>
            <Input
              value={step.title}
              onChange={(e) => updateStep(step.id, "title", e.target.value)}
              placeholder="단계 제목을 입력하세요"
              className="bg-gray-700 border-gray-600 text-white focus:border-blue-500 max-w-md"
            />
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveStep(step.id, "up")}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <MoveUp className="h-4 w-4" />
              </Button>
            )}
            {index < stepsLength - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveStep(step.id, "down")}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <MoveDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeStep(step.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-900 border border-gray-700 mb-4">
              <TabsTrigger value="content" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                내용
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                리소스
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-300">단계 내용 (마크다운)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showPreview ? "편집" : "미리보기"}
                  </Button>
                </div>

                {showPreview ? (
                  <div className="border border-gray-600 rounded-md p-4 bg-gray-900 min-h-[300px]">
                    <div className="prose prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: step.content ? parseMarkdown(step.content) : "<p>내용이 없습니다.</p>",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <MarkdownEditor
                    value={step.content || ""}
                    onChange={(value) => updateStep(step.id, "content", value)}
                    placeholder="마크다운으로 단계 내용을 작성하세요..."
                    minHeight="300px"
                    className="border-gray-600"
                  />
                )}

                <p className="text-xs text-gray-400">
                  마크다운 문법을 사용하여 텍스트, 이미지, 코드 블록 등을 자유롭게 추가하세요.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-300">비디오 URL</Label>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-gray-400" />
                    <Input
                      value={step.videoUrl || ""}
                      onChange={(e) => updateStep(step.id, "videoUrl", e.target.value)}
                      placeholder="YouTube 또는 Vimeo URL을 입력하세요"
                      className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-300">추가 자료</Label>
                  <div className="space-y-2">
                    {(step.resources || []).map((resource, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                        <Input
                          value={resource}
                          onChange={(e) => {
                            const newResources = [...(step.resources || [])]
                            newResources[idx] = e.target.value
                            updateStep(step.id, "resources", newResources)
                          }}
                          className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newResources = [...(step.resources || [])]
                            newResources.splice(idx, 1)
                            updateStep(step.id, "resources", newResources)
                          }}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newResources = [...(step.resources || []), ""]
                        updateStep(step.id, "resources", newResources)
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      자료 추가
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-300">소요 시간</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <Input
                      value={step.duration || ""}
                      onChange={(e) => updateStep(step.id, "duration", e.target.value)}
                      placeholder="예: 15분"
                      className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-300">단계 설명</Label>
                  <Textarea
                    value={step.description || ""}
                    onChange={(e) => updateStep(step.id, "description", e.target.value)}
                    placeholder="이 단계에 대한 간단한 설명을 입력하세요"
                    className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminCurriculumCreatePage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  // 기본 정보
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [content, setContent] = useState("")

  // 새로운 필드들
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Expert">("Easy")
  const [estimatedTime, setEstimatedTime] = useState("")
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [prerequisiteInput, setPrerequisiteInput] = useState("")
  const [learningObjectives, setLearningObjectives] = useState<string[]>([])
  const [objectiveInput, setObjectiveInput] = useState("")
  const [instructor, setInstructor] = useState("")
  const [language, setLanguage] = useState("Korean")
  const [skillLevel, setSkillLevel] = useState<"Beginner" | "Intermediate" | "Advanced" | "Expert">("Beginner")
  const [courseType, setCourseType] = useState<"Skill Path" | "Job Role Path" | "Single Course">("Skill Path")

  const [steps, setSteps] = useState<CurriculumStep[]>([
    {
      id: "1",
      title: "들어가며",
      content:
        "# 들어가며\n\n이 단계에서는 주제에 대한 기본 개념을 소개합니다.\n\n## 학습 목표\n\n- 기본 개념 이해\n- 실습 환경 준비\n- 학습 계획 수립\n\n## 내용\n\n여기에 상세한 내용을 작성하세요.",
      order: 0,
      duration: "10분",
      resources: [],
      description: "커리큘럼의 첫 번째 단계입니다.",
    },
  ])

  const [categories, setCategories] = useState<CurriculumCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [showContentPreview, setShowContentPreview] = useState(false)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 카테고리 가져오기
  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError("")

      const categoriesRef = collection(db, "curriculum_categories")
      const categoriesQuery = query(categoriesRef, orderBy("order", "asc"))
      const categoriesSnapshot = await getDocs(categoriesQuery)

      const categoriesData: CurriculumCategory[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data() as Omit<CurriculumCategory, "id">
        categoriesData.push({
          id: doc.id,
          ...data,
        })
      })
      setCategories(categoriesData)

      if (categoriesData.length > 0) {
        setCategory(categoriesData[0].id)
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error)
      setError("카테고리를 불러오는 중 오류가 발생했습니다.")
      toast({
        title: "데이터 로딩 오류",
        description: `카테고리를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    fetchCategories()
  }, [isAdmin, router])

  // 태그 관련 함수들
  const addTag = () => {
    if (!tagInput.trim()) return
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
    }
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // 선수과목 관련 함수들
  const addPrerequisite = () => {
    if (!prerequisiteInput.trim()) return
    if (!prerequisites.includes(prerequisiteInput.trim())) {
      setPrerequisites([...prerequisites, prerequisiteInput.trim()])
    }
    setPrerequisiteInput("")
  }

  const removePrerequisite = (prereqToRemove: string) => {
    setPrerequisites(prerequisites.filter((prereq) => prereq !== prereqToRemove))
  }

  // 학습목표 관련 함수들
  const addObjective = () => {
    if (!objectiveInput.trim()) return
    if (!learningObjectives.includes(objectiveInput.trim())) {
      setLearningObjectives([...learningObjectives, objectiveInput.trim()])
    }
    setObjectiveInput("")
  }

  const removeObjective = (objToRemove: string) => {
    setLearningObjectives(learningObjectives.filter((obj) => obj !== objToRemove))
  }

  // 단계 관련 함수들
  const addStep = () => {
    const newStep: CurriculumStep = {
      id: Date.now().toString(),
      title: `단계 ${steps.length + 1}`,
      content: `# 단계 ${steps.length + 1}\n\n이 단계에서 학습할 내용을 입력하세요.\n\n## 학습 목표\n\n- 목표 1\n- 목표 2\n- 목표 3\n\n## 내용\n\n여기에 상세한 내용을 작성하세요.`,
      order: steps.length,
      duration: "15분",
      resources: [],
      description: `${steps.length + 1}번째 단계입니다.`,
    }
    setSteps([...steps, newStep])
  }

  const updateStep = (stepId: string, field: keyof CurriculumStep, value: any) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, [field]: value } : step)))
  }

  const removeStep = (stepId: string) => {
    if (steps.length <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 하나의 단계는 있어야 합니다.",
        variant: "destructive",
      })
      return
    }
    setSteps(steps.filter((step) => step.id !== stepId))
  }

  const moveStep = (stepId: string, direction: "up" | "down") => {
    const currentIndex = steps.findIndex((step) => step.id === stepId)
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if ((direction === "up" && currentIndex === 0) || (direction === "down" && currentIndex === steps.length - 1)) {
      return
    }

    const newSteps = [...steps]
    const temp = newSteps[currentIndex]
    newSteps[currentIndex] = newSteps[targetIndex]
    newSteps[targetIndex] = temp

    // order 값 업데이트
    newSteps.forEach((step, index) => {
      step.order = index
    })

    setSteps(newSteps)
  }

  // 드래그 앤 드롭 처리
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        // 배열 항목 재정렬
        const newItems = [...items]
        const [movedItem] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, movedItem)

        // order 값 업데이트
        return newItems.map((item, index) => ({
          ...item,
          order: index,
        }))
      })
    }
  }

  // 커리큘럼 저장
  const saveCurriculum = async () => {
    if (!title.trim()) {
      toast({
        title: "입력 오류",
        description: "제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!category && categories.length > 0) {
      toast({
        title: "입력 오류",
        description: "카테고리를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const curriculumData = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
        thumbnailUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || "",
        createdByName: user?.displayName || "",
        isPublished,
        viewCount: 0,
        tags,
        isPasswordProtected,
        password: isPasswordProtected ? password : "",
        steps: steps.map((step, index) => ({
          ...step,
          order: index,
        })),
        totalSteps: steps.length,
        difficulty,
        estimatedTime,
        prerequisites,
        learningObjectives,
        instructor: instructor || user?.displayName || "",
        language,
        skillLevel,
        courseType,
        rating: 0,
        enrollmentCount: 0,
      }

      await addDoc(collection(db, "curriculums"), curriculumData)

      toast({
        title: "저장 완료",
        description: "커리큘럼이 성공적으로 저장되었습니다.",
      })

      router.push("/admin/curriculum")
    } catch (error: any) {
      console.error("Error saving curriculum:", error)
      toast({
        title: "저장 오류",
        description: `커리큘럼을 저장하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGoBack = () => {
    router.push("/admin/curriculum")
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-400">데이터를 불러오는 중입니다...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {/* 헤더 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">새 커리큘럼 작성</h1>
                <p className="text-gray-400 mt-1">체계적인 학습 경로를 마크다운으로 만들어보세요</p>
              </div>
            </div>
            <Button onClick={saveCurriculum} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장하기
                </>
              )}
            </Button>
          </div>

          {error && (
            <Card className="mb-6 border-red-500/20 bg-red-950/20">
              <CardContent className="py-4">
                <p className="text-red-400 font-medium">{error}</p>
                <Button variant="outline" className="mt-2 bg-transparent" onClick={fetchCategories}>
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* 왼쪽: 기본 정보 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 기본 정보 카드 */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-2">
                    <Label htmlFor="thumbnailUrl" className="text-sm font-semibold text-gray-300">
                      썸네일 이미지
                    </Label>
                    <Input
                      id="thumbnailUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                    />

                    {/* 파일 업로드 컴포넌트 추가 */}
                    <div className="mt-4">
                      <Label className="text-sm font-semibold text-gray-300 mb-2 block">또는 이미지 파일 업로드</Label>
                      <FirebaseFileUploader
                        folder="curriculum"
                        maxFiles={1}
                        maxSize={10}
                        acceptedTypes={["image/*"]}
                        onFilesChange={(files) => {
                          if (files.length > 0) {
                            setThumbnailUrl(files[0].url)
                          }
                        }}
                        disabled={isSaving}
                      />
                    </div>

                    {thumbnailUrl && (
                      <div className="mt-2">
                        <img
                          src={thumbnailUrl || "/placeholder.svg"}
                          alt="썸네일 미리보기"
                          className="h-32 w-full object-cover rounded-md border border-gray-600"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=128&width=256"
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-300">
                      설명
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="커리큘럼에 대한 간략한 설명을 입력하세요"
                      rows={3}
                      className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-300">
                      카테고리 *
                    </Label>
                    {categories.length > 0 ? (
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-gray-700">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-gray-400 p-3 bg-yellow-900/20 rounded-md border border-yellow-700">
                        <p className="font-medium">등록된 카테고리가 없습니다.</p>
                        <Link href="/admin/curriculum/categories" className="text-blue-400 hover:underline">
                          카테고리 관리 페이지에서 카테고리를 추가해주세요.
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 코스 설정 카드 */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5 text-green-500" />
                    코스 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">난이도</Label>
                    <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="Easy" className="text-white hover:bg-gray-700">
                          Easy
                        </SelectItem>
                        <SelectItem value="Medium" className="text-white hover:bg-gray-700">
                          Medium
                        </SelectItem>
                        <SelectItem value="Hard" className="text-white hover:bg-gray-700">
                          Hard
                        </SelectItem>
                        <SelectItem value="Expert" className="text-white hover:bg-gray-700">
                          Expert
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">코스 타입</Label>
                    <Select value={courseType} onValueChange={(value: any) => setCourseType(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="Skill Path" className="text-white hover:bg-gray-700">
                          Skill Path
                        </SelectItem>
                        <SelectItem value="Job Role Path" className="text-white hover:bg-gray-700">
                          Job Role Path
                        </SelectItem>
                        <SelectItem value="Single Course" className="text-white hover:bg-gray-700">
                          Single Course
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">예상 소요 시간</Label>
                    <Input
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="예: 2시간 30분"
                      className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">강사명</Label>
                    <Input
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      placeholder="강사명을 입력하세요"
                      className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="passwordProtected"
                        checked={isPasswordProtected}
                        onCheckedChange={setIsPasswordProtected}
                      />
                      <Label htmlFor="passwordProtected" className="text-sm font-semibold text-gray-300">
                        비밀번호 보호
                      </Label>
                    </div>

                    {isPasswordProtected && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold text-gray-300">
                          비밀번호
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="비밀번호를 입력하세요"
                          className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                      <Label htmlFor="published" className="text-sm font-semibold text-gray-300">
                        공개 여부
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 오른쪽: 상세 정보 및 단계 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 상세 정보 카드 */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-purple-500" />
                    상세 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* 태그 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">태그</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-900/50 text-blue-300 border border-blue-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 h-3 w-3 rounded-full flex items-center justify-center hover:bg-blue-800"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="태그 입력 후 추가 버튼 클릭"
                        className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addTag}
                        variant="outline"
                        className="shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                      >
                        추가
                      </Button>
                    </div>
                  </div>

                  {/* 선수과목 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">선수과목</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {prerequisites.map((prereq, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-orange-900/50 text-orange-300 border border-orange-700"
                        >
                          {prereq}
                          <button
                            type="button"
                            onClick={() => removePrerequisite(prereq)}
                            className="ml-1 h-3 w-3 rounded-full flex items-center justify-center hover:bg-orange-800"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={prerequisiteInput}
                        onChange={(e) => setPrerequisiteInput(e.target.value)}
                        placeholder="선수과목 입력 후 추가 버튼 클릭"
                        className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addPrerequisite()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addPrerequisite}
                        variant="outline"
                        className="shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                      >
                        추가
                      </Button>
                    </div>
                  </div>

                  {/* 학습목표 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-300">학습목표</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {learningObjectives.map((obj, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-green-900/50 text-green-300 border border-green-700"
                        >
                          {obj}
                          <button
                            type="button"
                            onClick={() => removeObjective(obj)}
                            className="ml-1 h-3 w-3 rounded-full flex items-center justify-center hover:bg-green-800"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={objectiveInput}
                        onChange={(e) => setObjectiveInput(e.target.value)}
                        placeholder="학습목표 입력 후 추가 버튼 클릭"
                        className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addObjective()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addObjective}
                        variant="outline"
                        className="shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                      >
                        추가
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 커리큘럼 소개 카드 */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-blue-500" />
                      커리큘럼 소개 (마크다운)
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContentPreview(!showContentPreview)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showContentPreview ? "편집" : "미리보기"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {showContentPreview ? (
                    <div className="border border-gray-600 rounded-md p-4 bg-gray-900 min-h-[400px]">
                      <div className="prose prose-invert max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: content ? parseMarkdown(content) : "<p>내용이 없습니다.</p>",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      placeholder="커리큘럼 소개를 마크다운으로 작성하세요..."
                      minHeight="400px"
                      className="border-gray-600"
                    />
                  )}
                </CardContent>
              </Card>

              {/* 커리큘럼 단계 카드 */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-green-500" />
                      커리큘럼 단계 ({steps.length}단계)
                    </CardTitle>
                    <Button onClick={addStep} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      단계 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
                      {steps.map((step, index) => (
                        <SortableStep
                          key={step.id}
                          step={step}
                          index={index}
                          updateStep={updateStep}
                          removeStep={removeStep}
                          stepsLength={steps.length}
                          moveStep={moveStep}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-700">
            <Button
              onClick={saveCurriculum}
              disabled={isSaving}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  커리큘럼 저장하기
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
