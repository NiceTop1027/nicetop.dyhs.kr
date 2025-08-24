import type { Timestamp } from "firebase/firestore"

export interface CommunityCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  isAdminOnly: boolean
  allowedRoles: string[]
  postCount: number
  lastPostAt?: Timestamp
  createdAt: Timestamp
  createdBy: string
}

export interface CommunityPost {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  authorPhotoURL?: string
  authorRank?: number
  authorTitle?: string
  categoryId: string
  categoryName: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  isPinned: boolean
  isNotice: boolean
  isLocked: boolean
  files?: string[]
  links?: {
    url: string
    title: string
  }[]
  tags?: string[]
  viewCount: number
  commentCount: number
  likeCount: number
  viewedBy?: string[]
  likedBy?: string[]
  status: "active" | "hidden" | "deleted"
}

export const DEFAULT_CATEGORIES: Omit<CommunityCategory, "id" | "createdAt" | "createdBy">[] = [
  {
    name: "📢 공지사항",
    description: "관리자가 작성하는 중요한 공지사항",
    icon: "📢",
    color: "#ef4444",
    isAdminOnly: true,
    allowedRoles: ["admin"],
    postCount: 0,
  },
  {
    name: "❓ 질문 & 답변",
    description: "궁금한 것들을 자유롭게 질문하세요",
    icon: "❓",
    color: "#3b82f6",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "💡 정보 공유",
    description: "유용한 정보와 팁을 공유해주세요",
    icon: "💡",
    color: "#10b981",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "🔒 웹 해킹",
    description: "웹 해킹 관련 토론과 정보 공유",
    icon: "🔒",
    color: "#8b5cf6",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "🔍 포렌식",
    description: "디지털 포렌식 관련 내용",
    icon: "🔍",
    color: "#f59e0b",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "⚡ 리버싱",
    description: "리버스 엔지니어링 관련 토론",
    icon: "⚡",
    color: "#ef4444",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "🎯 CTF 대회",
    description: "CTF 대회 관련 정보와 후기",
    icon: "🎯",
    color: "#ec4899",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
  {
    name: "💬 자유 게시판",
    description: "자유로운 대화와 소통 공간",
    icon: "💬",
    color: "#6b7280",
    isAdminOnly: false,
    allowedRoles: ["user", "admin"],
    postCount: 0,
  },
]
