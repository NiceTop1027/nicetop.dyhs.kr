import type { Timestamp } from "firebase/firestore"

// 레벨 시스템 타입 정의
export interface UserLevel {
  level: number
  currentExp: number
  requiredExp: number
  totalExp: number
}

// 경험치 획득 이벤트 타입
export interface ExpEvent {
  userId: string
  amount: number
  reason: string
  timestamp: Timestamp
  category: "wargame" | "ctf" | "daily" | "achievement"
}

// 레벨별 필요 경험치 계산 (레벨이 올라갈수록 필요 경험치 증가)
export function calculateRequiredExp(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1))
}

// 총 경험치로 레벨 계산
export function calculateLevelFromExp(totalExp: number): UserLevel {
  let level = 1
  let expRemaining = totalExp
  let requiredForNext = calculateRequiredExp(level)

  while (expRemaining >= requiredForNext) {
    expRemaining -= requiredForNext
    level++
    requiredForNext = calculateRequiredExp(level)
  }

  return {
    level,
    currentExp: expRemaining,
    requiredExp: requiredForNext,
    totalExp,
  }
}

// 워게임 문제 해결 시 획득 경험치 계산
export function calculateWargameExp(difficulty: string, points: number): number {
  // 난이도별 경험치 배율 조정
  const difficultyMultiplier = difficulty === "초급" ? 1 : difficulty === "중급" ? 2 : difficulty === "고급" ? 3.5 : 1

  // 기본 경험치 + 점수 기반 보너스 + 난이도 보너스
  const baseExp = 15
  const pointsBonus = Math.floor(points * 0.2)
  const difficultyBonus = Math.floor(baseExp * (difficultyMultiplier - 1))

  return baseExp + pointsBonus + difficultyBonus
}

// CTF 대회 참여 시 획득 경험치 계산
export function calculateCtfExp(position: number, totalParticipants: number, points: number): number {
  // 순위에 따른 보너스 (더 큰 보상으로 조정)
  let positionBonus = 0
  if (position === 1)
    positionBonus = 150 // 1등
  else if (position === 2)
    positionBonus = 100 // 2등
  else if (position === 3)
    positionBonus = 80 // 3등
  else if (position <= 5)
    positionBonus = 50 // 4-5등
  else if (position <= 10)
    positionBonus = 30 // 6-10등
  else positionBonus = 20 // 참가 보너스

  // 참가자 수에 따른 보너스 (참가자가 많을수록 더 많은 경험치)
  const participantBonus = Math.min(80, totalParticipants * 0.8)

  // 획득 점수에 따른 경험치 (비율 증가)
  const pointsExp = Math.floor(points * 0.3)

  return positionBonus + participantBonus + pointsExp
}

// 일일 로그인 보너스
export function calculateDailyLoginExp(consecutiveDays: number): number {
  // 연속 로그인 일수에 따라 보너스 증가 (최대 7일까지)
  const baseExp = 5
  const bonus = Math.min(consecutiveDays, 7)
  return baseExp + bonus
}
