"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Code, Copy, ChevronDown, Check, Search, Settings, Maximize2, Minimize2 } from "lucide-react"

interface NotionCodeBlockProps {
  value: string
  onChange: (value: string) => void
  language?: string
  onLanguageChange?: (language: string) => void
  caption?: string
  onCaptionChange?: (caption: string) => void
  showLineNumbers?: boolean
  onLineNumbersChange?: (show: boolean) => void
  wordWrap?: boolean
  onWordWrapChange?: (wrap: boolean) => void
  className?: string
}

// 노션에서 지원하는 언어 목록
const NOTION_LANGUAGES = [
  { id: "plain", name: "Plain Text", aliases: ["text", "txt"] },
  { id: "javascript", name: "JavaScript", aliases: ["js", "jsx"] },
  { id: "typescript", name: "TypeScript", aliases: ["ts", "tsx"] },
  { id: "python", name: "Python", aliases: ["py"] },
  { id: "java", name: "Java", aliases: [] },
  { id: "c", name: "C", aliases: [] },
  { id: "cpp", name: "C++", aliases: ["c++", "cxx"] },
  { id: "csharp", name: "C#", aliases: ["cs"] },
  { id: "php", name: "PHP", aliases: [] },
  { id: "ruby", name: "Ruby", aliases: ["rb"] },
  { id: "go", name: "Go", aliases: ["golang"] },
  { id: "rust", name: "Rust", aliases: ["rs"] },
  { id: "swift", name: "Swift", aliases: [] },
  { id: "kotlin", name: "Kotlin", aliases: ["kt"] },
  { id: "scala", name: "Scala", aliases: [] },
  { id: "html", name: "HTML", aliases: ["htm"] },
  { id: "css", name: "CSS", aliases: [] },
  { id: "scss", name: "SCSS", aliases: ["sass"] },
  { id: "less", name: "Less", aliases: [] },
  { id: "json", name: "JSON", aliases: [] },
  { id: "xml", name: "XML", aliases: [] },
  { id: "yaml", name: "YAML", aliases: ["yml"] },
  { id: "markdown", name: "Markdown", aliases: ["md"] },
  { id: "sql", name: "SQL", aliases: [] },
  { id: "bash", name: "Bash", aliases: ["sh", "shell"] },
  { id: "powershell", name: "PowerShell", aliases: ["ps1"] },
  { id: "dockerfile", name: "Dockerfile", aliases: [] },
  { id: "nginx", name: "Nginx", aliases: [] },
  { id: "apache", name: "Apache", aliases: [] },
  { id: "git", name: "Git", aliases: [] },
  { id: "diff", name: "Diff", aliases: [] },
  { id: "latex", name: "LaTeX", aliases: ["tex"] },
  { id: "r", name: "R", aliases: [] },
  { id: "matlab", name: "MATLAB", aliases: [] },
  { id: "perl", name: "Perl", aliases: ["pl"] },
  { id: "lua", name: "Lua", aliases: [] },
  { id: "vim", name: "Vim", aliases: [] },
  { id: "makefile", name: "Makefile", aliases: ["make"] },
  { id: "cmake", name: "CMake", aliases: [] },
  { id: "graphql", name: "GraphQL", aliases: ["gql"] },
  { id: "protobuf", name: "Protocol Buffers", aliases: ["proto"] },
  { id: "toml", name: "TOML", aliases: [] },
  { id: "ini", name: "INI", aliases: [] },
  { id: "properties", name: "Properties", aliases: [] },
  { id: "log", name: "Log", aliases: [] },
]

// 언어별 구문 강조 설정
const SYNTAX_CONFIGS = {
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
      "typeof",
      "instanceof",
      "in",
      "of",
      "delete",
      "void",
      "null",
      "undefined",
      "true",
      "false",
    ],
    types: [
      "String",
      "Number",
      "Boolean",
      "Array",
      "Object",
      "Date",
      "RegExp",
      "Promise",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
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
      "?.",
      "??",
    ],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
    brackets: ["(", ")", "[", "]", "{", "}"],
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
      "typeof",
      "instanceof",
      "in",
      "of",
      "delete",
      "void",
      "null",
      "undefined",
      "true",
      "false",
      "interface",
      "type",
      "enum",
      "namespace",
      "declare",
      "readonly",
      "public",
      "private",
      "protected",
      "abstract",
      "implements",
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
      "Pick",
      "Omit",
      "Exclude",
      "Extract",
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
      "?.",
      "??",
      "?:",
      "as",
      "is",
    ],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
    brackets: ["(", ")", "[", "]", "{", "}", "<", ">"],
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
      "assert",
      "del",
      "raise",
    ],
    types: [
      "int",
      "float",
      "str",
      "bool",
      "list",
      "dict",
      "tuple",
      "set",
      "frozenset",
      "bytes",
      "bytearray",
      "None",
      "True",
      "False",
      "type",
      "object",
    ],
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
      "//=",
      "%=",
      "**=",
    ],
    strings: ['"', "'", '"""', "'''"],
    comments: ["#"],
    brackets: ["(", ")", "[", "]", "{", "}"],
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
      "textarea",
      "select",
      "option",
      "label",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "footer",
      "nav",
      "section",
      "article",
      "aside",
      "main",
    ],
    types: [],
    operators: ["="],
    strings: ['"', "'"],
    comments: ["<!--", "-->"],
    brackets: ["<", ">", "(", ")", "[", "]"],
  },
  css: {
    keywords: [
      "color",
      "background",
      "background-color",
      "background-image",
      "background-size",
      "background-position",
      "margin",
      "padding",
      "border",
      "border-radius",
      "width",
      "height",
      "max-width",
      "max-height",
      "min-width",
      "min-height",
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
      "font-weight",
      "text-align",
      "line-height",
      "z-index",
      "opacity",
      "transform",
      "transition",
      "animation",
    ],
    types: [
      "px",
      "em",
      "rem",
      "%",
      "vh",
      "vw",
      "vmin",
      "vmax",
      "ch",
      "ex",
      "cm",
      "mm",
      "in",
      "pt",
      "pc",
      "auto",
      "inherit",
      "initial",
      "unset",
      "none",
      "block",
      "inline",
      "inline-block",
      "flex",
      "grid",
      "absolute",
      "relative",
      "fixed",
      "sticky",
    ],
    operators: [":"],
    strings: ['"', "'"],
    comments: ["/*", "*/"],
    brackets: ["{", "}", "(", ")", "[", "]"],
  },
  json: {
    keywords: [],
    types: ["true", "false", "null"],
    operators: [":"],
    strings: ['"'],
    comments: [],
    brackets: ["{", "}", "[", "]"],
  },
}

// 고급 구문 강조 함수
const highlightSyntax = (code: string, language: string): string => {
  const config = SYNTAX_CONFIGS[language as keyof typeof SYNTAX_CONFIGS]
  if (!config) return escapeHtml(code)

  let highlighted = escapeHtml(code)

  // 1. 주석 강조 (가장 먼저)
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

  // 2. 문자열 강조
  if (language === "javascript" || language === "typescript") {
    // 템플릿 리터럴
    highlighted = highlighted.replace(/(`[^`]*`)/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    // 일반 문자열
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  } else if (language === "python") {
    highlighted = highlighted.replace(/("""[\s\S]*?""")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('''[\s\S]*?''')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  } else {
    config.strings.forEach((quote) => {
      if (quote === '"') {
        highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
      } else if (quote === "'") {
        highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
      }
    })
  }

  // 3. 키워드 강조
  config.keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-purple-500 dark:text-purple-400 font-semibold">${keyword}</span>`,
    )
  })

  // 4. 타입 강조
  config.types.forEach((type) => {
    const regex = new RegExp(`\\b${escapeRegex(type)}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-blue-500 dark:text-blue-400 font-medium">${type}</span>`,
    )
  })

  // 5. 숫자 강조
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-500 dark:text-orange-400">$&</span>')

  // 6. 함수 호출 강조
  highlighted = highlighted.replace(
    /(\w+)(\s*\()/g,
    '<span class="text-yellow-500 dark:text-yellow-400 font-medium">$1</span>$2',
  )

  // 7. 괄호 강조
  highlighted = highlighted.replace(
    /([{}[\]()])/g,
    '<span class="text-gray-300 dark:text-gray-500 font-bold">$1</span>',
  )

  // 8. HTML 태그 강조 (HTML 전용)
  if (language === "html") {
    highlighted = highlighted.replace(
      /(&lt;\/?)([\w-]+)([^&gt;]*?)(&gt;)/g,
      '<span class="text-red-500 dark:text-red-400">$1</span><span class="text-blue-600 dark:text-blue-400 font-semibold">$2</span><span class="text-green-600 dark:text-green-400">$3</span><span class="text-red-500 dark:text-red-400">$4</span>',
    )
  }

  // 9. CSS 속성 강조 (CSS 전용)
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

  // 10. JSON 키 강조 (JSON 전용)
  if (language === "json") {
    highlighted = highlighted.replace(
      /("[\w-]+")(\s*:)/g,
      '<span class="text-blue-500 dark:text-blue-400 font-medium">$1</span>$2',
    )
  }

  return highlighted
}

// HTML 이스케이프
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// 정규식 이스케이프
const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function NotionCodeBlock({
  value,
  onChange,
  language = "javascript",
  onLanguageChange,
  caption = "",
  onCaptionChange,
  showLineNumbers = true,
  onLineNumbersChange,
  wordWrap = false,
  onWordWrapChange,
  className = "",
}: NotionCodeBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [languageSearch, setLanguageSearch] = useState("")
  const [showLanguagePopover, setShowLanguagePopover] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // 줄 번호 계산
  const lines = value.split("\n")
  const lineCount = lines.length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  // 언어 필터링
  const filteredLanguages = NOTION_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      lang.id.toLowerCase().includes(languageSearch.toLowerCase()) ||
      lang.aliases.some((alias) => alias.toLowerCase().includes(languageSearch.toLowerCase())),
  )

  // 현재 언어 정보
  const currentLanguage = NOTION_LANGUAGES.find((lang) => lang.id === language) || NOTION_LANGUAGES[0]

  // 복사 기능
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("복사 실패:", err)
    }
  }, [value])

  // 언어 변경
  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      onLanguageChange?.(newLanguage)
      setShowLanguagePopover(false)
      setLanguageSearch("")
    },
    [onLanguageChange],
  )

  // 키보드 단축키 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Tab 처리 (들여쓰기)
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

            setTimeout(() => {
              textarea.setSelectionRange(start, start + unindentedLines.join("\n").length)
            }, 0)
          }
        } else {
          // Tab: 들여쓰기
          if (selectedText.includes("\n")) {
            const lines = selectedText.split("\n")
            const indentedLines = lines.map((line) => "  " + line)
            const newValue = value.substring(0, start) + indentedLines.join("\n") + value.substring(end)
            onChange(newValue)

            setTimeout(() => {
              textarea.setSelectionRange(start, start + indentedLines.join("\n").length)
            }, 0)
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

      if (bracketPairs[e.key]) {
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
          case "c":
            if (start === end) {
              // 선택된 텍스트가 없으면 전체 복사
              e.preventDefault()
              handleCopy()
            }
            break
          case "/":
            e.preventDefault()
            // 주석 토글
            const selectedLines = value.substring(start, end).split("\n")
            const commentPrefix = language === "python" ? "# " : "// "
            const commentedLines = selectedLines.map((line) => {
              if (line.startsWith(commentPrefix)) {
                return line.substring(commentPrefix.length)
              } else {
                return commentPrefix + line
              }
            })
            const newValue = value.substring(0, start) + commentedLines.join("\n") + value.substring(end)
            onChange(newValue)
            break
        }
      }
    },
    [value, onChange, language, handleCopy],
  )

  // 스크롤 동기화
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [])

  // 입력 처리
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <div
      className={`group relative ${isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900" : ""} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 노션 스타일 코드 블록 */}
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center gap-3">
            {/* 언어 선택 */}
            <Popover open={showLanguagePopover} onOpenChange={setShowLanguagePopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Code className="h-3 w-3 mr-1" />
                  {currentLanguage.name}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <Input
                      placeholder="언어 검색..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredLanguages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        lang.id === language
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="font-medium">{lang.name}</div>
                      {lang.aliases.length > 0 && (
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{lang.aliases.join(", ")}</div>
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* 캡션 */}
            {onCaptionChange && (
              <Input
                placeholder="캡션 추가..."
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                className="h-7 text-xs border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              />
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* 설정 */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 transition-opacity ${isHovered || showSettings ? "opacity-100" : "opacity-0"}`}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={showLineNumbers}
                      onChange={(e) => onLineNumbersChange?.(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    줄 번호 표시
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={wordWrap}
                      onChange={(e) => onWordWrapChange?.(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    자동 줄바꿈
                  </label>
                </div>
              </PopoverContent>
            </Popover>

            {/* 복사 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={`h-7 w-7 p-0 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>

            {/* 전체화면 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`h-7 w-7 p-0 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* 코드 영역 */}
        <div className="relative flex">
          {/* 줄 번호 */}
          {showLineNumbers && (
            <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-3 py-4 text-right select-none">
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className="text-xs leading-6 font-mono text-gray-400 dark:text-gray-500"
                  style={{ minWidth: "2ch" }}
                >
                  {num}
                </div>
              ))}
            </div>
          )}

          {/* 코드 에디터 */}
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
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordWrap: wordWrap ? "break-word" : "normal",
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="코드를 입력하세요..."
              className="w-full h-auto min-h-[200px] resize-none border-0 outline-none bg-transparent relative z-10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
                fontSize: "14px",
                lineHeight: "24px",
                padding: "16px",
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordWrap: wordWrap ? "break-word" : "normal",
                caretColor: "#000",
                height: `${Math.max(200, lineCount * 24 + 32)}px`,
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {/* 하단 상태바 */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{lineCount} 줄</span>
            <span>{value.length} 글자</span>
            {value.trim() && <span>{value.trim().split(/\s+/).length} 단어</span>}
          </div>
          <div className="flex items-center gap-2">
            <span>{currentLanguage.name}</span>
            <span>•</span>
            <span>UTF-8</span>
            {wordWrap && (
              <>
                <span>•</span>
                <span>자동 줄바꿈</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 캡션 */}
      {caption && <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">{caption}</div>}
    </div>
  )
}
