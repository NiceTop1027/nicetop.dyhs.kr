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
import { ArrowLeft, Eye, Loader2, Save, Plus, Trash2, Move } from "lucide-react"
import Link from "next/link"
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { Curriculum, CurriculumCategory, CurriculumStep } from "@/lib/curriculum-types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MarkdownEditor } from "@/components/markdown-editor"
import { parseMarkdown } from "@/lib/markdown-parser"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { Badge } from "@/components/ui/badge"
import { FirebaseFileUploader } from "@/components/firebase-file-uploader"

export default function AdminCurriculumEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [content, setContent] = useState("")
  const [viewCount, setViewCount] = useState(0)
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [steps, setSteps] = useState<CurriculumStep[]>([])
  const [difficulty, setDifficulty] = useState<string>("Easy")
  const [showContentPreview, setShowContentPreview] = useState(false)

  const [categories, setCategories] = useState<CurriculumCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      // 카테고리 가져오기
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

      // 커리큘럼 가져오기
      const curriculumRef = doc(db, "curriculums", params.id)
      const curriculumSnap = await getDoc(curriculumRef)

      if (!curriculumSnap.exists()) {
        setError("존재하지 않는 커리큘럼입니다.")
        return
      }

      const curriculumData = curriculumSnap.data() as Curriculum

      // 폼 데이터 설정
      setTitle(curriculumData.title || "")
      setDescription(curriculumData.description || "")
      setCategory(curriculumData.category || "")
      setThumbnailUrl(curriculumData.thumbnailUrl || "")
      setTags(curriculumData.tags || [])
      setIsPublished(curriculumData.isPublished || false)
      setContent(curriculumData.content || "")
      setViewCount(curriculumData.viewCount || 0)
      setIsPasswordProtected(curriculumData.isPasswordProtected || false)
      setPassword(curriculumData.password || "")
      setSteps(curriculumData.steps || [])
      setDifficulty(curriculumData.difficulty || "Easy")
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      toast({
        title: "데이터 로딩 오류",
        description: `데이터를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }

    fetchData()
  }, [isAdmin, router, params.id])

  // 태그 추가
  const addTag = () => {
    if (!tagInput.trim()) return

    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
    }

    setTagInput("")
  }

  // 태그 삭제
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // 단계 추가
  const addStep = () => {
    setSteps((prevSteps) => [
      ...prevSteps,
      {
        id: Date.now().toString(), // 임시 ID 생성
        title: `단계 ${prevSteps.length + 1}`,
        content: `# 단계 ${prevSteps.length + 1}\n\n이 단계에서 학습할 내용을 입력하세요.\n\n## 학습 목표\n\n- 목표 1\n- 목표 2\n- 목표 3\n\n## 내용\n\n여기에 상세한 내용을 작성하세요.`,
        order: prevSteps.length,
        duration: "15분",
        description: `${prevSteps.length + 1}번째 단계입니다.`,
      },
    ])
  }

  // 단계 업데이트
  const updateStep = (id: string, field: string, value: string) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.id === id ? { ...step, [field]: value } : step)))
  }

  // 단계 삭제
  const removeStep = (id: string) => {
    setSteps((prevSteps) => prevSteps.filter((step) => step.id !== id))
  }

  // 단계 순서 변경
  const moveStep = (dragIndex: number, hoverIndex: number) => {
    const newSteps = [...steps]
    const draggedStep = newSteps[dragIndex]

    newSteps.splice(dragIndex, 1)
    newSteps.splice(hoverIndex, 0, draggedStep)

    setSteps(
      newSteps.map((step, index) => ({
        ...step,
        order: index,
      })),
    )
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }

    const items = Array.from(steps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSteps(
      items.map((step, index) => ({
        ...step,
        order: index,
      })),
    )
  }

  // 커리큘럼 저장
  const saveCurriculum = async () => {
    // 유효성 검사
    if (!title.trim()) {
      toast({
        title: "입력 오류",
        description: "제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "입력 오류",
        description: "카테고리를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      // 커리큘럼 데이터 생성
      const curriculumData = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
        thumbnailUrl,
        updatedAt: serverTimestamp(),
        isPublished,
        tags,
        viewCount,
        isPasswordProtected,
        password: isPasswordProtected ? password : "",
        steps: steps.map((step, index) => ({
          ...step,
          order: index,
        })),
        totalSteps: steps.length,
        difficulty,
      }

      // Firestore에 저장
      await updateDoc(doc(db, "curriculums", params.id), curriculumData)

      toast({
        title: "저장 완료",
        description: "커리큘럼이 성공적으로 저장되었습니다.",
      })

      // 커리큘럼 관리 페이지로 이동
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

  if (!isAdmin) {
    return null // 권한 없음 (useEffect에서 리다이렉트 처리)
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

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-center">
                <p className="text-lg font-medium text-red-400 mb-2">{error}</p>
                <p className="text-gray-400">요청하신 커리큘럼을 불러올 수 없습니다.</p>
                <div className="flex gap-4 mt-6 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    뒤로 가기
                  </Button>
                  <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">
                    다시 시도
                  </Button>
                </div>
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
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/curriculum">
                <Button variant="ghost" size="icon" className="hover:bg-gray-800 text-gray-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">커리큘럼 수정</h1>
                <p className="text-gray-400 mt-1">커리큘럼 정보와 내용을 마크다운으로 수정하세요.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/curriculum/${params.id}`}>
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent">
                  <Eye className="mr-2 h-4 w-4" />
                  미리보기
                </Button>
              </Link>
              <Button onClick={saveCurriculum} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
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
          </div>

          {/* 커리큘럼 기본 정보 */}
          <Card className="mb-8 bg-gray-900 border-gray-700">
            <CardHeader className="bg-gray-800/50">
              <CardTitle className="text-white">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-300">
                  제목
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="커리큘럼 제목을 입력하세요"
                  className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                />
              </div>

              <div className="grid gap-2">
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

              <div className="grid gap-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-300">
                  카테고리
                </Label>
                {categories.length > 0 ? (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="bg-gray-800 border-gray-600 text-white">
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
                  <div className="text-sm text-gray-400">
                    <p>등록된 카테고리가 없습니다.</p>
                    <Link href="/admin/curriculum/categories" className="text-blue-400 hover:underline">
                      카테고리 관리 페이지에서 카테고리를 추가해주세요.
                    </Link>
                  </div>
                )}
              </div>

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
                      className="h-40 w-auto object-cover rounded-md border border-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=160&width=240"
                        toast({
                          title: "이미지 로드 실패",
                          description: "유효한 이미지 URL을 입력해주세요.",
                          variant: "destructive",
                        })
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags" className="text-sm font-semibold text-gray-300">
                  태그
                </Label>
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
                    id="tags"
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
                  <Button type="button" onClick={addTag} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                    추가
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty" className="text-sm font-semibold text-gray-300">
                  난이도
                </Label>
                <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                  <SelectTrigger id="difficulty" className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="난이도 선택" />
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

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="passwordProtected"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                  <Label htmlFor="passwordProtected" className="text-sm font-semibold text-gray-300">
                    비밀번호 보호
                  </Label>
                  <span className="text-sm text-gray-400 ml-2">{isPasswordProtected ? "활성화됨" : "비활성화됨"}</span>
                </div>

                {isPasswordProtected && (
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-300">
                      비밀번호
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="커리큘럼 접근을 위한 비밀번호를 입력하세요"
                      className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-400">
                      이 비밀번호를 알고 있는 사용자만 커리큘럼에 접근할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="published" className="text-sm font-semibold text-gray-300">
                  공개 여부
                </Label>
                <span className="text-sm text-gray-400 ml-2">{isPublished ? "공개" : "비공개"}</span>
              </div>
            </CardContent>
          </Card>

          {/* 커리큘럼 소개 */}
          <Card className="mb-8 bg-gray-900 border-gray-700">
            <CardHeader className="bg-gray-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">커리큘럼 소개 (마크다운)</CardTitle>
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

          {/* 단계 편집 */}
          <Card className="mb-8 bg-gray-900 border-gray-700">
            <CardHeader className="bg-gray-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">단계 편집 (마크다운)</CardTitle>
                <Button onClick={addStep} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  단계 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {steps.map((step, index) => (
                        <Draggable key={step.id} draggableId={step.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border border-gray-600 rounded-md p-4 mb-4 last:mb-0 bg-gray-800"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <button {...provided.dragHandleProps}>
                                    <Move className="h-4 w-4 cursor-move text-gray-400" />
                                  </button>
                                  <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                                    단계 {index + 1}
                                  </Badge>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeStep(step.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid gap-4">
                                <div>
                                  <Label
                                    htmlFor={`step-title-${step.id}`}
                                    className="text-sm font-semibold text-gray-300"
                                  >
                                    제목
                                  </Label>
                                  <Input
                                    type="text"
                                    id={`step-title-${step.id}`}
                                    value={step.title}
                                    onChange={(e) => updateStep(step.id, "title", e.target.value)}
                                    placeholder="단계 제목"
                                    className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`step-description-${step.id}`}
                                    className="text-sm font-semibold text-gray-300"
                                  >
                                    설명
                                  </Label>
                                  <Textarea
                                    id={`step-description-${step.id}`}
                                    value={step.description || ""}
                                    onChange={(e) => updateStep(step.id, "description", e.target.value)}
                                    placeholder="단계 설명"
                                    rows={2}
                                    className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`step-content-${step.id}`}
                                    className="text-sm font-semibold text-gray-300"
                                  >
                                    내용 (마크다운)
                                  </Label>
                                  <MarkdownEditor
                                    value={step.content}
                                    onChange={(value) => updateStep(step.id, "content", value)}
                                    placeholder="단계 내용을 마크다운으로 작성하세요..."
                                    minHeight="300px"
                                    className="border-gray-600"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <Button onClick={saveCurriculum} disabled={isSaving} size="lg" className="bg-blue-600 hover:bg-blue-700">
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
