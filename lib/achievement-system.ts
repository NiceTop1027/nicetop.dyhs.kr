import type React from "react"
import type { Timestamp } from "firebase/firestore"
import { Cpu, FileText, Flag, Globe, Lock, Server, Shield, Star, Terminal, Trophy, Zap } from "lucide-react"

// 업적 타입 정의
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string // 아이콘 이름
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  category: "wargame" | "ctf" | "community" | "general"
  condition: string // 업적 달성 조건 설명
  expReward: number // 업적 달성 시 획득 경험치
  hidden?: boolean // 숨겨진 업적 여부
}

// 업적 획득 이벤트 타입
export interface AchievementUnlock {
  userId: string
  achievementId: string
  unlockedAt: Timestamp
}

// 업적 목록
export const ACHIEVEMENTS: Achievement[] = [
  // 워게임 관련 업적
  {
    id: "first_blood",
    name: "First Blood",
    description: "첫 번째로 문제를 해결한 사용자",
    icon: "Zap",
    rarity: "rare",
    category: "wargame",
    condition: "워게임 문제를 가장 먼저 해결하세요",
    expReward: 50,
  },
  {
    id: "challenge_master",
    name: "Challenge Master",
    description: "모든 카테고리에서 최소 1개 이상의 문제 해결",
    icon: "Star",
    rarity: "uncommon",
    category: "wargame",
    condition: "모든 워게임 카테고리에서 최소 1개 이상의 문제를 해결하세요",
    expReward: 100,
  },
  {
    id: "web_expert",
    name: "Web Hacking Expert",
    description: "웹 해킹 카테고리의 모든 문제 해결",
    icon: "Globe",
    rarity: "epic",
    category: "wargame",
    condition: "웹 해킹 카테고리의 모든 문제를 해결하세요",
    expReward: 200,
  },
  {
    id: "crypto_wizard",
    name: "Crypto Wizard",
    description: "암호학 카테고리의 모든 문제 해결",
    icon: "Lock",
    rarity: "epic",
    category: "wargame",
    condition: "암호학 카테고리의 모든 문제를 해결하세요",
    expReward: 200,
  },
  {
    id: "reverse_engineer",
    name: "Reverse Engineer",
    description: "리버싱 카테고리의 모든 문제 해결",
    icon: "Cpu",
    rarity: "epic",
    category: "wargame",
    condition: "리버싱 카테고리의 모든 문제를 해결하세요",
    expReward: 200,
  },
  {
    id: "forensics_detective",
    name: "Forensics Detective",
    description: "포렌식 카테고리의 모든 문제 해결",
    icon: "FileText",
    rarity: "epic",
    category: "wargame",
    condition: "포렌식 카테고리의 모든 문제를 해결하세요",
    expReward: 200,
  },
  {
    id: "pwn_master",
    name: "Pwn Master",
    description: "시스템 해킹 카테고리의 모든 문제 해결",
    icon: "Terminal",
    rarity: "epic",
    category: "wargame",
    condition: "시스템 해킹 카테고리의 모든 문제를 해결하세요",
    expReward: 200,
  },
  {
    id: "wargame_novice",
    name: "Wargame Novice",
    description: "워게임 문제 5개 해결",
    icon: "Shield",
    rarity: "common",
    category: "wargame",
    condition: "워게임 문제를 5개 해결하세요",
    expReward: 30,
  },
  {
    id: "wargame_adept",
    name: "Wargame Adept",
    description: "워게임 문제 20개 해결",
    icon: "Shield",
    rarity: "uncommon",
    category: "wargame",
    condition: "워게임 문제를 20개 해결하세요",
    expReward: 100,
  },
  {
    id: "wargame_expert",
    name: "Wargame Expert",
    description: "워게임 문제 50개 해결",
    icon: "Shield",
    rarity: "rare",
    category: "wargame",
    condition: "워게임 문제를 50개 해결하세요",
    expReward: 200,
  },

  // CTF 관련 업적
  {
    id: "ctf_participant",
    name: "CTF Participant",
    description: "CTF 대회 참가",
    icon: "Flag",
    rarity: "common",
    category: "ctf",
    condition: "CTF 대회에 참가하세요",
    expReward: 20,
  },
  {
    id: "ctf_solver",
    name: "CTF Solver",
    description: "CTF 대회에서 최소 1문제 해결",
    icon: "Flag",
    rarity: "common",
    category: "ctf",
    condition: "CTF 대회에서 최소 1문제를 해결하세요",
    expReward: 30,
  },
  {
    id: "ctf_champion",
    name: "CTF Champion",
    description: "CTF 대회에서 1위 달성",
    icon: "Trophy",
    rarity: "epic",
    category: "ctf",
    condition: "CTF 대회에서 1위를 달성하세요",
    expReward: 300,
  },
  {
    id: "ctf_podium",
    name: "CTF Podium",
    description: "CTF 대회에서 3위 안에 입상",
    icon: "Trophy",
    rarity: "rare",
    category: "ctf",
    condition: "CTF 대회에서 3위 안에 입상하세요",
    expReward: 150,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "CTF 대회에서 만점 획득",
    icon: "Star",
    rarity: "legendary",
    category: "ctf",
    condition: "CTF 대회에서 만점을 획득하세요",
    expReward: 500,
  },

  // 커뮤니티 관련 업적
  {
    id: "first_post",
    name: "First Post",
    description: "첫 번째 게시글 작성",
    icon: "FileText",
    rarity: "common",
    category: "community",
    condition: "커뮤니티에 첫 번째 게시글을 작성하세요",
    expReward: 10,
  },
  {
    id: "helpful_hacker",
    name: "Helpful Hacker",
    description: "커뮤니티에 10개 이상의 유용한 게시글 작성",
    icon: "Star",
    rarity: "uncommon",
    category: "community",
    condition: "커뮤니티에 10개 이상의 유용한 게시글을 작성하세요",
    expReward: 100,
  },
  {
    id: "community_pillar",
    name: "Community Pillar",
    description: "커뮤니티에 50개 이상의 게시글 작성",
    icon: "Star",
    rarity: "rare",
    category: "community",
    condition: "커뮤니티에 50개 이상의 게시글을 작성하세요",
    expReward: 200,
  },

  // 일반 업적
  {
    id: "welcome",
    name: "Welcome",
    description: "플랫폼에 가입",
    icon: "Star",
    rarity: "common",
    category: "general",
    condition: "플랫폼에 가입하세요",
    expReward: 10,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "플랫폼 초기 사용자",
    icon: "Star",
    rarity: "legendary",
    category: "general",
    condition: "플랫폼 초기 사용자로 가입하세요",
    expReward: 100,
    hidden: true,
  },
  {
    id: "consistent_solver",
    name: "Consistent Solver",
    description: "7일 연속으로 문제 해결",
    icon: "Zap",
    rarity: "rare",
    category: "general",
    condition: "7일 연속으로 문제를 해결하세요",
    expReward: 150,
  },
  {
    id: "dedication",
    name: "Dedication",
    description: "30일 연속 로그인",
    icon: "Star",
    rarity: "epic",
    category: "general",
    condition: "30일 연속으로 로그인하세요",
    expReward: 200,
  },
]

// 업적 아이콘 가져오기
export function getAchievementIcon(iconName: string): React.ReactNode {
  switch (iconName) {
    case "Zap":
      return <Zap className="h-5 w-5" />
    case "Star":
      return <Star className="h-5 w-5" />
    case "Globe":
      return <Globe className="h-5 w-5" />
    case "Lock":
      return <Lock className="h-5 w-5" />
    case "Cpu":
      return <Cpu className="h-5 w-5" />
    case "FileText":
      return <FileText className="h-5 w-5" />
    case "Terminal":
      return <Terminal className="h-5 w-5" />
    case "Shield":
      return <Shield className="h-5 w-5" />
    case "Flag":
      return <Flag className="h-5 w-5" />
    case "Trophy":
      return <Trophy className="h-5 w-5" />
    case "Server":
      return <Server className="h-5 w-5" />
    default:
      return <Star className="h-5 w-5" />
  }
}

// 희귀도 색상 가져오기
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "common":
      return "text-gray-400"
    case "uncommon":
      return "text-green-500"
    case "rare":
      return "text-blue-500"
    case "epic":
      return "text-purple-500"
    case "legendary":
      return "text-orange-500"
    default:
      return "text-gray-400"
  }
}

// 업적 ID로 업적 정보 가져오기
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}

// 특정 카테고리의 업적 목록 가져오기
export function getAchievementsByCategory(category: string): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.category === category)
}

// 숨겨진 업적 제외하고 가져오기
export function getVisibleAchievements(): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => !achievement.hidden)
}
