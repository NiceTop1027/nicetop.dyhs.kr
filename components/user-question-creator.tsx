"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { X, Plus, Save, Code, Database, Terminal, Loader2, Eye, EyeOff } from "lucide-react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { UserQuestion } from "@/lib/curriculum-types"

interface UserQuestionCreatorProps {
  curriculumId: string
  stepId: string
  onQuestionCreated: (question: UserQuestion) => void
  onClose: () => void
}

const PROGRAMMING_LANGUAGES = [
  {
    value: "c",
    label: "C",
    icon: Code,
    template: "#include <stdio.h>\n\nint main() {\n    // 여기에 코드를 작성하세요\n    \n    return 0;\n}",
  },
  {
    value: "cpp",
    label: "C++",
    icon: Code,
    template:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성하세요\n    \n    return 0;\n}",
  },
  {
    value: "python",
    label: "Python",
    icon: Code,
    template: '# 여기에 코드를 작성하세요\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
  },
  {
    value: "java",
    label: "Java",
    icon: Code,
    template:
      "public class Main {\n    public static void main(String[] args) {\n        // 여기에 코드를 작성하세요\n        \n    }\n}",
  },
  {
    value: "javascript",
    label: "JavaScript",
    icon: Code,
    template: "// 여기에 코드를 작성하세요\n\nfunction main() {\n    \n}\n\nmain();",
  },
  {
    value: "shell",
    label: "Linux Shell",
    icon: Terminal,
    template: '#!/bin/bash\n\n# 여기에 쉘 명령어를 작성하세요\n\necho "Hello World"',
  },
  {
    value: "sql",
    label: "SQL",
    icon: Database,
    template: "-- 여기에 SQL 쿼리를 작성하세요\n\nSELECT * FROM table_name;",
  },
  {
    value: "go",
    label: "Go",
    icon: Code,
    template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // 여기에 코드를 작성하세요\n    \n}',
  },
  { value: "rust", label: "Rust", icon: Code, template: "fn main() {\n    // 여기에 코드를 작성하세요\n    \n}" },
  {
    value: "php",
    label: "PHP",
    icon: Code,
    template: '<?php\n// 여기에 PHP 코드를 작성하세요\n\necho "Hello World";\n?>',
  },
]

export function UserQuestionCreator({ curriculumId, stepId, onQuestionCreated, onClose }: UserQuestionCreatorProps) {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [questionType, setQuestionType] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 객관식 문제용 상태
  const [options, setOptions] = useState<string[]>(["", "", "", ""])
  const [correctAnswer, setCorrectAnswer] = useState<number>(0)

  // 코딩 문제용 상태
  const [language, setLanguage] = useState("")
  const [starterCode, setStarterCode] = useState("")
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "", description: "" }])

  // 빈칸 채우기용 상태
  const [fillInQuestion, setFillInQuestion] = useState("")
  const [fillInAnswer, setFillInAnswer] = useState("")

  // 주관식용 상태
  const [essayQuestion, setEssayQuestion] = useState("")
  const [essayAnswer, setEssayAnswer] = useState("")

  const [explanation, setExplanation] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  // 관리자 체크
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  if (!isAdmin) {
    return null
  }

  const selectedLanguage = PROGRAMMING_LANGUAGES.find((lang) => lang.value === language)

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    const langTemplate = PROGRAMMING_LANGUAGES.find((lang) => lang.value === value)?.template || ""
    setStarterCode(langTemplate)
  }

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      if (correctAnswer >= newOptions.length) {
        setCorrectAnswer(0)
      }
    }
  }

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", description: "" }])
  }

  const updateTestCase = (index: number, field: string, value: string) => {
    const newTestCases = [...testCases]
    newTestCases[index] = { ...newTestCases[index], [field]: value }
    setTestCases(newTestCases)
  }

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const validateForm = () => {
    if (!title.trim() || !description.trim() || !questionType) {
      toast({
        title: "필수 정보 누락",
        description: "제목, 설명, 문제 유형을 모두 입력해주세요.",
        variant: "destructive",
      })
      return false
    }

    switch (questionType) {
      case "multiple_choice":
        if (options.some((option) => !option.trim())) {
          toast({
            title: "선택지 오류",
            description: "모든 선택지를 입력해주세요.",
            variant: "destructive",
          })
          return false
        }
        break
      case "coding":
        if (!language || !starterCode.trim()) {
          toast({
            title: "코딩 문제 오류",
            description: "언어와 시작 코드를 설정해주세요.",
            variant: "destructive",
          })
          return false
        }
        if (testCases.some((tc) => !tc.input.trim() || !tc.expectedOutput.trim())) {
          toast({
            title: "테스트 케이스 오류",
            description: "모든 테스트 케이스의 입력과 출력을 입력해주세요.",
            variant: "destructive",
          })
          return false
        }
        break
      case "fill_in_blank":
        if (!fillInQuestion.trim() || !fillInAnswer.trim()) {
          toast({
            title: "빈칸 채우기 오류",
            description: "문제와 답을 모두 입력해주세요.",
            variant: "destructive",
          })
          return false
        }
        break
      case "essay":
        if (!essayQuestion.trim() || !essayAnswer.trim()) {
          toast({
            title: "주관식 문제 오류",
            description: "문제와 예시 답안을 모두 입력해주세요.",
            variant: "destructive",
          })
          return false
        }
        break
    }

    return true
  }

  const handleCreate = async () => {
    if (!user?.uid || !validateForm()) return

    try {
      setIsCreating(true)

      const questionData: any = {
        title: title.trim(),
        description: description.trim(),
        type: questionType,
        explanation: explanation.trim(),
        tags: tags,
        curriculumId,
        stepId,
        createdBy: user.uid,
        createdByName: userProfile?.displayName || "관리자",
        createdAt: serverTimestamp(),
        isApproved: true, // 관리자가 만든 문제는 자동 승인
        likes: 0,
        reports: 0,
      }

      switch (questionType) {
        case "multiple_choice":
          questionData.options = options.filter((option) => option.trim())
          questionData.correctAnswer = correctAnswer
          break
        case "coding":
          questionData.language = language
          questionData.starterCode = starterCode
          questionData.testCases = testCases.filter((tc) => tc.input.trim() && tc.expectedOutput.trim())
          break
        case "fill_in_blank":
          questionData.question = fillInQuestion
          questionData.correctAnswer = fillInAnswer
          break
        case "essay":
          questionData.question = essayQuestion
          questionData.sampleAnswer = essayAnswer
          break
      }

      const docRef = await addDoc(collection(db, "user_questions"), questionData)

      const newQuestion: UserQuestion = {
        id: docRef.id,
        ...questionData,
        createdAt: { toDate: () => new Date() },
      }

      onQuestionCreated(newQuestion)

      toast({
        title: "문제 생성 완료! 🎉",
        description: "새로운 문제가 성공적으로 생성되었습니다.",
      })

      onClose()
    } catch (error) {
      console.error("Error creating question:", error)
      toast({
        title: "생성 오류",
        description: "문제 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const renderQuestionTypeContent = () => {
    switch (questionType) {
      case "multiple_choice":
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={correctAnswer === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCorrectAnswer(index)}
                    className={correctAnswer === index ? "bg-green-600 hover:bg-green-700 shrink-0" : "shrink-0"}
                  >
                    {index + 1}
                  </Button>
                  <Input
                    placeholder={`선택지 ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-300 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <Button type="button" variant="outline" onClick={addOption} className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                선택지 추가
              </Button>
            )}
          </div>
        )

      case "coding":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">프로그래밍 언어</label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="언어를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMMING_LANGUAGES.map((lang) => {
                    const IconComponent = lang.icon
                    return (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {lang.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">시작 코드</label>
              <Textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                className="font-mono text-sm min-h-[200px] resize-y"
                placeholder="학습자에게 제공할 기본 코드를 입력하세요..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">테스트 케이스</label>
                <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testCases.map((testCase, index) => (
                  <Card key={index} className="bg-gray-800/50 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">테스트 케이스 {index + 1}</span>
                        {testCases.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">입력</label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => updateTestCase(index, "input", e.target.value)}
                            className="font-mono text-sm resize-y"
                            rows={3}
                            placeholder="입력 값"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">예상 출력</label>
                          <Textarea
                            value={testCase.expectedOutput}
                            onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                            className="font-mono text-sm resize-y"
                            rows={3}
                            placeholder="예상 출력"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-400 mb-1">설명 (선택사항)</label>
                        <Input
                          value={testCase.description}
                          onChange={(e) => updateTestCase(index, "description", e.target.value)}
                          placeholder="이 테스트 케이스에 대한 설명"
                          className="text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )

      case "fill_in_blank":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">문제 (빈칸은 _____ 로 표시)</label>
              <Textarea
                value={fillInQuestion}
                onChange={(e) => setFillInQuestion(e.target.value)}
                placeholder="빈칸 문제를 입력하세요. 예: JavaScript에서 _____ 키워드는 변수를 선언할 때 사용됩니다."
                rows={4}
                className="resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">정답</label>
              <Input
                value={fillInAnswer}
                onChange={(e) => setFillInAnswer(e.target.value)}
                placeholder="정답을 입력하세요"
              />
            </div>
          </div>
        )

      case "essay":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">문제</label>
              <Textarea
                value={essayQuestion}
                onChange={(e) => setEssayQuestion(e.target.value)}
                placeholder="주관식 문제를 입력하세요..."
                rows={4}
                className="resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">예시 답안</label>
              <Textarea
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                placeholder="학습자들이 참고할 수 있는 예시 답안을 입력하세요..."
                rows={6}
                className="resize-y"
              />
            </div>
          </div>
        )

      default:
        return <div className="text-center py-8 text-gray-400">문제 유형을 선택해주세요</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-700 shadow-2xl">
          <CardHeader className="border-b border-gray-700 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">새 문제 만들기</CardTitle>
                <p className="text-gray-400 text-sm mt-1">학습자들을 위한 문제를 생성해보세요</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-gray-400 hover:text-white"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">{showPreview ? "편집" : "미리보기"}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {!showPreview ? (
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">제목</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="문제 제목을 입력하세요"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">문제 유형</label>
                    <Select value={questionType} onValueChange={setQuestionType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="유형을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">객관식</SelectItem>
                        <SelectItem value="coding">코딩 문제</SelectItem>
                        <SelectItem value="fill_in_blank">빈칸 채우기</SelectItem>
                        <SelectItem value="essay">주관식</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">문제 설명</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="문제에 대한 자세한 설명을 입력하세요..."
                    rows={3}
                    className="resize-y w-full"
                  />
                </div>

                {/* 문제 유형별 컨텐츠 */}
                <div className="border border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-4">문제 내용</h3>
                  {renderQuestionTypeContent()}
                </div>

                {/* 해설 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    해설 <span className="text-gray-500">(선택사항)</span>
                  </label>
                  <Textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="문제에 대한 자세한 해설을 입력하세요..."
                    rows={3}
                    className="resize-y w-full"
                  />
                </div>

                {/* 태그 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    태그 <span className="text-gray-500">(선택사항)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-blue-900/50 text-blue-300 border-blue-700">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-blue-200">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="태그 입력 후 엔터"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag} className="shrink-0 bg-transparent">
                      추가
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // 미리보기 영역
              <div className="space-y-4">
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                  <h3 className="text-lg font-semibold text-white mb-2">{title || "제목 없음"}</h3>
                  <p className="text-gray-300 mb-4">{description || "설명 없음"}</p>

                  <div className="bg-gray-900/50 p-4 rounded-md">
                    <div className="text-sm text-gray-400 mb-2">문제 유형: {questionType || "미선택"}</div>
                    {/* 여기에 실제 문제 미리보기 로직 추가 가능 */}
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-900/95 backdrop-blur-sm">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto bg-transparent">
                취소
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    문제 생성
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
