// 사용자 생성 문제 타입
export interface UserQuestion {
  id: string
  type: "code" | "quiz" | "fill-blank" | "short-answer"
  title: string
  description?: string
  content: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  createdBy: string
  createdByName: string
  createdAt: { toDate: () => Date }
  isApproved: boolean
  likes: number
  likedBy: string[]
  reports: string[]
  explanation?: string

  // 코딩 문제 관련
  language?: string
  initialCode?: string
  solution?: string
  testCases?: TestCase[]

  // 객관식/주관식 관련
  options?: string[]
  correctAnswer?: string | number
}

export interface TestCase {
  input: string
  expectedOutput: string
  description?: string
}

// 사용자 문제 제출 답안
export interface UserQuestionSubmission {
  id: string
  questionId: string
  userId: string
  userAnswer: string | number
  isCorrect: boolean
  submittedAt: { toDate: () => Date }
  executionResult?: {
    passed: boolean
    testResults: TestResult[]
    error?: string
  }
}

export interface TestResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
}
