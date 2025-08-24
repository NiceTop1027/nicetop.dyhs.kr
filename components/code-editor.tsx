"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Maximize2, Minimize2, FileCode } from "lucide-react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  theme?: "dark" | "light"
  readOnly?: boolean
  showLineNumbers?: boolean
  autoComplete?: boolean
  className?: string
}

// 언어별 키워드 및 구문 정의
const LANGUAGE_CONFIGS = {
  javascript: {
    keywords: [
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
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "static",
    ],
    types: ["String", "Number", "Boolean", "Array", "Object", "Date", "RegExp", "Promise"],
    operators: [
      "===",
      "!==",
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "&&",
      "||",
      "!",
      "+",
      "-",
      "*",
      "/",
      "%",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
    ],
    brackets: ["(", ")", "[", "]", "{", "}"],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
  },
  typescript: {
    keywords: [
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
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "static",
      "interface",
      "type",
      "enum",
      "namespace",
      "declare",
      "readonly",
      "public",
      "private",
      "protected",
    ],
    types: [
      "string",
      "number",
      "boolean",
      "any",
      "void",
      "never",
      "unknown",
      "object",
      "Array",
      "Promise",
      "Record",
      "Partial",
      "Required",
    ],
    operators: [
      "===",
      "!==",
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "&&",
      "||",
      "!",
      "+",
      "-",
      "*",
      "/",
      "%",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
      "=>",
      "?:",
      "??",
    ],
    brackets: ["(", ")", "[", "]", "{", "}", "<", ">"],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
  },
  python: {
    keywords: [
      "def",
      "class",
      "import",
      "from",
      "return",
      "if",
      "else",
      "elif",
      "for",
      "while",
      "try",
      "except",
      "finally",
      "with",
      "as",
      "lambda",
      "yield",
      "global",
      "nonlocal",
      "pass",
      "break",
      "continue",
      "and",
      "or",
      "not",
      "in",
      "is",
    ],
    types: ["int", "float", "str", "bool", "list", "dict", "tuple", "set", "None", "True", "False"],
    operators: [
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "and",
      "or",
      "not",
      "+",
      "-",
      "*",
      "/",
      "//",
      "%",
      "**",
      "+=",
      "-=",
      "*=",
      "/=",
    ],
    brackets: ["(", ")", "[", "]", "{", "}"],
    strings: ['"', "'", '"""', "'''"],
    comments: ["#"],
  },
  html: {
    keywords: [
      "<!DOCTYPE",
      "html",
      "head",
      "body",
      "title",
      "meta",
      "link",
      "script",
      "style",
      "div",
      "span",
      "p",
      "a",
      "img",
      "ul",
      "ol",
      "li",
      "table",
      "tr",
      "td",
      "th",
      "form",
      "input",
      "button",
    ],
    types: [],
    operators: ["="],
    brackets: ["<", ">", "(", ")", "[", "]"],
    strings: ['"', "'"],
    comments: ["<!--", "-->"],
  },
  css: {
    keywords: [
      "color",
      "background",
      "background-color",
      "margin",
      "padding",
      "border",
      "width",
      "height",
      "display",
      "position",
      "top",
      "left",
      "right",
      "bottom",
      "flex",
      "grid",
      "font-size",
      "font-family",
      "text-align",
      "line-height",
    ],
    types: ["px", "em", "rem", "%", "vh", "vw", "auto", "inherit", "initial", "unset"],
    operators: [":"],
    brackets: ["{", "}", "(", ")", "[", "]"],
    strings: ['"', "'"],
    comments: ["/*", "*/"],
  },
}

// 자동완성 제안
const getAutocompleteSuggestions = (text: string, cursorPos: number, language: string) => {
  const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]
  if (!config) return []

  const beforeCursor = text.substring(0, cursorPos)
  const words = beforeCursor.split(/\s+/)
  const currentWord = words[words.length - 1]

  if (currentWord.length < 2) return []

  const suggestions = [...config.keywords, ...config.types].filter(
    (item) => item.toLowerCase().startsWith(currentWord.toLowerCase()) && item !== currentWord,
  )

  return suggestions.slice(0, 10)
}

// 고급 구문 강조
const highlightSyntax = (code: string, language: string): string => {
  const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]
  if (!config) return code

  let highlighted = code

  // HTML 이스케이프
  highlighted = highlighted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // 주석 강조 (가장 먼저)
  if (language === "javascript" || language === "typescript") {
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  } else if (language === "python") {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
  } else if (language === "html") {
    highlighted = highlighted.replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  } else if (language === "css") {
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  }

  // 문자열 강조
  config.strings.forEach((quote) => {
    if (quote === "`") {
      highlighted = highlighted.replace(/(`[^`]*`)/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    } else if (quote === '"') {
      highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    } else if (quote === "'") {
      highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    }
  })

  // 키워드 강조
  config.keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-purple-500 dark:text-purple-400 font-semibold">${keyword}</span>`,
    )
  })

  // 타입 강조
  config.types.forEach((type) => {
    const regex = new RegExp(`\\b${type}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-blue-500 dark:text-blue-400 font-medium">${type}</span>`,
    )
  })

  // 숫자 강조
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-500 dark:text-orange-400">$&</span>')

  // 함수 호출 강조
  highlighted = highlighted.replace(
    /(\w+)(\s*\()/g,
    '<span class="text-yellow-500 dark:text-yellow-400 font-medium">$1</span>$2',
  )

  // 괄호 강조
  highlighted = highlighted.replace(
    /([{}[\]()])/g,
    '<span class="text-gray-300 dark:text-gray-500 font-bold">$1</span>',
  )

  // HTML 태그 강조 (HTML 전용)
  if (language === "html") {
    highlighted = highlighted.replace(
      /(&lt;\/?)([\w-]+)([^&gt;]*?)(&gt;)/g,
      '<span class="text-red-500 dark:text-red-400">$1</span><span class="text-blue-600 dark:text-blue-400 font-semibold">$2</span><span class="text-green-600 dark:text-green-400">$3</span><span class="text-red-500 dark:text-red-400">$4</span>',
    )
  }

  // CSS 속성 강조 (CSS 전용)
  if (language === "css") {
    highlighted = highlighted.replace(
      /([\w-]+)(\s*:)/g,
      '<span class="text-blue-500 dark:text-blue-400 font-medium">$1</span>$2',
    )
    highlighted = highlighted.replace(
      /(:)(\s*[^;]+)(;)/g,
      '$1<span class="text-green-500 dark:text-green-400">$2</span>$3',
    )
  }

  return highlighted
}

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  theme = "dark",
  readOnly = false,
  showLineNumbers = true,
  autoComplete = true,
  className = "",
}: CodeEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // 줄 번호 계산
  const lineCount = value.split("\n").length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  // 자동완성 처리
  const handleAutoComplete = useCallback(
    (text: string, cursorPos: number) => {
      if (!autoComplete) return

      const suggestions = getAutocompleteSuggestions(text, cursorPos, language)
      setSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
      setSelectedSuggestion(0)
    },
    [language, autoComplete],
  )

  // 키 입력 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // 자동완성 네비게이션
      if (showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSelectedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1))
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setSelectedSuggestion((prev) => Math.max(prev - 1, 0))
          return
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault()
          const suggestion = suggestions[selectedSuggestion]
          if (suggestion) {
            const beforeCursor = value.substring(0, start)
            const afterCursor = value.substring(end)
            const words = beforeCursor.split(/\s+/)
            const currentWord = words[words.length - 1]
            const newValue =
              beforeCursor.substring(0, beforeCursor.length - currentWord.length) + suggestion + afterCursor
            onChange(newValue)
            setShowSuggestions(false)

            setTimeout(() => {
              const newPos = start - currentWord.length + suggestion.length
              textarea.setSelectionRange(newPos, newPos)
            }, 0)
          }
          return
        }
        if (e.key === "Escape") {
          setShowSuggestions(false)
          return
        }
      }

      // 탭 처리 (들여쓰기)
      if (e.key === "Tab") {
        e.preventDefault()
        const selectedText = value.substring(start, end)

        if (e.shiftKey) {
          // Shift+Tab: 내어쓰기
          if (selectedText.includes("\n")) {
            const lines = selectedText.split("\n")
            const unindentedLines = lines.map((line) => line.replace(/^ {2}/, ""))
            const newValue = value.substring(0, start) + unindentedLines.join("\n") + value.substring(end)
            onChange(newValue)
          }
        } else {
          // Tab: 들여쓰기
          if (selectedText.includes("\n")) {
            const lines = selectedText.split("\n")
            const indentedLines = lines.map((line) => "  " + line)
            const newValue = value.substring(0, start) + indentedLines.join("\n") + value.substring(end)
            onChange(newValue)
          } else {
            const newValue = value.substring(0, start) + "  " + value.substring(end)
            onChange(newValue)
            setTimeout(() => textarea.setSelectionRange(start + 2, start + 2), 0)
          }
        }
        return
      }

      // Enter 처리 (자동 들여쓰기)
      if (e.key === "Enter") {
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
        const newValue = value.substring(0, start) + "\n" + currentIndent + extraIndent + value.substring(end)
        onChange(newValue)

        setTimeout(() => {
          const newPos = start + 1 + currentIndent.length + extraIndent.length
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
        return
      }

      // 괄호 자동 완성
      const bracketPairs: { [key: string]: string } = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'",
        "`": "`",
      }

      if (bracketPairs[e.key] && !readOnly) {
        e.preventDefault()
        const selectedText = value.substring(start, end)

        if (selectedText) {
          const newValue = value.substring(0, start) + e.key + selectedText + bracketPairs[e.key] + value.substring(end)
          onChange(newValue)
          setTimeout(() => textarea.setSelectionRange(start + 1, start + 1 + selectedText.length), 0)
        } else {
          const newValue = value.substring(0, start) + e.key + bracketPairs[e.key] + value.substring(end)
          onChange(newValue)
          setTimeout(() => textarea.setSelectionRange(start + 1, start + 1), 0)
        }
        return
      }

      // Ctrl/Cmd 단축키
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "a":
            // 전체 선택은 기본 동작 허용
            break
          case "c":
            // 복사는 기본 동작 허용
            break
          case "v":
            // 붙여넣기는 기본 동작 허용
            break
          case "z":
            // 실행취소는 기본 동작 허용
            break
          case "/":
            e.preventDefault()
            // 주석 토글
            const selectedLines = value.substring(start, end).split("\n")
            const commentedLines = selectedLines.map((line) => {
              if (language === "python") {
                return line.startsWith("# ") ? line.substring(2) : "# " + line
              } else {
                return line.startsWith("// ") ? line.substring(3) : "// " + line
              }
            })
            const newValue = value.substring(0, start) + commentedLines.join("\n") + value.substring(end)
            onChange(newValue)
            break
        }
      }
    },
    [value, onChange, showSuggestions, suggestions, selectedSuggestion, language, readOnly],
  )

  // 입력 처리
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)
      setCursorPosition(e.target.selectionStart)

      // 자동완성 트리거
      if (autoComplete && !readOnly) {
        setTimeout(() => {
          handleAutoComplete(newValue, e.target.selectionStart)
        }, 100)
      }
    },
    [onChange, handleAutoComplete, autoComplete, readOnly],
  )

  // 스크롤 동기화
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [])

  // 복사 기능
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
  }, [value])

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""} ${className}`}>
      <Card
        className={`overflow-hidden ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
      >
        {/* 헤더 */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-b ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <FileCode className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {language}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 에디터 영역 */}
        <div className="relative">
          <div className="flex">
            {/* 줄 번호 */}
            {showLineNumbers && (
              <div
                className={`flex-shrink-0 px-3 py-4 text-right select-none ${theme === "dark" ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"} border-r ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
              >
                {lineNumbers.map((num) => (
                  <div key={num} className="text-xs leading-6 font-mono">
                    {num}
                  </div>
                ))}
              </div>
            )}

            {/* 코드 영역 */}
            <div className="flex-1 relative">
              {/* 구문 강조 오버레이 */}
              <div
                ref={highlightRef}
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
                  fontSize: "14px",
                  lineHeight: "24px",
                  padding: "16px",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  color: "transparent",
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightSyntax(value, language),
                }}
              />

              {/* 텍스트 에리어 */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                readOnly={readOnly}
                className={`w-full h-96 resize-none border-0 outline-none bg-transparent relative z-10 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
                  fontSize: "14px",
                  lineHeight: "24px",
                  padding: "16px",
                  caretColor: theme === "dark" ? "#fff" : "#000",
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              {/* 자동완성 팝업 */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className={`absolute z-20 mt-1 max-h-48 overflow-auto rounded-md border shadow-lg ${theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                  style={{
                    top: "100px", // 임시 위치
                    left: "100px", // 임시 위치
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`px-3 py-2 text-sm cursor-pointer ${
                        index === selectedSuggestion
                          ? theme === "dark"
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-900"
                          : theme === "dark"
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        // 클릭으로 자동완성 적용
                        const textarea = textareaRef.current
                        if (textarea) {
                          const start = textarea.selectionStart
                          const beforeCursor = value.substring(0, start)
                          const afterCursor = value.substring(start)
                          const words = beforeCursor.split(/\s+/)
                          const currentWord = words[words.length - 1]
                          const newValue =
                            beforeCursor.substring(0, beforeCursor.length - currentWord.length) +
                            suggestion +
                            afterCursor
                          onChange(newValue)
                          setShowSuggestions(false)
                        }
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 상태바 */}
        <div
          className={`flex items-center justify-between px-4 py-2 text-xs border-t ${theme === "dark" ? "border-gray-700 bg-gray-800 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600"}`}
        >
          <div className="flex items-center gap-4">
            <span>줄: {value.split("\n").length}</span>
            <span>글자: {value.length}</span>
            <span>커서: {cursorPosition}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{language.toUpperCase()}</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
