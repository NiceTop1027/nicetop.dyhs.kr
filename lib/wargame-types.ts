import { Timestamp } from "firebase/firestore"

// 워게임 문제 타입 정의
export interface WargameChallenge {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  level: number
  author: string
  authorId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  solvedCount: number
  solvedBy: string[] | Array<{ userId: string; username: string; solvedAt: Timestamp }>
  files?: Array<string | { name: string; url: string }>
  additionalResources?: Array<{ title: string; url: string; type: "link" | "code" }>
  port?: number
  flag: string
  isVisible?: boolean
}

// 레벨별 점수 계산 함수 - 내부적으로만 사용
export function calculatePointsByLevel(level: number): number {
  // 레벨에 따른 가중치 적용
  // 레벨이 높을수록 더 많은 점수를 받음
  const basePoints = 100
  const weights = {
    1: 1, // 100점
    2: 1.5, // 150점
    3: 2, // 200점
    4: 2.5, // 250점
    5: 3, // 300점
    6: 4, // 400점
    7: 5, // 500점
    8: 6, // 600점
    9: 8, // 800점
    10: 10, // 1000점
  }

  const weight = weights[level as keyof typeof weights] || 1
  return Math.round(basePoints * weight)
}

// 워게임 문제 데이터 정규화 함수 수정
export function normalizeWargameChallengeData(data: any, id: string): WargameChallenge {
  const level = typeof data.level === "number" && !isNaN(data.level) ? data.level : 5

  return {
    id: id,
    title: data.title || "",
    description: data.description || "",
    category: data.category || "기타",
    difficulty: data.difficulty || "중급",
    level: level,
    author: data.author || "",
    authorId: data.authorId || "",
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
    solvedCount: data.solvedCount || 0,
    solvedBy: data.solvedBy || [],
    files: data.files || [],
    additionalResources: data.additionalResources || [],
    port: data.port || null,
    flag: data.flag || "",
    isVisible: data.isVisible !== undefined ? data.isVisible : true,
  }
}
