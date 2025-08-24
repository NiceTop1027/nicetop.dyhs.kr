import { Timestamp } from "firebase/firestore"

// CTF 대회 타입 정의
export interface CTFContest {
  id: string
  title: string
  description: string
  startTime: Timestamp
  endTime: Timestamp
  problemCount: number
  participants: string[]
  author: string
  authorId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  tags?: string[]
  isPublic?: boolean
  maxParticipants?: number
  registrationOpen?: boolean
  status?: "active" | "upcoming" | "completed"
  difficulty?: string
  teamSize?: number
  isPasswordProtected?: boolean
  password?: string
  authorizedUsers?: string[]
  bannerImage?: string // 배너 이미지 URL 필드 추가
}

// CTF 문제 타입 정의
export interface CTFProblem {
  id: string
  contestId: string
  title: string
  description: string
  category: string
  difficulty: string
  points: number
  flag: string
  hints?: string[]
  files?: string[]
  order: number
  author: string
  authorId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  solvedCount: number
  solvedBy: string[]
  isVisible?: boolean
  port?: number
}

// CTF 문제 데이터 정규화 함수
export function normalizeProblemData(data: any, id: string): CTFProblem {
  return {
    id: id,
    contestId: data.contestId || "",
    title: data.title || "",
    description: data.description || "",
    category: data.category || "기타",
    difficulty: data.difficulty || "중급",
    points: data.points || 0,
    flag: data.flag || "",
    hints: data.hints || [],
    files: data.files || [],
    order: data.order || 0,
    author: data.authorName || data.author || "",
    authorId: data.authorId || "",
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
    solvedCount: data.solvedCount || 0,
    solvedBy: data.solvedBy || [],
    isVisible: data.isVisible !== undefined ? data.isVisible : true,
    port: data.port || null,
  }
}

// CTF 대회 데이터 정규화 함수
export function normalizeContestData(data: any, id: string): CTFContest {
  // 현재 시간 기준으로 상태 계산
  const now = new Date()
  const startTime = data.startTime?.toDate() || new Date()
  const endTime = data.endTime?.toDate() || new Date()

  let status: "active" | "upcoming" | "completed" = "completed"

  if (now < startTime) {
    status = "upcoming"
  } else if (now >= startTime && now <= endTime) {
    status = "active"
  } else {
    status = "completed"
  }

  return {
    id: id,
    title: data.title || "",
    description: data.description || "",
    startTime: data.startTime || Timestamp.now(),
    endTime: data.endTime || Timestamp.now(),
    problemCount: data.problemCount || 0,
    participants: data.participants || [],
    author: data.author || "",
    authorId: data.authorId || "",
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
    tags: data.tags || [],
    isPublic: data.isPublic !== undefined ? data.isPublic : true,
    maxParticipants: data.maxParticipants || 0,
    registrationOpen: data.registrationOpen !== undefined ? data.registrationOpen : true,
    status: status,
    difficulty: data.difficulty || "medium",
    teamSize: data.teamSize || null,
    isPasswordProtected: data.isPasswordProtected || false,
    password: data.password || "",
    authorizedUsers: data.authorizedUsers || [],
    bannerImage: data.bannerImage || "", // 배너 이미지 URL 필드 추가
  }
}
