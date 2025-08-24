import { Timestamp } from "firebase/firestore"

// 팔로우 데이터 타입 추가
export interface FollowData {
  userId: string
  username: string
  photoURL?: string
  followedAt: Timestamp
}

// 소속 정보 타입 정의
export interface Affiliation {
  id: string
  name: string
  department?: string
  startDate?: string
  endDate?: string
  isVerified: boolean
  verificationRequestDate?: Timestamp
  verifiedBy?: string
  verifiedAt?: Timestamp
}

// 사용자 상태 타입 정의
export interface UserStatus {
  status: "active" | "suspended" | "banned" | "restricted"
  reason?: string
  appliedBy?: string
  appliedAt?: Timestamp
  expiresAt?: Timestamp
}

// 제재 정보 타입 정의
export interface Sanction {
  id: string
  type: "warning" | "restriction" | "suspension" | "ban"
  reason: string
  appliedBy: string
  appliedAt: Timestamp
  expiresAt?: Timestamp
  isActive: boolean
  details?: string
}

// 프로필 배너 타입 정의
export interface ProfileBanner {
  id: string
  name: string
  imageUrl: string
  description?: string
  isAdminOnly: boolean
  createdAt: Timestamp
  createdBy: string
}

// 프로필 프레임 타입 정의
export interface ProfileFrame {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
  color: string
  glowColor?: string
  animationType?: "none" | "glow" | "pulse" | "rotate" | "rainbow"
  isAdminOnly: boolean
  unlockCondition?: string
  createdAt: Timestamp
  createdBy: string
  price?: number // 포인트로 구매 가능한 경우
}

// 프로필 테마 타입 정의
export interface ProfileTheme {
  id: string
  name: string
  description: string
  backgroundColor: string
  gradientColors?: string[]
  textColor: string
  accentColor: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  isAdminOnly: boolean
  unlockCondition?: string
  createdAt: Timestamp
  createdBy: string
}

// 프로필 이펙트 타입 정의
export interface ProfileEffect {
  id: string
  name: string
  description: string
  effectType: "particles" | "animation" | "glow" | "trail" | "sparkle"
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  isAdminOnly: boolean
  unlockCondition?: string
  createdAt: Timestamp
  createdBy: string
}

// 업적 타입 정의
export interface Achievement {
  id: string
  name: string
  description: string
  iconUrl: string
  rarity: "bronze" | "silver" | "gold" | "platinum" | "diamond"
  category: "problem_solving" | "participation" | "special" | "admin"
  condition: string
  reward?: {
    points?: number
    exp?: number
    title?: string
    frame?: string
    theme?: string
    effect?: string
  }
  isHidden: boolean
  createdAt: Timestamp
}

// 칭호 시스템 확장
export interface Title {
  id: string
  name: string
  description: string
  color: string
  backgroundColor?: string
  borderColor?: string
  icon?: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
  unlockCondition?: string
  isAdminOnly: boolean
  glowEffect?: boolean
  animationType?: "none" | "glow" | "pulse" | "rainbow"
  createdAt: Timestamp
  createdBy: string
}

// 프로필 스탯 타입 정의
export interface ProfileStats {
  totalProblemsAttempted: number
  totalProblemsSolved: number
  averageSolveTime: number
  longestStreak: number
  currentStreak: number
  favoriteCategory: string
  totalTimeSpent: number
  firstSolveDate?: Timestamp
  lastSolveDate?: Timestamp
  weeklyActivity: number[]
  monthlyActivity: number[]
}

// 사용자 프로필 타입 정의 (팔로우 시스템 필드 추가)
export interface UserProfile {
  uid: string
  username: string
  email?: string
  photoURL?: string
  bio?: string
  location?: string
  website?: string
  points: number
  wargamePoints: number
  ctfPoints: number
  solvedChallenges: string[]
  createdAt: Timestamp
  lastLogin?: Timestamp
  rank?: number
  title?: string // 칭호 필드 추가
  // 여러 소속 정보를 배열로 저장
  affiliations?: Affiliation[]
  // 레벨 시스템 관련 필드
  exp?: number
  level?: number
  // 업적 시스템 관련 필드
  achievements?: string[]
  // 티어 시스템 관련 필드
  tier?: string
  // 연속 로그인 관련 필드
  streak?: number
  lastStreak?: Timestamp
  status?: UserStatus
  sanctions?: Sanction[]
  // 프로필 배너 관련 필드
  bannerUrl?: string
  bannerId?: string

  // 새로 추가되는 프로필 커스터마이징 필드들
  profileFrameId?: string
  profileThemeId?: string
  profileEffectId?: string
  unlockedFrames?: string[]
  unlockedThemes?: string[]
  unlockedEffects?: string[]
  unlockedTitles?: string[]
  unlockedAchievements?: string[]

  // 프로필 통계
  stats?: ProfileStats

  // 프로필 설정
  profileSettings?: {
    showStats: boolean
    showAchievements: boolean
    showActivity: boolean
    allowMessages: boolean
    showOnlineStatus: boolean
  }

  // 팔로우 시스템 필드 추가
  following?: FollowData[]
  followers?: FollowData[]
  followingCount?: number
  followersCount?: number
}

// 해결한 문제 타입 정의
export interface SolvedChallenge {
  id: string
  title: string
  category: string
  difficulty: string
  points: number
  solvedAt: Timestamp
  type: "wargame" | "ctf"
  contestId?: string
  contestTitle?: string
}

// 사용자 프로필 데이터 정규화 함수 (팔로우 필드 추가)
export function normalizeUserProfileData(data: any, id: string): UserProfile {
  return {
    uid: id,
    username: data.username || "사용자",
    email: data.email,
    photoURL: data.photoURL,
    bio: data.bio || "",
    location: data.location || "",
    website: data.website || "",
    points: data.points || 0,
    wargamePoints: data.wargamePoints || 0,
    ctfPoints: data.ctfPoints || 0,
    solvedChallenges: data.solvedChallenges || [],
    createdAt: data.createdAt || Timestamp.now(),
    lastLogin: data.lastLogin,
    rank: data.rank || 0,
    title: data.title || (data.role === "admin" ? "관리자" : undefined),
    role: data.role,
    // 소속 정보 배열
    affiliations: data.affiliations || [],
    // 레벨 시스템 관련 필드
    exp: data.exp || 0,
    level: data.level || 1,
    // 업적 시스템 관련 필드
    achievements: data.achievements || [],
    // 티어 시스템 관련 필드
    tier: data.tier || "Bronze",
    // 연속 로그인 관련 필드
    streak: data.streak || 0,
    lastStreak: data.lastStreak,
    status: data.status,
    sanctions: data.sanctions,
    // 프로필 배너 관련 필드
    bannerUrl: data.bannerUrl,
    bannerId: data.bannerId,
    // 팔로우 시스템 필드
    following: data.following || [],
    followers: data.followers || [],
    followingCount: data.followingCount || 0,
    followersCount: data.followersCount || 0,
  }
}

// 기본 프로필 배너 목록
export const DEFAULT_BANNERS: ProfileBanner[] = [
  {
    id: "admin-special",
    name: "관리자 전용 배너",
    imageUrl: "/profile-banners/admin-banner.png",
    description: "최고 관리자만 사용할 수 있는 특별한 배너입니다.",
    isAdminOnly: true,
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
]

// 기본 프로필 프레임 목록
export const DEFAULT_FRAMES: ProfileFrame[] = [
  {
    id: "default",
    name: "기본 프레임",
    description: "기본 프로필 프레임입니다.",
    imageUrl: "/frames/default.png",
    rarity: "common",
    color: "#6B7280",
    animationType: "none",
    isAdminOnly: false,
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
  {
    id: "admin-gold",
    name: "황금 관리자",
    description: "관리자 전용 황금 프레임입니다.",
    imageUrl: "/frames/admin-gold.png",
    rarity: "legendary",
    color: "#FFD700",
    glowColor: "#FFA500",
    animationType: "glow",
    isAdminOnly: true,
    unlockCondition: "관리자 권한 필요",
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
  {
    id: "hacker-matrix",
    name: "해커 매트릭스",
    description: "100문제 해결 시 획득할 수 있는 특별한 프레임입니다.",
    imageUrl: "/frames/hacker-matrix.png",
    rarity: "epic",
    color: "#00FF00",
    glowColor: "#00AA00",
    animationType: "pulse",
    isAdminOnly: false,
    unlockCondition: "100문제 해결",
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
]

// 기본 프로필 테마 목록
export const DEFAULT_THEMES: ProfileTheme[] = [
  {
    id: "default",
    name: "기본 테마",
    description: "기본 프로필 테마입니다.",
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    accentColor: "#3B82F6",
    rarity: "common",
    isAdminOnly: false,
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
  {
    id: "dark-hacker",
    name: "다크 해커",
    description: "해커를 위한 어두운 테마입니다.",
    backgroundColor: "#0F0F0F",
    gradientColors: ["#0F0F0F", "#1A1A1A", "#000000"],
    textColor: "#00FF00",
    accentColor: "#00AA00",
    rarity: "rare",
    isAdminOnly: false,
    unlockCondition: "50문제 해결",
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
  {
    id: "admin-royal",
    name: "로얄 관리자",
    description: "관리자 전용 고급 테마입니다.",
    backgroundColor: "#1A1A2E",
    gradientColors: ["#1A1A2E", "#16213E", "#0F3460"],
    textColor: "#FFD700",
    accentColor: "#E94560",
    rarity: "legendary",
    isAdminOnly: true,
    unlockCondition: "관리자 권한 필요",
    createdAt: Timestamp.now(),
    createdBy: "system",
  },
]
