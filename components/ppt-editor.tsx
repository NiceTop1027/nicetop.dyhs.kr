"use client"

import { Separator } from "@/components/ui/separator"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Slide } from "@/lib/curriculum-types"
import { cn } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { FileUploader } from "@/components/file-uploader"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  ArrowLeft,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileText,
  Upload,
  Download,
} from "lucide-react"
import { PPTViewer } from "@/components/ppt-viewer"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"

interface PPTEditorProps {
  initialSlides?: Slide[]
  onSave: (slides: Slide[]) => void
  title: string
}

// 드래그 가능한 슬라이드 아이템 컴포넌트
function SortableSlideItem({ slide, index, isActive, onClick, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: slide.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "p-3 rounded-md cursor-pointer hover:bg-muted transition-colors",
        isActive ? "bg-primary/10 border border-primary/30" : "border",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" onClick={onClick}>
          <div
            className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium"
            {...listeners}
          >
            {index + 1}
          </div>
          <p className="text-sm font-medium truncate">{slide.title || `슬라이드 ${index + 1}`}</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[300px]">
            <DialogHeader>
              <DialogTitle>슬라이드 관리</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Button variant="outline" className="justify-start" onClick={onMoveUp}>
                <ChevronUp className="mr-2 h-4 w-4" />
                위로 이동
              </Button>
              <Button variant="outline" className="justify-start" onClick={onMoveDown}>
                <ChevronDown className="mr-2 h-4 w-4" />
                아래로 이동
              </Button>
              <Button variant="outline" className="justify-start" onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                복제
              </Button>
              <Button variant="destructive" className="justify-start" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {slide.imageUrl && (
        <div className="mt-2 h-12 overflow-hidden rounded">
          <img src={slide.imageUrl || "/placeholder.svg"} alt={slide.title} className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  )
}

// 템플릿 타입 정의
interface SlideTemplate {
  id: string
  name: string
  preview: string
  content: string
}

export function PPTEditor({ initialSlides = [], onSave, title }: PPTEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(
    initialSlides.length > 0
      ? initialSlides
      : [
          {
            id: uuidv4(),
            title: "슬라이드 1",
            content: "<p>내용을 입력하세요.</p>",
            order: 0,
          },
        ],
  )
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTab, setActiveTab] = useState("edit")
  const [previewMode, setPreviewMode] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [textColor, setTextColor] = useState("#000000")
  const [fontSize, setFontSize] = useState(16)
  const [alignment, setAlignment] = useState("left")
  const [darkMode, setDarkMode] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 슬라이드 템플릿
  const slideTemplates: SlideTemplate[] = [
    {
      id: "title",
      name: "제목 슬라이드",
      preview: "/placeholder.svg?height=100&width=150",
      content:
        "<h1 style='font-size: 2.5em; text-align: center; margin-bottom: 0.5em;'>프레젠테이션 제목</h1><p style='text-align: center; font-size: 1.2em;'>부제목 또는 설명을 입력하세요</p>",
    },
    {
      id: "content",
      name: "내용 슬라이드",
      preview: "/placeholder.svg?height=100&width=150",
      content:
        "<h2 style='font-size: 1.8em; margin-bottom: 0.5em;'>슬라이드 제목</h2><ul><li>첫 번째 항목</li><li>두 번째 항목</li><li>세 번째 항목</li></ul>",
    },
    {
      id: "image",
      name: "이미지 슬라이드",
      preview: "/placeholder.svg?height=100&width=150",
      content: "<h2 style='font-size: 1.8em; margin-bottom: 0.5em;'>이미지 제목</h2><p>이미지 설명을 입력하세요.</p>",
    },
    {
      id: "quote",
      name: "인용구 슬라이드",
      preview: "/placeholder.svg?height=100&width=150",
      content:
        "<blockquote style='font-size: 1.5em; font-style: italic; border-left: 4px solid #ccc; padding-left: 1em;'>인용구를 입력하세요.</blockquote><p style='text-align: right;'>- 출처</p>",
    },
    {
      id: "comparison",
      name: "비교 슬라이드",
      preview: "/placeholder.svg?height=100&width=150",
      content:
        "<h2 style='font-size: 1.8em; margin-bottom: 0.5em;'>비교 제목</h2><div style='display: flex; justify-content: space-between;'><div style='width: 48%;'><h3>항목 1</h3><p>설명을 입력하세요.</p></div><div style='width: 48%;'><h3>항목 2</h3><p>설명을 입력하세요.</p></div></div>",
    },
  ]

  // 슬라이드 추가
  const addSlide = () => {
    const newSlide: Slide = {
      id: uuidv4(),
      title: `슬라이드 ${slides.length + 1}`,
      content: "<p>내용을 입력하세요.</p>",
      order: slides.length,
    }
    setSlides([...slides, newSlide])
    setActiveSlide(slides.length)
  }

  // 템플릿으로 슬라이드 추가
  const addSlideFromTemplate = (templateId: string) => {
    const template = slideTemplates.find((t) => t.id === templateId)
    if (!template) return

    const newSlide: Slide = {
      id: uuidv4(),
      title: `${template.name}`,
      content: template.content,
      order: slides.length,
    }
    setSlides([...slides, newSlide])
    setActiveSlide(slides.length)
  }

  // 슬라이드 복제
  const duplicateSlide = (index: number) => {
    const slideToClone = slides[index]
    const newSlide: Slide = {
      ...slideToClone,
      id: uuidv4(),
      title: `${slideToClone.title} (복사본)`,
      order: slides.length,
    }

    const newSlides = [...slides]
    newSlides.splice(index + 1, 0, newSlide)

    // 순서 재조정
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx,
    }))

    setSlides(reorderedSlides)
    setActiveSlide(index + 1)
  }

  // 슬라이드 삭제
  const deleteSlide = (index: number) => {
    if (slides.length <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 1개의 슬라이드가 필요합니다.",
        variant: "destructive",
      })
      return
    }

    const newSlides = slides.filter((_, idx) => idx !== index)

    // 순서 재조정
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx,
    }))

    setSlides(reorderedSlides)

    // 활성 슬라이드 조정
    if (activeSlide >= newSlides.length) {
      setActiveSlide(newSlides.length - 1)
    }
  }

  // 슬라이드 위로 이동
  const moveSlideUp = (index: number) => {
    if (index === 0) return

    const newSlides = [...slides]
    const temp = newSlides[index]
    newSlides[index] = newSlides[index - 1]
    newSlides[index - 1] = temp

    // 순서 재조정
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx,
    }))

    setSlides(reorderedSlides)
    setActiveSlide(index - 1)
  }

  // 슬라이드 아래로 이동
  const moveSlideDown = (index: number) => {
    if (index === slides.length - 1) return

    const newSlides = [...slides]
    const temp = newSlides[index]
    newSlides[index] = newSlides[index + 1]
    newSlides[index + 1] = temp

    // 순서 재조정
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx,
    }))

    setSlides(reorderedSlides)
    setActiveSlide(index + 1)
  }

  // 드래그 앤 드롭으로 슬라이드 순서 변경
  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = slides.findIndex((slide) => slide.id === active.id)
      const newIndex = slides.findIndex((slide) => slide.id === over.id)

      const newSlides = [...slides]
      const [movedSlide] = newSlides.splice(oldIndex, 1)
      newSlides.splice(newIndex, 0, movedSlide)

      // 순서 재조정
      const reorderedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        order: idx,
      }))

      setSlides(reorderedSlides)
      setActiveSlide(newIndex)
    }
  }

  // 슬라이드 제목 변경
  const updateSlideTitle = (index: number, title: string) => {
    const newSlides = [...slides]
    newSlides[index] = {
      ...newSlides[index],
      title,
    }
    setSlides(newSlides)
  }

  // 슬라이드 내용 변경
  const updateSlideContent = (index: number, content: string) => {
    const newSlides = [...slides]
    newSlides[index] = {
      ...newSlides[index],
      content,
    }
    setSlides(newSlides)
  }

  // 슬라이드 이미지 업로드
  const handleImageUpload = (index: number, url: string) => {
    const newSlides = [...slides]
    newSlides[index] = {
      ...newSlides[index],
      imageUrl: url,
    }
    setSlides(newSlides)
  }

  // 텍스트 스타일 적용
  const applyTextStyle = (style: string) => {
    const currentContent = slides[activeSlide].content
    let newContent = currentContent

    switch (style) {
      case "bold":
        newContent = `<strong>${getSelectedText()}</strong>`
        break
      case "italic":
        newContent = `<em>${getSelectedText()}</em>`
        break
      case "underline":
        newContent = `<u>${getSelectedText()}</u>`
        break
      default:
        break
    }

    // 실제로는 RichTextEditor에서 처리하므로 여기서는 생략
    console.log(`Applying ${style} to selected text`)
  }

  // 선택된 텍스트 가져오기 (예시 함수)
  const getSelectedText = () => {
    return window.getSelection()?.toString() || ""
  }

  // 슬라이드 가져오기
  const importSlides = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedSlides = JSON.parse(event.target?.result as string)
        if (Array.isArray(importedSlides) && importedSlides.length > 0) {
          setSlides(importedSlides)
          toast({
            title: "가져오기 성공",
            description: `${importedSlides.length}개의 슬라이드를 가져왔습니다.`,
          })
        } else {
          throw new Error("유효하지 않은 슬라이드 데이터")
        }
      } catch (error) {
        toast({
          title: "가져오기 실패",
          description: "유효하지 않은 파일 형식입니다.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  // 슬라이드 내보내기
  const exportSlides = () => {
    const dataStr = JSON.stringify(slides, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `${title.replace(/\s+/g, "-").toLowerCase()}-slides.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  // 변경사항 저장
  const handleSave = () => {
    onSave(slides)
    toast({
      title: "저장 완료",
      description: "슬라이드가 저장되었습니다.",
    })
  }

  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            편집으로 돌아가기
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            저장하기
          </Button>
        </div>
        <PPTViewer slides={slides} title={title} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title} 편집</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(true)}>
            <Eye className="mr-2 h-4 w-4" />
            미리보기
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            저장하기
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 슬라이드 목록 */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">슬라이드 목록</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={slides.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
                  {slides.map((slide, index) => (
                    <SortableSlideItem
                      key={slide.id}
                      slide={slide}
                      index={index}
                      isActive={activeSlide === index}
                      onClick={() => setActiveSlide(index)}
                      onMoveUp={() => moveSlideUp(index)}
                      onMoveDown={() => moveSlideDown(index)}
                      onDuplicate={() => duplicateSlide(index)}
                      onDelete={() => deleteSlide(index)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    슬라이드 추가
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={addSlide}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>빈 슬라이드</span>
                  </DropdownMenuItem>
                  {slideTemplates.map((template) => (
                    <DropdownMenuItem key={template.id} onClick={() => addSlideFromTemplate(template.id)}>
                      <Image className="mr-2 h-4 w-4" />
                      <span>{template.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={importSlides}>
                  <Upload className="mr-2 h-4 w-4" />
                  가져오기
                </Button>
                <Button variant="outline" className="flex-1" onClick={exportSlides}>
                  <Download className="mr-2 h-4 w-4" />
                  내보내기
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* 슬라이드 편집 */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">슬라이드 {activeSlide + 1} 편집</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="edit">내용 편집</TabsTrigger>
                  <TabsTrigger value="media">미디어</TabsTrigger>
                  <TabsTrigger value="style">스타일</TabsTrigger>
                  <TabsTrigger value="layout">레이아웃</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slide-title">슬라이드 제목</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slide-title"
                        value={slides[activeSlide]?.title || ""}
                        onChange={(e) => updateSlideTitle(activeSlide, e.target.value)}
                        placeholder="슬라이드 제목을 입력하세요"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateSlideTitle(activeSlide, "")}
                        title="제목 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slide-content">슬라이드 내용</Label>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyTextStyle("bold")}>
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => applyTextStyle("italic")}
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => applyTextStyle("underline")}
                        >
                          <Underline className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment("left")}>
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment("center")}>
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment("right")}>
                          <AlignRight className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <List className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <RichTextEditor
                      value={slides[activeSlide]?.content || ""}
                      onChange={(value) => updateSlideContent(activeSlide, value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-4">
                  <div className="space-y-2">
                    <Label>슬라이드 이미지</Label>
                    {slides[activeSlide]?.imageUrl ? (
                      <div className="space-y-2">
                        <div className="relative w-full h-48 border rounded-md overflow-hidden">
                          <img
                            src={slides[activeSlide].imageUrl || "/placeholder.svg"}
                            alt="Slide image"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex justify-between">
                          <Button variant="outline" size="sm" onClick={() => handleImageUpload(activeSlide, "")}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            이미지 삭제
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <FileUploader
                        onUploadComplete={(url) => handleImageUpload(activeSlide, url)}
                        acceptedFileTypes={["image/*"]}
                        maxFileSizeMB={5}
                        uploadPath={`curriculum/slides/${slides[activeSlide].id}`}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="background-color">배경 색상</Label>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor }} />
                        <Input
                          id="background-color"
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="text-color">텍스트 색상</Label>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: textColor }} />
                        <Input
                          id="text-color"
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-size">글자 크기: {fontSize}px</Label>
                    <Slider
                      id="font-size"
                      min={10}
                      max={36}
                      step={1}
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-align">텍스트 정렬</Label>
                    <Select value={alignment} onValueChange={setAlignment}>
                      <SelectTrigger id="text-align">
                        <SelectValue placeholder="정렬 방식 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">왼쪽</SelectItem>
                        <SelectItem value="center">가운데</SelectItem>
                        <SelectItem value="right">오른쪽</SelectItem>
                        <SelectItem value="justify">양쪽 정렬</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                    <Label htmlFor="dark-mode">다크 모드</Label>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4">
                  <div className="space-y-2">
                    <Label>레이아웃 템플릿</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {slideTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => {
                            // 현재 슬라이드의 제목은 유지하고 내용만 템플릿으로 변경
                            const newSlides = [...slides]
                            newSlides[activeSlide] = {
                              ...newSlides[activeSlide],
                              content: template.content,
                            }
                            setSlides(newSlides)
                          }}
                        >
                          <CardContent className="p-2">
                            <div className="aspect-video bg-muted rounded-sm flex items-center justify-center mb-2">
                              <img
                                src={template.preview || "/placeholder.svg"}
                                alt={template.name}
                                className="w-full h-full object-cover rounded-sm"
                              />
                            </div>
                            <p className="text-xs font-medium text-center">{template.name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-css">커스텀 CSS</Label>
                    <Textarea
                      id="custom-css"
                      placeholder=".slide-content { padding: 20px; }"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      고급 사용자를 위한 옵션입니다. 슬라이드에 적용할 CSS를 입력하세요.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
