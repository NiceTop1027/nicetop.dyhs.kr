"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  ImageIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  EyeOff,
  Palette,
  Type,
  FileText,
  CheckSquare,
  ChevronDown,
  X,
  Undo,
  Redo,
  Search,
  Replace,
} from "lucide-react"

import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

// 미리보기용 구문 강조
const highlightCodeForPreview = (code: string, language: string): string => {
  // 간단한 구문 강조 (실제로는 더 복잡한 파서 사용)
  let highlighted = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // 키워드 강조
  const keywords = {
    javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class"],
    typescript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "interface",
      "type",
    ],
    python: ["def", "class", "import", "from", "return", "if", "else", "for", "while", "try", "except"],
  }

  const langKeywords = keywords[language as keyof typeof keywords] || []
  langKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g")
    highlighted = highlighted.replace(regex, `<span class="text-purple-400 font-semibold">${keyword}</span>`)
  })

  // 문자열 강조
  highlighted = highlighted.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="text-green-400">$1$2$1</span>')

  // 주석 강조
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="text-gray-500 italic">$1</span>')

  // 숫자 강조
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-400">$&</span>')

  return highlighted
}

function MarkdownEditor({
  value,
  onChange,
  placeholder = "마크다운으로 작성하세요...",
  minHeight = "400px",
  className = "",
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState("write")
  const [showToolbar, setShowToolbar] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [replaceTerm, setReplaceTerm] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [history, setHistory] = useState<string[]>([value])
  const [historyIndex, setHistoryIndex] = useState(0)

  // 히스토리 관리
  const addToHistory = useCallback(
    (newValue: string) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newValue)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex],
  )

  // 실행 취소
  const undo = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        onChange(history[newIndex])
      }
    },
    [historyIndex, history, onChange],
  )

  // 다시 실행
  const redo = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        onChange(history[newIndex])
      }
    },
    [historyIndex, history, onChange],
  )

  // 텍스트 삽입 함수
  const insertText = useCallback(
    (before: string, after = "", placeholder = "", e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)
      const textToInsert = selectedText || placeholder

      const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end)
      onChange(newText)
      addToHistory(newText)

      // 커서 위치 설정을 더 안정적으로 수정
      requestAnimationFrame(() => {
        if (textarea) {
          const newCursorPos = selectedText
            ? start + before.length + textToInsert.length + after.length
            : start + before.length
          textarea.setSelectionRange(newCursorPos, newCursorPos)
          textarea.focus()
        }
      })
    },
    [value, onChange, addToHistory],
  )

  // 줄 삽입 함수
  const insertLine = useCallback(
    (text: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const beforeCursor = value.substring(0, start)
      const afterCursor = value.substring(start)

      const lines = beforeCursor.split("\n")
      const currentLine = lines[lines.length - 1]
      const isAtLineStart = currentLine.trim() === ""

      const newText = beforeCursor + (isAtLineStart ? "" : "\n") + text + "\n" + afterCursor
      onChange(newText)
      addToHistory(newText)

      setTimeout(() => {
        const newCursorPos = start + (isAtLineStart ? 0 : 1) + text.length + 1
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)
    },
    [value, onChange, addToHistory],
  )

  // 키보드 단축키
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (e.key === "Tab") {
        e.preventDefault()
        e.stopPropagation()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)

        if (e.shiftKey) {
          const lines = selectedText.split("\n")
          const unindentedLines = lines.map((line) => line.replace(/^ {2}/, ""))
          const newText = value.substring(0, start) + unindentedLines.join("\n") + value.substring(end)
          onChange(newText)

          setTimeout(() => {
            textarea.setSelectionRange(start, start + unindentedLines.join("\n").length)
          }, 0)
        } else {
          if (selectedText.includes("\n")) {
            const lines = selectedText.split("\n")
            const indentedLines = lines.map((line) => "  " + line)
            const newText = value.substring(0, start) + indentedLines.join("\n") + value.substring(end)
            onChange(newText)

            setTimeout(() => {
              textarea.setSelectionRange(start, start + indentedLines.join("\n").length)
            }, 0)
          } else {
            insertText("  ")
          }
        }
        return
      }

      if (e.key === "Enter") {
        const start = textarea.selectionStart
        const beforeCursor = value.substring(0, start)
        const lines = beforeCursor.split("\n")
        const currentLine = lines[lines.length - 1]

        const indentMatch = currentLine.match(/^(\s*)/)
        const currentIndent = indentMatch ? indentMatch[1] : ""

        let extraIndent = ""
        if (currentLine.trim().endsWith("{") || currentLine.trim().endsWith(":")) {
          extraIndent = "  "
        }

        e.preventDefault()
        e.stopPropagation()
        insertText("\n" + currentIndent + extraIndent)
        return
      }

      const bracketPairs: { [key: string]: string } = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'",
        "`": "`",
      }

      if (bracketPairs[e.key]) {
        e.preventDefault()
        e.stopPropagation()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)

        if (selectedText) {
          insertText(e.key, bracketPairs[e.key], selectedText)
        } else {
          const newText = value.substring(0, start) + e.key + bracketPairs[e.key] + value.substring(end)
          onChange(newText)
          addToHistory(newText)

          requestAnimationFrame(() => {
            if (textarea) {
              textarea.setSelectionRange(start + 1, start + 1)
              textarea.focus()
            }
          })
        }
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault()
            e.stopPropagation()
            insertText("**", "**", "굵은 텍스트")
            break
          case "i":
            e.preventDefault()
            e.stopPropagation()
            insertText("*", "*", "기울임 텍스트")
            break
          case "u":
            e.preventDefault()
            e.stopPropagation()
            insertText("__", "__", "밑줄 텍스트")
            break
          case "k":
            e.preventDefault()
            e.stopPropagation()
            insertText("[", "](url)", "링크 텍스트")
            break
          case "z":
            e.preventDefault()
            e.stopPropagation()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case "f":
            e.preventDefault()
            e.stopPropagation()
            setShowSearch(!showSearch)
            break
          case "/":
            e.preventDefault()
            e.stopPropagation()
            insertText("```\n", "\n```", "코드")
            break
        }
      }
    },
    [insertText, undo, redo, showSearch, value, onChange],
  )

  // 검색 및 바꾸기
  const handleSearch = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (!searchTerm) return
      const textarea = textareaRef.current
      if (!textarea) return

      const text = textarea.value
      const index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), textarea.selectionStart)

      if (index !== -1) {
        textarea.setSelectionRange(index, index + searchTerm.length)
        textarea.focus()
      }
    },
    [searchTerm],
  )

  const handleReplace = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (!searchTerm || !replaceTerm) return
      const newValue = value.replace(new RegExp(searchTerm, "gi"), replaceTerm)
      onChange(newValue)
      addToHistory(newValue)
    },
    [value, searchTerm, replaceTerm, onChange, addToHistory],
  )

  // 파일 업로드 처리
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.target.files?.[0]
      if (!file) return

      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string
          insertText(`![${file.name}](${imageUrl})`)
        }
        reader.readAsDataURL(file)
      }
    },
    [insertText],
  )

  // 링크 삽입 핸들러
  const handleLinkInsert = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const text = (document.getElementById("link-text") as HTMLInputElement)?.value || "링크"
      const url = (document.getElementById("link-url") as HTMLInputElement)?.value || "url"
      insertText(`[${text}](${url})`)
    },
    [insertText],
  )

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* 도구모음 */}
      {showToolbar && (
        <div className="border-b p-2 bg-muted/50">
          <div className="flex flex-wrap items-center gap-1">
            {/* 실행 취소/다시 실행 */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="다시 실행 (Ctrl+Shift+Z)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* 헤딩 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" title="헤딩">
                  <Type className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={(e) => insertLine("# 제목 1", e)}
                  >
                    <Heading1 className="h-4 w-4 mr-2" />
                    제목 1
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={(e) => insertLine("## 제목 2", e)}
                  >
                    <Heading2 className="h-4 w-4 mr-2" />
                    제목 2
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={(e) => insertLine("### 제목 3", e)}
                  >
                    <Heading3 className="h-4 w-4 mr-2" />
                    제목 3
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* 텍스트 스타일 */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("**", "**", "굵은 텍스트", e)}
              title="굵게 (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("*", "*", "기울임 텍스트", e)}
              title="기울임 (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("__", "__", "밑줄 텍스트", e)}
              title="밑줄 (Ctrl+U)"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("~~", "~~", "취소선 텍스트", e)}
              title="취소선"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("`", "`", "인라인 코드", e)}
              title="인라인 코드"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertText("==", "==", "하이라이트", e)}
              title="하이라이트"
            >
              <Palette className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* 링크 및 이미지 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" title="링크 (Ctrl+K)">
                  <Link className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="link-text">링크 텍스트</Label>
                    <Input id="link-text" placeholder="링크 텍스트" />
                  </div>
                  <div>
                    <Label htmlFor="link-url">URL</Label>
                    <Input id="link-url" placeholder="https://example.com" />
                  </div>
                  <Button type="button" size="sm" onClick={handleLinkInsert}>
                    링크 삽입
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button type="button" variant="ghost" size="sm" title="이미지 업로드">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* 목록 */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertLine("- 목록 항목", e)}
              title="글머리 기호 목록"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertLine("1. 번호 목록", e)}
              title="번호 매기기 목록"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertLine("- [ ] 체크박스", e)}
              title="체크박스"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* 기타 */}
            <Button type="button" variant="ghost" size="sm" onClick={(e) => insertLine("> 인용구", e)} title="인용구">
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertLine("```javascript\n코드 블록\n```", e)}
              title="코드 블록 (Ctrl+/)"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={(e) => insertLine("---", e)} title="수평선">
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => insertLine("| 헤더1 | 헤더2 |\n|-------|-------|\n| 셀1   | 셀2   |", e)}
              title="테이블"
            >
              <Table className="h-4 w-4" />
            </Button>

            <div className="flex-1" />

            {/* 검색 */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowSearch(!showSearch)
              }}
              title="검색 (Ctrl+F)"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* 도구모음 토글 */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowToolbar(!showToolbar)
              }}
              title="도구모음 숨기기"
            >
              {showToolbar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* 검색 바 */}
          {showSearch && (
            <div className="mt-2 p-2 bg-background border rounded-md">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSearch()
                    }
                  }}
                />
                <Input
                  placeholder="바꿀 텍스트..."
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" onClick={handleReplace}>
                  <Replace className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowSearch(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 에디터 영역 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
          <TabsTrigger value="write" className="rounded-none">
            작성
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-none">
            미리보기
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-0 border-0 p-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              addToHistory(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="resize-none border-0 focus-visible:ring-0 rounded-none font-mono text-sm leading-relaxed
    bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
    placeholder:text-gray-500 dark:placeholder:text-gray-400"
            style={{
              minHeight,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
              fontSize: "14px",
              lineHeight: "1.6",
              tabSize: "2",
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0 border-0 p-0">
          <Card className="border-0 rounded-none bg-white dark:bg-gray-900">
            <CardContent className="p-6 bg-white dark:bg-gray-900" style={{ minHeight }}>
              {value ? (
                <div
                  className="prose prose-lg max-w-none
            prose-headings:text-gray-900 dark:prose-headings:text-white
            prose-p:text-gray-800 dark:prose-p:text-gray-200
            prose-strong:text-gray-900 dark:prose-strong:text-white
            prose-code:text-gray-900 dark:prose-code:text-gray-100
            prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800
            prose-pre:text-gray-900 dark:prose-pre:text-gray-100
            prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
            prose-li:text-gray-800 dark:prose-li:text-gray-200
            prose-a:text-blue-600 dark:prose-a:text-blue-400
            prose-table:text-gray-800 dark:prose-table:text-gray-200"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(value),
                  }}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">미리보기 내용이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 하단 상태바 */}
      <div className="border-t px-3 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>줄: {value.split("\n").length}</span>
          <span>글자: {value.length}</span>
          <span>단어: {value.trim() ? value.trim().split(/\s+/).length : 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>마크다운 지원</span>
          <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">Ctrl+B</kbd>
          <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">Ctrl+I</kbd>
          <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">Ctrl+K</kbd>
          <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">Ctrl+/</kbd>
        </div>
      </div>

      {/* 코드 복사 스크립트 */}
      <script
        dangerouslySetInnerHTML={{
          __html: generateCopyScript(),
        }}
      />
    </div>
  )
}

// 기존 default export 유지
export default MarkdownEditor

// 명명된 내보내기도 추가
export { MarkdownEditor }
