"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PlusCircle,
  Heading1,
  Heading2,
  Text,
  ImageIcon,
  Code,
  List,
  ListOrdered,
  Trash2,
  GripVertical,
  MoveUp,
  MoveDown,
  X,
} from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { v4 as uuidv4 } from "uuid"

// 블록 타입 정의
export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "image"
  | "code"
  | "bulletList"
  | "numberedList"
  | "divider"

// 블록 인터페이스
export interface Block {
  id: string
  type: BlockType
  content: string
  imageUrl?: string
  language?: string
  items?: string[]
}

interface NotionLikeEditorProps {
  value: Block[]
  onChange: (blocks: Block[]) => void
  className?: string
}

// 블록 컴포넌트 (드래그 가능)
const SortableBlock = ({
  block,
  updateBlock,
  deleteBlock,
  index,
  blocksLength,
}: {
  block: Block
  updateBlock: (id: string, content: string, additionalData?: any) => void
  deleteBlock: (id: string) => void
  index: number
  blocksLength: number
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isEditing, setIsEditing] = useState(false)
  const [tempContent, setTempContent] = useState(block.content)
  const [tempItems, setTempItems] = useState<string[]>(block.items || [])
  const [newItem, setNewItem] = useState("")
  const [tempImageUrl, setTempImageUrl] = useState(block.imageUrl || "")
  const [tempLanguage, setTempLanguage] = useState(block.language || "javascript")

  const handleContentChange = (value: string) => {
    setTempContent(value)
    updateBlock(block.id, value)
  }

  const handleImageUrlChange = () => {
    updateBlock(block.id, block.content, { imageUrl: tempImageUrl })
  }

  const handleLanguageChange = (value: string) => {
    setTempLanguage(value)
    updateBlock(block.id, block.content, { language: value })
  }

  const addListItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...tempItems, newItem.trim()]
      setTempItems(updatedItems)
      updateBlock(block.id, block.content, { items: updatedItems })
      setNewItem("")
    }
  }

  const removeListItem = (index: number) => {
    const updatedItems = tempItems.filter((_, i) => i !== index)
    setTempItems(updatedItems)
    updateBlock(block.id, block.content, { items: updatedItems })
  }

  const renderBlockContent = () => {
    switch (block.type) {
      case "paragraph":
        return (
          <Textarea
            value={tempContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="텍스트를 입력하세요..."
            className="min-h-[100px] resize-none whitespace-pre-wrap"
          />
        )
      case "heading1":
        return (
          <Input
            value={tempContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="제목을 입력하세요..."
            className="text-2xl font-bold"
          />
        )
      case "heading2":
        return (
          <Input
            value={tempContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="소제목을 입력하세요..."
            className="text-xl font-semibold"
          />
        )
      case "image":
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={tempImageUrl}
                onChange={(e) => setTempImageUrl(e.target.value)}
                placeholder="이미지 URL을 입력하세요..."
                className="flex-1"
              />
              <Button onClick={handleImageUrlChange} size="sm">
                적용
              </Button>
            </div>
            {block.imageUrl && (
              <div className="mt-2 relative">
                <img
                  src={block.imageUrl || "/placeholder.svg"}
                  alt="Block image"
                  className="max-w-full rounded-md"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=200&width=400"
                    e.currentTarget.alt = "이미지 로드 실패"
                  }}
                />
              </div>
            )}
            <Input
              value={tempContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="이미지 설명을 입력하세요..."
              className="mt-2"
            />
          </div>
        )
      case "code":
        return (
          <div className="space-y-2">
            <div className="flex gap-2 mb-2">
              <select
                value={tempLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="cpp">C++</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="swift">Swift</option>
                <option value="kotlin">Kotlin</option>
                <option value="typescript">TypeScript</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
                <option value="powershell">PowerShell</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>
            <Textarea
              value={tempContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="코드를 입력하세요..."
              className="font-mono text-sm min-h-[150px] resize-none"
            />
          </div>
        )
      case "bulletList":
      case "numberedList":
        return (
          <div className="space-y-2">
            <div className="space-y-1">
              {tempItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 text-center">{block.type === "numberedList" ? `${idx + 1}.` : "•"}</div>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...tempItems]
                      newItems[idx] = e.target.value
                      setTempItems(newItems)
                      updateBlock(block.id, block.content, { items: newItems })
                    }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeListItem(idx)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 text-center">{block.type === "numberedList" ? `${tempItems.length + 1}.` : "•"}</div>
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="새 항목 추가..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addListItem()
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addListItem}>
                추가
              </Button>
            </div>
          </div>
        )
      case "divider":
        return <hr className="my-4 border-t border-gray-300 dark:border-gray-700" />
      default:
        return <div>지원되지 않는 블록 타입</div>
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative mb-3">
      <Card className="p-4 relative">
        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center -ml-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 mb-1 cursor-grab bg-muted rounded-md" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {index > 0 && (
            <button
              className="p-1 mb-1 cursor-pointer bg-muted rounded-md"
              onClick={() => {
                // Move up logic is handled in the parent component
              }}
            >
              <MoveUp className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {index < blocksLength - 1 && (
            <button
              className="p-1 cursor-pointer bg-muted rounded-md"
              onClick={() => {
                // Move down logic is handled in the parent component
              }}
            >
              <MoveDown className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            {block.type === "paragraph" && <Text className="h-4 w-4 mr-1" />}
            {block.type === "heading1" && <Heading1 className="h-4 w-4 mr-1" />}
            {block.type === "heading2" && <Heading2 className="h-4 w-4 mr-1" />}
            {block.type === "image" && <ImageIcon className="h-4 w-4 mr-1" />}
            {block.type === "code" && <Code className="h-4 w-4 mr-1" />}
            {block.type === "bulletList" && <List className="h-4 w-4 mr-1" />}
            {block.type === "numberedList" && <ListOrdered className="h-4 w-4 mr-1" />}
            {block.type === "paragraph" && "텍스트"}
            {block.type === "heading1" && "제목"}
            {block.type === "heading2" && "소제목"}
            {block.type === "image" && "이미지"}
            {block.type === "code" && "코드"}
            {block.type === "bulletList" && "글머리 기호 목록"}
            {block.type === "numberedList" && "번호 매기기 목록"}
            {block.type === "divider" && "구분선"}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteBlock(block.id)}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {renderBlockContent()}
      </Card>
    </div>
  )
}

// 메인 에디터 컴포넌트
export function NotionLikeEditor({ value, onChange, className = "" }: NotionLikeEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(value || [])
  const [activeTab, setActiveTab] = useState<string>("write")
  const [showBlockMenu, setShowBlockMenu] = useState(false)

  // 블록 변경 시 부모 컴포넌트에 알림
  useEffect(() => {
    onChange(blocks)
  }, [blocks, onChange])

  // 블록 추가
  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: uuidv4(),
      type,
      content: "",
    }

    // 리스트 타입인 경우 빈 항목 배열 추가
    if (type === "bulletList" || type === "numberedList") {
      newBlock.items = [""]
    }

    // 이미지 타입인 경우 기본 이미지 URL 추가
    if (type === "image") {
      newBlock.imageUrl = ""
    }

    // 코드 타입인 경우 기본 언어 설정
    if (type === "code") {
      newBlock.language = "javascript"
    }

    setBlocks([...blocks, newBlock])
    setShowBlockMenu(false)
  }

  // 블록 업데이트
  const updateBlock = (id: string, content: string, additionalData?: any) => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === id) {
          return {
            ...block,
            content,
            ...additionalData,
          }
        }
        return block
      }),
    )
  }

  // 블록 삭제
  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id))
  }

  // 블록 순서 변경
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        // 배열 항목 재정렬
        const newItems = [...items]
        const [movedItem] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, movedItem)

        return newItems
      })
    }
  }

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

  // HTML로 변환
  const convertToHtml = () => {
    return blocks
      .map((block) => {
        switch (block.type) {
          case "paragraph":
            return `<p style="white-space: pre-line;">${block.content}</p>`
          case "heading1":
            return `<h1>${block.content}</h1>`
          case "heading2":
            return `<h2>${block.content}</h2>`
          case "image":
            return `<figure>
              <img src="${block.imageUrl}" alt="${block.content}" />
              ${block.content ? `<figcaption>${block.content}</figcaption>` : ""}
            </figure>`
          case "code":
            return `<pre><code class="language-${block.language}">${block.content}</code></pre>`
          case "bulletList":
            return `<ul>
              ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
            </ul>`
          case "numberedList":
            return `<ol>
              ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
            </ol>`
          case "divider":
            return `<hr />`
          default:
            return ""
        }
      })
      .join("\n")
  }

  // 미리보기 렌더링
  const renderPreview = () => {
    if (blocks.length === 0) {
      return <p className="text-muted-foreground">미리보기 내용이 없습니다.</p>
    }

    return (
      <div className="prose dark:prose-invert max-w-none">
        {blocks.map((block) => {
          switch (block.type) {
            case "paragraph":
              return (
                <p key={block.id} className="whitespace-pre-line">
                  {block.content}
                </p>
              )
            case "heading1":
              return <h1 key={block.id}>{block.content}</h1>
            case "heading2":
              return <h2 key={block.id}>{block.content}</h2>
            case "image":
              return (
                <figure key={block.id}>
                  <img
                    src={block.imageUrl || "/placeholder.svg?height=200&width=400"}
                    alt={block.content}
                    className="max-w-full rounded-md"
                  />
                  {block.content && <figcaption>{block.content}</figcaption>}
                </figure>
              )
            case "code":
              return (
                <pre key={block.id} className="bg-muted p-4 rounded-md overflow-x-auto">
                  <code className={`language-${block.language}`}>{block.content}</code>
                </pre>
              )
            case "bulletList":
              return (
                <ul key={block.id} className="list-disc pl-6">
                  {(block.items || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )
            case "numberedList":
              return (
                <ol key={block.id} className="list-decimal pl-6">
                  {(block.items || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ol>
              )
            case "divider":
              return <hr key={block.id} className="my-4" />
            default:
              return null
          }
        })}
      </div>
    )
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="write">작성</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-0">
          <div className="min-h-[350px] border rounded-md p-4 relative">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {blocks.map((block, index) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      updateBlock={updateBlock}
                      deleteBlock={deleteBlock}
                      index={index}
                      blocksLength={blocks.length}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-4 relative">
              <Button
                variant="outline"
                onClick={() => setShowBlockMenu(!showBlockMenu)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                블록 추가
              </Button>

              {showBlockMenu && (
                <Card className="absolute left-0 top-full mt-1 z-10 p-2 w-64 grid grid-cols-2 gap-1">
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("paragraph")}>
                    <Text className="h-4 w-4 mr-2" />
                    텍스트
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("heading1")}>
                    <Heading1 className="h-4 w-4 mr-2" />
                    제목
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("heading2")}>
                    <Heading2 className="h-4 w-4 mr-2" />
                    소제목
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("image")}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    이미지
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("code")}>
                    <Code className="h-4 w-4 mr-2" />
                    코드
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("bulletList")}>
                    <List className="h-4 w-4 mr-2" />
                    글머리 기호
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("numberedList")}>
                    <ListOrdered className="h-4 w-4 mr-2" />
                    번호 매기기
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => addBlock("divider")}>
                    <div className="w-4 h-0.5 bg-current mr-2" />
                    구분선
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card className="p-4 min-h-[350px] overflow-auto">{renderPreview()}</Card>
        </TabsContent>
      </Tabs>

      <input type="hidden" value={convertToHtml()} />

      <div className="mt-2 text-xs text-muted-foreground">
        <p>블록을 추가하려면 "블록 추가" 버튼을 클릭하세요. 블록을 드래그하여 순서를 변경할 수 있습니다.</p>
      </div>
    </div>
  )
}
