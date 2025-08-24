export interface Season {
  id: string
  name: string
  description: string
  startDate: any // Firestore Timestamp
  endDate: any // Firestore Timestamp
  isActive: boolean
  isDefault: boolean
  createdAt: any // Firestore Timestamp
  updatedAt: any // Firestore Timestamp
  createdBy: string
  createdByName: string
  settings: SeasonSettings
  stats: SeasonStats
}

export interface SeasonSettings {
  allowWargameScoring: boolean
  allowCtfScoring: boolean
  allowCurriculumScoring: boolean
  resetScoresOnStart: boolean
  maxParticipants?: number
  registrationRequired: boolean
}

export interface SeasonStats {
  totalParticipants: number
  totalChallenges: number
  totalSolves: number
  averageScore: number
  topScore: number
}

export interface SeasonParticipant {
  id: string
  seasonId: string
  userId: string
  userName: string
  userEmail: string
  joinedAt: any // Firestore Timestamp
  totalScore: number
  rank: number
  isActive: boolean
}

export interface SeasonLeaderboard {
  seasonId: string
  seasonName: string
  participants: SeasonParticipant[]
  lastUpdated: any // Firestore Timestamp
}
