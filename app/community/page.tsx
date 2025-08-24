"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  Loader2,
  Plus,
  Search,
  Eye,
  MessageCircle,
  TrendingUp,
  BarChart,
  Pin,
  Star,
  HelpCircle,
  Briefcase,
  Info,
  Code,
  BookOpen,
  UserPlus,
  Trophy,
  Megaphone,
  ThumbsUp,
  MessageSquare,
  Calendar,
  Sparkles,
  Users,
  Activity,
  Zap,
  Crown,
} from "lucide-react"
import Link from "next/link"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { escapeHtml } from "@/utils/escape-html"
import { getCategoryIcon } from "@/utils/category-utils"
import { cn } from "@/lib/utils"

// 카테고리 정의 - 다크 테마에 맞춘 색상
const CATEGORIES = [
  {
    id: "all",
    name: "전체",
    icon: FileText,
    color: "text-gray-400",
    bgColor: "bg-gradient-to-r from-gray-800/50 to-gray-700/50",
    description: "모든 게시글",
  },
  {
    id: "공지사항",
    name: "공지사항",
    icon: Megaphone,
    color: "text-red-400",
    bgColor: "bg-gradient-to-r from-red-500/20 to-pink-500/20",
    description: "중요한 공지사항",
  },
  {
    id: "인기글",
    name: "인기글",
    icon: TrendingUp,
    color: "text-orange-400",
    bgColor: "bg-gradient-to-r from-orange-500/20 to-yellow-500/20",
    description: "인기 있는 게시글",
  },
  {
    id: "Q&A",
    name: "Q&A",
    icon: HelpCircle,
    color: "text-blue-400",
    bgColor: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20",
    description: "질문과 답변",
  },
  {
    id: "자유게시판",
    name: "자유게시판",
    icon: MessageSquare,
    color: "text-purple-400",
    bgColor: "bg-gradient-to-r from-purple-500/20 to-indigo-500/20",
    description: "자유로운 소통",
  },
  {
    id: "이직/커리어",
    name: "이직/커리어",
    icon: Briefcase,
    color: "text-green-400",
    bgColor: "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
    description: "커리어 관련 정보",
  },
  {
    id: "정보공유",
    name: "정보공유",
    icon: Info,
    color: "text-cyan-400",
    bgColor: "bg-gradient-to-r from-cyan-500/20 to-teal-500/20",
    description: "유용한 정보 공유",
  },
  {
    id: "테크",
    name: "테크",
    icon: Code,
    color: "text-indigo-400",
    bgColor: "bg-gradient-to-r from-indigo-500/20 to-blue-500/20",
    description: "기술 관련 토론",
  },
  {
    id: "스터디",
    name: "스터디",
    icon: BookOpen,
    color: "text-emerald-400",
    bgColor: "bg-gradient-to-r from-emerald-500/20 to-green-500/20",
    description: "스터디 모집",
  },
  {
    id: "팀원모집",
    name: "팀원모집",
    icon: UserPlus,
    color: "text-pink-400",
    bgColor: "bg-gradient-to-r from-pink-500/20 to-rose-500/20",
    description: "팀원 모집",
  },
  {
    id: "대회",
    name: "대회",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20",
    description: "대회 정보",
  },
  {
    id: "행사홍보",
    name: "행사홍보",
    icon: Megaphone,
    color: "text-rose-400",
    bgColor: "bg-gradient-to-r from-rose-500/20 to-red-500/20",
    description: "행사 홍보",
  },
  {
    id: "후기",
    name: "후기",
    icon: Star,
    color: "text-amber-400",
    bgColor: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
    description: "경험 후기",
  },
]

// 간소화된 Post 타입 정의
type Post = {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  authorPhotoURL?: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  isPinned: boolean
  isNotice: boolean
  category: string
  files?: string[]
  links?: {
    url: string
    title: string
  }[]
  tags?: string[]
  viewCount?: number
  commentCount?: number
  likeCount?: number
  viewedBy?: string[]
  likedBy?: string[]
}

// 통계 타입 정의
type CommunityStats = {
  totalPosts: number
  todayPosts: number
  activeUsers: number
  totalComments: number
}

export default function CommunityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [posts, setPosts] = useState<Post[]>([])
  const [noticePosts, setNoticePosts] = useState<Post[]>([])
  const [popularPosts, setPopularPosts] = useState<Post[]>([])
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    totalPosts: 0,
    todayPosts: 0,
    activeUsers: 0,
    totalComments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "all")
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 게시글 클릭 핸들러
  const handlePostClick = (postId: string) => {
    router.push(`/community/${postId}`)
  }

  // 카테고리 변경 핸들러
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId)
    setLastVisible(null)
    setHasMore(true)
    setPosts([])
    router.push(`/community?category=${categoryId}`)
  }

  // 게시글 가져오기 - 인덱스 문제 해결을 위해 단순화
  const fetchPosts = async (isInitial = true) => {
    try {
      if (isInitial) {
        setIsLoading(true)
        setError("")
      } else {
        setLoadingMore(true)
      }

      let postsQuery
      let allPosts: Post[] = []

      if (activeCategory === "all") {
        // 모든 게시글 가져오기 - 단순 쿼리 사용
        postsQuery = query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(50))
      } else if (activeCategory === "인기글") {
        // 인기글 - 좋아요 수로 정렬
        postsQuery = query(collection(db, "community_posts"), orderBy("likeCount", "desc"), limit(20))
      } else if (activeCategory === "공지사항") {
        // 공지사항 - isNotice 필드로 필터링
        postsQuery = query(
          collection(db, "community_posts"),
          where("isNotice", "==", true),
          orderBy("createdAt", "desc"),
          limit(20),
        )
      } else {
        // 특정 카테고리 - 모든 게시글을 가져온 후 클라이언트에서 필터링
        postsQuery = query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(100))
      }

      const postsSnapshot = await getDocs(postsQuery)

      postsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data && data.title) {
          allPosts.push({
            id: doc.id,
            title: data.title || "제목 없음",
            content: data.content || "",
            author: data.author || "작성자 미상",
            authorId: data.authorId || "",
            authorPhotoURL: data.authorPhotoURL,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            isPinned: data.isPinned || false,
            isNotice: data.isNotice || false,
            category: data.category || "자유게시판",
            files: data.files || [],
            links: data.links || [],
            tags: data.tags || [],
            viewCount: data.viewCount || 0,
            commentCount: data.commentCount || 0,
            likeCount: data.likeCount || 0,
          })
        }
      })

      // 클라이언트 사이드 필터링 (특정 카테고리인 경우)
      if (activeCategory !== "all" && activeCategory !== "인기글" && activeCategory !== "공지사항") {
        allPosts = allPosts.filter((post) => post.category === activeCategory)
      }

      // 핀 고정된 게시글을 맨 위로
      allPosts.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      })

      setPosts(allPosts.slice(0, 20))
      setHasMore(allPosts.length > 20)

      // 공지사항과 인기글 가져오기 (초기 로드 시에만)
      if (isInitial && activeCategory === "all") {
        // 공지사항
        const noticeQuery = query(
          collection(db, "community_posts"),
          where("isNotice", "==", true),
          orderBy("createdAt", "desc"),
          limit(3),
        )
        const noticeSnapshot = await getDocs(noticeQuery)
        const noticeData: Post[] = []
        noticeSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data && data.title) {
            noticeData.push({
              id: doc.id,
              title: data.title,
              content: data.content,
              author: data.author,
              authorId: data.authorId,
              authorPhotoURL: data.authorPhotoURL,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              isPinned: data.isPinned || false,
              isNotice: true,
              category: data.category || "공지사항",
              viewCount: data.viewCount || 0,
              commentCount: data.commentCount || 0,
              likeCount: data.likeCount || 0,
            })
          }
        })
        setNoticePosts(noticeData)

        // 인기글
        const popularQuery = query(collection(db, "community_posts"), orderBy("likeCount", "desc"), limit(3))
        const popularSnapshot = await getDocs(popularQuery)
        const popularData: Post[] = []
        popularSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data && data.title && (data.likeCount || 0) >= 3) {
            popularData.push({
              id: doc.id,
              title: data.title,
              content: data.content,
              author: data.author,
              authorId: data.authorId,
              authorPhotoURL: data.authorPhotoURL,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              isPinned: data.isPinned || false,
              isNotice: data.isNotice || false,
              category: data.category || "자유게시판",
              viewCount: data.viewCount || 0,
              commentCount: data.commentCount || 0,
              likeCount: data.likeCount || 0,
            })
          }
        })
        setPopularPosts(popularData)
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error)
      setError(`게시글을 불러오는 중 오류가 발생했습니다. (${error.code || "알 수 없는 오류"})`)
      toast({
        title: "데이터 로딩 오류",
        description: `게시글을 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      if (isInitial) {
        setIsLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }

  // 커뮤니티 통계 계산
  const calculateCommunityStats = async () => {
    try {
      const postsSnapshot = await getDocs(collection(db, "community_posts"))

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      let todayPosts = 0
      let totalComments = 0
      const activeUserIds = new Set()

      postsSnapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt?.toDate()

        if (createdAt && createdAt >= today && createdAt < tomorrow) {
          todayPosts++
        }

        totalComments += data.commentCount || 0

        if (data.authorId) {
          activeUserIds.add(data.authorId)
        }
      })

      setCommunityStats({
        totalPosts: postsSnapshot.size,
        todayPosts,
        activeUsers: activeUserIds.size,
        totalComments,
      })
    } catch (error) {
      console.error("Error calculating community stats:", error)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    fetchPosts()
    calculateCommunityStats()
  }, [activeCategory])

  // 날짜 포맷 함수
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "날짜 정보 없음"

    try {
      const now = new Date()
      const diff = now.getTime() - date.getTime()

      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000))
        if (hours === 0) {
          const minutes = Math.floor(diff / (60 * 1000))
          if (minutes === 0) {
            return "방금 전"
          }
          return `${minutes}분 전`
        }
        return `${hours}시간 전`
      }

      return format(date, "MM월 dd일", { locale: ko })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "날짜 정보 오류"
    }
  }

  // 검색 필터링
  const filteredPosts = posts.filter(
    (post) =>
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 현재 카테고리 정보 가져오기
  const currentCategory = CATEGORIES.find((cat) => cat.id === activeCategory) || CATEGORIES[0]

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== "string") return "U"
    return name.substring(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
                <p className="text-gray-400 text-xl font-medium">게시글을 불러오는 중입니다...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6">
          {/* 헤더 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <currentCategory.icon className="h-6 w-6 text-white" />
                </div>
                {currentCategory.name}
              </h1>
              <p className="text-gray-400 text-lg">{currentCategory.description} • NT 보안 챌린지 커뮤니티</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="검색어를 입력하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 w-80 h-12 bg-gray-900/60 backdrop-blur-xl border border-gray-800/50 rounded-xl shadow-lg focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 text-white placeholder:text-gray-500"
                />
              </div>
              {isAdmin && (
                <Link href="/admin/community/create">
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 h-12">
                    <Plus className="h-5 w-5" />글 작성하기
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 사이드바 - 카테고리 */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    카테고리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-4">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-4 text-left rounded-2xl transition-all duration-300 group",
                          activeCategory === category.id
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg transform scale-105"
                            : "hover:bg-gray-800/60 backdrop-blur-xl border border-transparent hover:border-gray-700/50 hover:shadow-lg text-gray-300 hover:text-white",
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                            activeCategory === category.id ? "bg-white/20 backdrop-blur-xl" : category.bgColor,
                          )}
                        >
                          <category.icon
                            className={cn(
                              "h-5 w-5 transition-all duration-300",
                              activeCategory === category.id ? "text-white" : category.color,
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <span
                            className={cn(
                              "font-semibold transition-all duration-300",
                              activeCategory === category.id ? "text-white" : "text-white",
                            )}
                          >
                            {category.name}
                          </span>
                          <p
                            className={cn(
                              "text-sm transition-all duration-300",
                              activeCategory === category.id ? "text-white/80" : "text-gray-400",
                            )}
                          >
                            {category.description}
                          </p>
                        </div>
                        {activeCategory === category.id && (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 통계 */}
              <Card className="mt-6 border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <BarChart className="h-4 w-4 text-white" />
                    </div>
                    커뮤니티 통계
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-300">총 게시글</span>
                      </div>
                      <span className="font-bold text-lg text-cyan-400">{communityStats.totalPosts}개</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-300">오늘 작성</span>
                      </div>
                      <span className="font-bold text-lg text-green-400">{communityStats.todayPosts}개</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-300">활성 사용자</span>
                      </div>
                      <span className="font-bold text-lg text-purple-400">{communityStats.activeUsers}명</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl border border-orange-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-300">총 댓글</span>
                      </div>
                      <span className="font-bold text-lg text-orange-400">{communityStats.totalComments}개</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-3">
              {/* 공지사항 (전체 카테고리일 때만 표시) */}
              {activeCategory === "all" && noticePosts.length > 0 && (
                <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-red-500/5 to-pink-500/5">
                    <CardTitle className="text-xl font-bold text-red-400 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center animate-pulse">
                        <Pin className="h-5 w-5 text-white" />
                      </div>
                      📢 중요 공지사항
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {noticePosts.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center justify-between p-4 bg-gray-900/60 backdrop-blur-xl rounded-2xl cursor-pointer hover:bg-gray-800/80 transition-all duration-300 border border-gray-800/50 hover:shadow-lg group"
                          onClick={() => handlePostClick(post.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-full font-semibold shadow-lg">
                              공지
                            </Badge>
                            <span className="font-bold text-white group-hover:text-red-400 transition-colors">
                              {post.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-400">
                            <span className="font-medium">{formatDate(post.createdAt?.toDate())}</span>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{post.viewCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 인기글 (전체 카테고리일 때만 표시) */}
              {activeCategory === "all" && popularPosts.length > 0 && (
                <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-xl border border-orange-500/20 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-500/5 to-yellow-500/5">
                    <CardTitle className="text-xl font-bold text-orange-400 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      🔥 인기글
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {popularPosts.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center justify-between p-4 bg-gray-900/60 backdrop-blur-xl rounded-2xl cursor-pointer hover:bg-gray-800/80 transition-all duration-300 border border-gray-800/50 hover:shadow-lg group"
                          onClick={() => handlePostClick(post.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Badge className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-3 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              인기
                            </Badge>
                            <span className="font-bold text-white group-hover:text-orange-400 transition-colors">
                              {post.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4 text-orange-500" />
                              <span className="font-semibold text-orange-400">{post.likeCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{post.viewCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 게시글 목록 */}
              <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      {activeCategory === "all" ? "최신 게시글" : currentCategory.name}
                    </CardTitle>
                    <Badge className="bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 px-4 py-2 rounded-full font-semibold shadow-lg">
                      {filteredPosts.length}개의 게시글
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-12 w-12 text-gray-600" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-2">게시글이 없습니다</p>
                      <p className="text-gray-400 mb-8">첫 번째 게시글을 작성해보세요!</p>
                      {isAdmin && (
                        <Link href="/admin/community/create">
                          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            글 작성하기
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPosts.map((post, index) => {
                        const CategoryIcon = getCategoryIcon(post.category)
                        return (
                          <div
                            key={post.id}
                            className="group p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 hover:from-gray-800/60 hover:to-gray-900/60 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                            onClick={() => handlePostClick(post.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <Avatar className="h-14 w-14 ring-4 ring-gray-700/50 group-hover:ring-cyan-500/50 transition-all duration-300 shadow-lg">
                                  <AvatarImage src={post.authorPhotoURL || "/placeholder-user.jpg"} alt={post.author} />
                                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-lg">
                                    {getInitials(post.author)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {post.isPinned && (
                                      <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                                        <Pin className="h-3 w-3 mr-1" />
                                        고정
                                      </Badge>
                                    )}
                                    {post.isNotice && (
                                      <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                                        📢 공지
                                      </Badge>
                                    )}
                                    <Badge className="px-3 py-1 rounded-full text-xs font-semibold shadow-lg border-0 flex items-center gap-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
                                      <CategoryIcon className="w-3 h-3" />
                                      {escapeHtml(post.category)}
                                    </Badge>
                                  </div>
                                  <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors mb-2 line-clamp-2">
                                    {escapeHtml(post.title)}
                                    {post.commentCount > 0 && (
                                      <Badge className="ml-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                                        {post.commentCount}
                                      </Badge>
                                    )}
                                  </h3>
                                  <div className="flex items-center gap-6 text-sm text-gray-400">
                                    <span className="font-medium hover:text-cyan-400 cursor-pointer transition-colors">
                                      {escapeHtml(post.author)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>{formatDate(post.createdAt?.toDate())}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-500/20">
                                  <ThumbsUp className="h-4 w-4 text-red-400" />
                                  <span className="font-semibold text-red-400">{post.likeCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                                  <Eye className="h-4 w-4 text-cyan-400" />
                                  <span className="font-semibold text-cyan-400">{post.viewCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                                  <MessageCircle className="h-4 w-4 text-green-400" />
                                  <span className="font-semibold text-green-400">{post.commentCount || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {hasMore && filteredPosts.length > 0 && (
                    <div className="mt-8 text-center">
                      <Button
                        variant="outline"
                        onClick={() => fetchPosts(false)}
                        disabled={loadingMore}
                        className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/50 hover:bg-gray-800/80 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-gray-300 hover:text-white"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            불러오는 중...
                          </>
                        ) : (
                          "더 보기"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
