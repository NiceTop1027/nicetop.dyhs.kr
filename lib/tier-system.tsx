import type React from "react"
import { Crown, Flame, Shield, Sparkles } from "lucide-react"

// 티어 타입 정의
export interface Tier {
  id: string
  name: string
  minPoints: number
  color: string
  icon: string // 아이콘 이름
  description: string
}

// 티어 목록 (낮은 티어부터 높은 티어 순)
export const TIERS: Tier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    color: "#CD7F32",
    icon: "Shield",
    description: "보안의 세계에 첫 발을 내딛은 초보자",
  },
  {
    id: "silver",
    name: "Silver",
    minPoints: 500,
    color: "#C0C0C0",
    icon: "Shield",
    description: "기본적인 보안 지식을 갖춘 도전자",
  },
  {
    id: "gold",
    name: "Gold",
    minPoints: 1500,
    color: "#FFD700",
    icon: "Shield",
    description: "다양한 보안 문제를 해결할 수 있는 실력자",
  },
  {
    id: "platinum",
    name: "Platinum",
    minPoints: 3000,
    color: "#E5E4E2",
    icon: "Shield",
    description: "높은 수준의 보안 기술을 보유한 전문가",
  },
  {
    id: "diamond",
    name: "Diamond",
    minPoints: 5000,
    color: "#B9F2FF",
    icon: "Shield",
    description: "뛰어난 보안 기술과 지식을 갖춘 정예 해커",
  },
  {
    id: "master",
    name: "Master",
    minPoints: 8000,
    color: "#9370DB",
    icon: "Crown",
    description: "최고 수준의 보안 전문가",
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    minPoints: 12000,
    color: "#FF4500",
    icon: "Sparkles",
    description: "전설적인 해킹 실력을 갖춘 그랜드마스터",
  },
  {
    id: "legend",
    name: "Legend",
    minPoints: 20000,
    color: "#FF0000",
    icon: "Flame",
    description: "보안 세계의 살아있는 전설",
  },
]

// 포인트로 티어 계산
export function getTierByPoints(points: number): Tier {
  // 포인트에 해당하는 가장 높은 티어 찾기
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) {
      return TIERS[i]
    }
  }

  // 기본 티어 (Bronze)
  return TIERS[0]
}

// 티어 아이콘 가져오기
export function getTierIcon(iconName: string): React.ReactNode {
  switch (iconName) {
    case "Shield":
      return <Shield className="h-5 w-5" />
    case "Crown":
      return <Crown className="h-5 w-5" />
    case "Sparkles":
      return <Sparkles className="h-5 w-5" />
    case "Flame":
      return <Flame className="h-5 w-5" />
    default:
      return <Shield className="h-5 w-5" />
  }
}

// 다음 티어 정보 가져오기
export function getNextTier(currentTier: Tier): Tier | null {
  const currentIndex = TIERS.findIndex((tier) => tier.id === currentTier.id)

  // 이미 최고 티어인 경우
  if (currentIndex === TIERS.length - 1) {
    return null
  }

  return TIERS[currentIndex + 1]
}

// 티어 진행 상황 계산 (다음 티어까지의 진행률, 0-100)
export function calculateTierProgress(points: number, currentTier: Tier): number {
  const nextTier = getNextTier(currentTier)

  // 이미 최고 티어인 경우
  if (!nextTier) {
    return 100
  }

  const currentMin = currentTier.minPoints
  const nextMin = nextTier.minPoints
  const range = nextMin - currentMin
  const progress = points - currentMin

  return Math.min(100, Math.floor((progress / range) * 100))
}
