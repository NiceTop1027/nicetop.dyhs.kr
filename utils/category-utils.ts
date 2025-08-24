import {
  FileText,
  MessageSquare,
  HelpCircle,
  Briefcase,
  Info,
  Code,
  BookOpen,
  UserPlus,
  Trophy,
  Megaphone,
  Star,
  TrendingUp,
} from "lucide-react"

/**
 * 카테고리별 아이콘 반환
 */
export function getCategoryIcon(category: string) {
  switch (category) {
    case "공지사항":
      return Megaphone
    case "Q&A":
      return HelpCircle
    case "자유게시판":
      return MessageSquare
    case "이직/커리어":
      return Briefcase
    case "정보공유":
      return Info
    case "테크":
      return Code
    case "스터디":
      return BookOpen
    case "팀원모집":
      return UserPlus
    case "대회":
      return Trophy
    case "행사홍보":
      return Megaphone
    case "후기":
      return Star
    case "인기글":
      return TrendingUp
    default:
      return FileText
  }
}

/**
 * 카테고리별 색상 반환
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case "공지사항":
      return "text-red-600"
    case "Q&A":
      return "text-blue-600"
    case "자유게시판":
      return "text-purple-600"
    case "이직/커리어":
      return "text-green-600"
    case "정보공유":
      return "text-cyan-600"
    case "테크":
      return "text-indigo-600"
    case "스터디":
      return "text-emerald-600"
    case "팀원모집":
      return "text-pink-600"
    case "대회":
      return "text-yellow-600"
    case "행사홍보":
      return "text-rose-600"
    case "후기":
      return "text-amber-600"
    case "인기글":
      return "text-orange-600"
    default:
      return "text-gray-600"
  }
}

/**
 * 카테고리별 배경색 반환
 */
export function getCategoryBgColor(category: string): string {
  switch (category) {
    case "공지사항":
      return "bg-red-100"
    case "Q&A":
      return "bg-blue-100"
    case "자유게시판":
      return "bg-purple-100"
    case "이직/커리어":
      return "bg-green-100"
    case "정보공유":
      return "bg-cyan-100"
    case "테크":
      return "bg-indigo-100"
    case "스터디":
      return "bg-emerald-100"
    case "팀원모집":
      return "bg-pink-100"
    case "대회":
      return "bg-yellow-100"
    case "행사홍보":
      return "bg-rose-100"
    case "후기":
      return "bg-amber-100"
    case "인기글":
      return "bg-orange-100"
    default:
      return "bg-gray-100"
  }
}
