export interface UserScore {
  id: string
  userId: string
  userName: string
  userEmail: string
  totalScore: number
  wargameScore: number
  ctfScore: number
  curriculumScore: number
  rank: number
  lastUpdated: any // Firestore Timestamp
  achievements: string[]
  tier: string
  seasonId?: string
}

export interface ScoreHistory {
  id: string
  userId: string
  userName: string
  scoreType: "wargame" | "ctf" | "curriculum" | "manual"
  points: number
  reason: string
  challengeId?: string
  challengeName?: string
  timestamp: any // Firestore Timestamp
  adminId?: string
  adminName?: string
  seasonId?: string
}

export interface ScoreAdjustment {
  userId: string
  userName: string
  scoreType: "wargame" | "ctf" | "curriculum" | "total"
  adjustment: number
  reason: string
}

export interface RankingData {
  overall: UserScore[]
  wargame: UserScore[]
  ctf: UserScore[]
  curriculum: UserScore[]
}
