"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Heart,
  Flag,
  Code,
  Database,
  Terminal,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Clock,
} from "lucide-react"
import { doc, updateDoc, increment, getDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { UserQuestion } from "@/lib/curriculum-types"

interface UserQuestionDisplayProps {
  question: UserQuestion
  onQuestionUpdate: (question: UserQuestion) => void
}

const LANGUAGE_ICONS = {
  c: Code,
  cpp: Code,
  python: Code,
  java: Code,
  javascript: Code,
  shell: Terminal,
  sql: Database,
  go: Code,
  rust: Code,
  php: Code,
}

const LANGUAGE_NAMES = {
  c: "C",
  cpp: "C++",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
  shell: "Linux Shell",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  php: "PHP",
}

export function UserQuestionDisplay({ question, onQuestionUpdate }: UserQuestionDisplayProps) {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [userAnswer, setUserAnswer] = useState<any>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [userLiked, setUserLiked] = useState(false)
  const [userCode, setUserCode] = useState("")

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  useEffect(() => {
    if (question.type === "coding" && question.starterCode) {
      setUserCode(question.starterCode)
    }
  }, [question])

  useEffect(() => {
    // 사용자가 이미 좋아요를 눌렀는지 확인
    const checkUserLike = async () => {
      if (!user?.uid) return

      try {
        const questionDoc = await getDoc(doc(db, "user_questions", question.id))
        const data = questionDoc.data()
        const likedUsers = data?.likedUsers || []
        setUserLiked(likedUsers.includes(user.uid))
      } catch (error) {
        console.error("Error checking user like:", error)
      }
    }

    checkUserLike()
  }, [question.id, user?.uid])

  const handleLike = async () => {
    if (!user?.uid) return

    try {
      const questionRef = doc(db, "user_questions", question.id)

      if (userLiked) {
        // 좋아요 취소
        await updateDoc(questionRef, {
          likes: increment(-1),
          likedUsers: arrayRemove(user.uid),
        })
      } else {
        // 좋아요 추가
        await updateDoc(questionRef, {
          likes: increment(1),
          likedUsers: arrayUnion(user.uid),
        })
      }

      setUserLiked(!userLiked)

      const updatedQuestion = {
        ...question,
        likes: question.likes + (userLiked ? -1 : 1),
      }
      onQuestionUpdate(updatedQuestion)
    } catch (error) {
      console.error("Error updating like:", error)
      toast({
        title: "오류 발생",
        description: "좋아요 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleReport = async () => {
    if (!user?.uid) return

    try {
      const questionRef = doc(db, "user_questions", question.id)
      await updateDoc(questionRef, {
        reports: increment(1),
      })

      toast({
        title: "신고 완료",
        description: "문제가 신고되었습니다. 검토 후 처리하겠습니다.",
      })
    } catch (error) {
      console.error("Error reporting question:", error)
      toast({
        title: "신고 오류",
        description: "신고 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const runCode = async () => {
    if (!userCode.trim()) {
      toast({
        title: "코드 없음",
        description: "실행할 코드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsRunning(true)
    setRunResult(null)

    try {
      // 실제 구현에서는 서버에서 안전하게 코드를 실행해야 함
      // 여기서는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const testResults =
        question.testCases?.map((testCase, index) => {
          // 간단한 시뮬레이션 로직
          const isCorrect = Math.random() > 0.3 // 70% 확률로 성공

          return {
            index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: isCorrect ? testCase.expectedOutput : "Wrong output",
            passed: isCorrect,
            description: testCase.description,
          }
        }) || []

      const totalTests = testResults.length
      const passedTests = testResults.filter((result) => result.passed).length

      setRunResult({
        success: true,
        testResults,
        passedTests,
        totalTests,
        message: `${passedTests}/${totalTests} 테스트 통과`,
      })
    } catch (error) {
      setRunResult({
        success: false,
        error: "코드 실행 중 오류가 발생했습니다.",
        message: "컴파일 오류 또는 런타임 오류",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const submitAnswer = async () => {
    if (!user?.uid) return

    setIsSubmitting(true)

    try {
      let isCorrect = false
      let submittedAnswer = userAnswer

      switch (question.type) {
        case "multiple_choice":
          isCorrect = userAnswer === question.correctAnswer
          break
        case "coding":
          // 코딩 문제는 모든 테스트 케이스를 통과해야 정답
          if (runResult && runResult.passedTests === runResult.totalTests) {
            isCorrect = true
            submittedAnswer = userCode
          }
          break
        case "fill_in_blank":
          isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()
          break
        case "essay":
          // 주관식은 제출만 하고 정답 여부는 표시하지 않음
          isCorrect = true
          break
      }

      // 답안 제출 기록 (선택사항)
      // await addDoc(collection(db, "user_answers"), {
      //   questionId: question.id,
      //   userId: user.uid,
      //   answer: submittedAnswer,
      //   isCorrect,
      //   submittedAt: serverTimestamp(),
      // })

      toast({
        title: isCorrect ? "정답입니다! 🎉" : "틀렸습니다 😅",
        description: isCorrect ? "훌륭합니다!" : "다시 한 번 시도해보세요.",
        variant: isCorrect ? "default" : "destructive",
      })

      setShowAnswer(true)
    } catch (error) {
      console.error("Error submitting answer:", error)
      toast({
        title: "제출 오류",
        description: "답안 제출 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestionContent = () => {
    switch (question.type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                  userAnswer === index
                    ? "bg-blue-900/50 border border-blue-700"
                    : "bg-gray-800/30 border border-gray-700/50 hover:bg-gray-700/30"
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={index}
                  checked={userAnswer === index}
                  onChange={() => setUserAnswer(index)}
                  className="mr-3"
                />
                <span className="text-gray-200">{option}</span>
                {showAnswer && question.correctAnswer === index && (
                  <CheckCircle className="ml-auto h-5 w-5 text-green-400" />
                )}
              </label>
            ))}
          </div>
        )

      case "coding":
        const LanguageIcon = question.language && LANGUAGE_ICONS[question.language as keyof typeof LANGUAGE_ICONS]
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {LanguageIcon && <LanguageIcon className="h-4 w-4" />}
              <span>언어: {question.language && LANGUAGE_NAMES[question.language as keyof typeof LANGUAGE_NAMES]}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">코드 작성</label>
              <Textarea
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                className="font-mono text-sm min-h-[300px] bg-gray-900/50"
                placeholder="여기에 코드를 작성하세요..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={runCode} disabled={isRunning} className="bg-green-600 hover:bg-green-700">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    실행 중...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    코드 실행
                  </>
                )}
              </Button>
            </div>

            {/* 실행 결과 */}
            {runResult && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-md">
                <div className="flex items-center gap-2 mb-3">
                  {runResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`font-medium ${runResult.success ? "text-green-400" : "text-red-400"}`}>
                    {runResult.message}
                  </span>
                </div>

                {runResult.testResults && (
                  <div className="space-y-2">
                    {runResult.testResults.map((result: any) => (
                      <div
                        key={result.index}
                        className={`p-3 rounded border ${
                          result.passed ? "bg-green-900/20 border-green-700/50" : "bg-red-900/20 border-red-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-sm font-medium">테스트 케이스 {result.index + 1}</span>
                          {result.description && <span className="text-xs text-gray-400">- {result.description}</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                          <div>
                            <div className="text-gray-400 mb-1">입력:</div>
                            <div className="bg-gray-800 p-2 rounded">{result.input}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 mb-1">예상 출력:</div>
                            <div className="bg-gray-800 p-2 rounded">{result.expectedOutput}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 mb-1">실제 출력:</div>
                            <div className={`p-2 rounded ${result.passed ? "bg-green-900/30" : "bg-red-900/30"}`}>
                              {result.actualOutput}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {runResult.error && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-700/50 rounded">
                    <div className="text-red-400 text-sm font-mono">{runResult.error}</div>
                  </div>
                )}
              </div>
            )}

            {/* 테스트 케이스 정보 */}
            {question.testCases && question.testCases.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">테스트 케이스</h4>
                <div className="space-y-2">
                  {question.testCases.slice(0, 2).map((testCase, index) => (
                    <div key={index} className="bg-gray-800/30 p-3 rounded border border-gray-700/50">
                      <div className="text-xs text-gray-400 mb-1">테스트 케이스 {index + 1}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <div className="text-gray-400 mb-1">입력:</div>
                          <div className="bg-gray-900/50 p-2 rounded">{testCase.input}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">출력:</div>
                          <div className="bg-gray-900/50 p-2 rounded">{testCase.expectedOutput}</div>
                        </div>
                      </div>
                      {testCase.description && <div className="text-xs text-gray-400 mt-1">{testCase.description}</div>}
                    </div>
                  ))}
                  {question.testCases.length > 2 && (
                    <div className="text-xs text-gray-400 text-center py-2">
                      그 외 {question.testCases.length - 2}개의 숨겨진 테스트 케이스가 있습니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case "fill_in_blank":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/30 rounded border border-gray-700/50">
              <div className="text-gray-200 whitespace-pre-wrap">{question.question}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">답:</label>
              <input
                type="text"
                value={userAnswer || ""}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-md text-white focus:border-blue-500 focus:outline-none"
                placeholder="답을 입력하세요"
              />
            </div>
          </div>
        )

      case "essay":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/30 rounded border border-gray-700/50">
              <div className="text-gray-200 whitespace-pre-wrap">{question.question}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">답안:</label>
              <Textarea
                value={userAnswer || ""}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="min-h-[150px]"
                placeholder="답안을 작성하세요..."
              />
            </div>
          </div>
        )

      default:
        return <div className="text-gray-400">지원되지 않는 문제 유형입니다.</div>
    }
  }

  const renderAnswer = () => {
    if (!showAnswer) return null

    switch (question.type) {
      case "multiple_choice":
        return (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700/50 rounded-md">
            <h4 className="font-medium text-green-400 mb-2">정답</h4>
            <p className="text-green-200">
              {question.correctAnswer !== undefined && question.options?.[question.correctAnswer]}
            </p>
          </div>
        )

      case "fill_in_blank":
        return (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700/50 rounded-md">
            <h4 className="font-medium text-green-400 mb-2">정답</h4>
            <p className="text-green-200">{question.correctAnswer}</p>
          </div>
        )

      case "essay":
        return (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-md">
            <h4 className="font-medium text-blue-400 mb-2">예시 답안</h4>
            <p className="text-blue-200 whitespace-pre-wrap">{question.sampleAnswer}</p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={`${
                  question.type === "multiple_choice"
                    ? "bg-blue-900/50 text-blue-300 border-blue-700"
                    : question.type === "coding"
                      ? "bg-green-900/50 text-green-300 border-green-700"
                      : question.type === "fill_in_blank"
                        ? "bg-yellow-900/50 text-yellow-300 border-yellow-700"
                        : "bg-purple-900/50 text-purple-300 border-purple-700"
                }`}
              >
                {question.type === "multiple_choice"
                  ? "객관식"
                  : question.type === "coding"
                    ? "코딩"
                    : question.type === "fill_in_blank"
                      ? "빈칸 채우기"
                      : "주관식"}
              </Badge>
              {question.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-600">
                  {tag}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-white text-lg mb-2">{question.title}</CardTitle>
            <p className="text-gray-300 text-sm">{question.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{question.createdByName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{question.createdAt?.toDate().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!user}
              className={`text-gray-400 hover:text-red-400 ${userLiked ? "text-red-400" : ""}`}
            >
              <Heart className={`h-4 w-4 mr-1 ${userLiked ? "fill-current" : ""}`} />
              {question.likes || 0}
            </Button>
            {user && (
              <Button variant="ghost" size="sm" onClick={handleReport} className="text-gray-400 hover:text-yellow-400">
                <Flag className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnswer(!showAnswer)}
              className="text-gray-400 hover:text-blue-400"
            >
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? "답 숨기기" : "답 보기"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {renderQuestionContent()}

        {question.explanation && showAnswer && (
          <div className="mt-4 p-4 bg-gray-800/30 rounded border border-gray-700/50">
            <h4 className="font-medium text-gray-300 mb-2">해설</h4>
            <p className="text-gray-200 whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        {renderAnswer()}

        {!showAnswer && (
          <div className="flex justify-end pt-4 border-t border-gray-700/50">
            <Button
              onClick={submitAnswer}
              disabled={
                isSubmitting ||
                !userAnswer ||
                (question.type === "coding" && (!runResult || runResult.passedTests !== runResult.totalTests))
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                "답안 제출"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
