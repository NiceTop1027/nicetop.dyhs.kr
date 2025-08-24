"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Calendar,
  Clock,
  Trophy,
  Users,
  Search,
  Filter,
  Play,
  CheckCircle,
  Lock,
  Shield,
  Target,
  Zap,
  Crown,
  Medal,
  Activity,
  TrendingUp,
  Star,
  Eye,
  AlertCircle,
  Plus,
  FileText,
} from "lucide-react"
import Link from "next/link"

// CTF 대회 타입 정의
interface CTFContest {
  id: string
  title: string
  description: string
  startTime: any
  endTime: any
  problemCount: number
  participants: string[]
  author: string
  authorId: string
  createdAt: any
  status: "upcoming" | "active" | "ended"
  tags?: string[]
  isPasswordProtected?: boolean
  bannerImage?: string
  difficulty?: string
}

// 참가자 통계 타입
interface ParticipantStats {
  uid: string
  username: string
  photoURL?: string
  totalScore: number
  contestsParticipated: number
  problemsSolved: number
  rank?: number
}

export default function CTFPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 상태 관리
  const [contests, setContests] = useState<CTFContest[]>([])
  const [topParticipants, setTopParticipants] = useState<ParticipantStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"all" | "upcoming" | "active" | "ended">("all")
  const [stats, setStats] = useState({
    totalContests: 0,
    activeContests: 0,
    totalParticipants: 0,
    totalProblems: 0,
  })

  // 관리자 권한 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 대회 목록 불러오기
  const fetchContests = async () => {
    try {
      console.log("Fetching CTF contests...")
      const contestsRef = collection(db, "ctf_contests")
      const q = query(contestsRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)

      const contestsData: CTFContest[] = []
      let totalProblems = 0
      let activeCount = 0
      const allParticipants = new Set<string>()

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data()
        const now = new Date()
        const startTime = data.startTime?.toDate() || new Date()
        const endTime = data.endTime?.toDate() || new Date()

        let status: "upcoming" | "active" | "ended" = "ended"
        if (now < startTime) {
          status = "upcoming"
        } else if (now >= startTime && now <= endTime) {
          status = "active"
          activeCount++
        }

        const contest: CTFContest = {
          id: docSnap.id,
          title: data.title || "",
          description: data.description || "",
          startTime: data.startTime,
          endTime: data.endTime,
          problemCount: data.problemCount || 0,
          participants: data.participants || [],
          author: data.author || "",
          authorId: data.authorId || "",
          createdAt: data.createdAt,
          status,
          tags: data.tags || [],
          isPasswordProtected: data.isPasswordProtected || false,
          bannerImage: data.bannerImage || "",
          difficulty: data.difficulty || "medium",
        }

        contestsData.push(contest)
        totalProblems += contest.problemCount
        contest.participants.forEach((p) => allParticipants.add(p))
      }

      console.log(`Loaded ${contestsData.length} contests`)
      setContests(contestsData)
      setStats({
        totalContests: contestsData.length,
        activeContests: activeCount,
        totalParticipants: allParticipants.size,
        totalProblems,
      })
    } catch (error) {
      console.error("Error fetching contests:", error)
      toast({
        title: "오류 발생",
        description: "대회 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 상위 참가자 불러오기
  const fetchTopParticipants = async () => {
    try {
      console.log("Fetching top participants...")
      const participantsRef = collection(db, "ctf_participants")
      const q = query(participantsRef, orderBy("score", "desc"), limit(10))
      const querySnapshot = await getDocs(q)

      const participantsMap = new Map<string, ParticipantStats>()

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const uid = data.uid

        if (participantsMap.has(uid)) {
          const existing = participantsMap.get(uid)!
          existing.totalScore += data.score || 0
          existing.contestsParticipated += 1
          existing.problemsSolved += data.solvedProblems?.length || 0
        } else {
          participantsMap.set(uid, {
            uid: data.uid,
            username: data.username || "Unknown",
            photoURL: data.photoURL,
            totalScore: data.score || 0,
            contestsParticipated: 1,
            problemsSolved: data.solvedProblems?.length || 0,
          })
        }
      })

      const topParticipantsData = Array.from(participantsMap.values())
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10)
        .map((participant, index) => ({
          ...participant,
          rank: index + 1,
        }))

      console.log(`Loaded ${topParticipantsData.length} top participants`)
      setTopParticipants(topParticipantsData)
    } catch (error) {
      console.error("Error fetching top participants:", error)
    }
  }

  // 초기 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([fetchContests(), fetchTopParticipants()])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 필터링된 대회 목록
  const filteredContests = contests.filter((contest) => {
    const matchesSearch =
      contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contest.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || contest.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  // 날짜 포맷 함수
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 미정"
    const date = timestamp.toDate()
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 상태별 배지 스타일
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            Live
          </Badge>
        )
      case "upcoming":
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg">
            <Clock className="h-3 w-3 mr-2" />
            Upcoming
          </Badge>
        )
      case "ended":
        return (
          <Badge className="bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0 shadow-lg">
            <CheckCircle className="h-3 w-3 mr-2" />
            Ended
          </Badge>
        )
      default:
        return null
    }
  }

  // 난이도별 색상
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-green-300 border-green-500/40"
      case "medium":
        return "bg-gradient-to-r from-yellow-600/30 to-orange-600/30 text-yellow-300 border-yellow-500/40"
      case "hard":
        return "bg-gradient-to-r from-red-600/30 to-pink-600/30 text-red-300 border-red-500/40"
      default:
        return "bg-gradient-to-r from-gray-600/30 to-slate-600/30 text-gray-300 border-gray-500/40"
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {/* 헤더 섹션 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">
                  CTF Competitions
                </h1>
                <p className="text-gray-400 text-lg">사이버 보안 실력을 겨루는 CTF 대회에 참가해보세요</p>
              </div>
              {isAdmin && (
                <Link href="/admin/ctf">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    대회 관리
                  </Button>
                </Link>
              )}
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-900/50 to-blue-800/30 backdrop-blur-xl border border-blue-500/20 hover:shadow-blue-500/20 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">총 대회</p>
                      <p className="text-3xl font-bold text-white">{stats.totalContests}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30">
                      <Trophy className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-900/50 to-green-800/30 backdrop-blur-xl border border-green-500/20 hover:shadow-green-500/20 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-300 text-sm font-medium">진행 중</p>
                      <p className="text-3xl font-bold text-white">{stats.activeContests}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30">
                      <Zap className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-gradient-to-br from-purple-900/50 to-purple-800/30 backdrop-blur-xl border border-purple-500/20 hover:shadow-purple-500/20 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-300 text-sm font-medium">참가자</p>
                      <p className="text-3xl font-bold text-white">{stats.totalParticipants}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/30">
                      <Users className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-gradient-to-br from-orange-900/50 to-orange-800/30 backdrop-blur-xl border border-orange-500/20 hover:shadow-orange-500/20 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-300 text-sm font-medium">총 문제</p>
                      <p className="text-3xl font-bold text-white">{stats.totalProblems}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-400/30">
                      <Target className="h-6 w-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-8">
              {/* 검색 및 필터 */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="대회 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
                      <TabsList className="bg-gray-900/50 border border-gray-700">
                        <TabsTrigger
                          value="all"
                          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                        >
                          전체
                        </TabsTrigger>
                        <TabsTrigger
                          value="active"
                          className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                        >
                          진행중
                        </TabsTrigger>
                        <TabsTrigger
                          value="upcoming"
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                        >
                          예정
                        </TabsTrigger>
                        <TabsTrigger
                          value="ended"
                          className="data-[state=active]:bg-gray-500 data-[state=active]:text-white"
                        >
                          종료
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>

              {/* 대회 목록 */}
              {isLoading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50"
                    >
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-700 rounded mb-4"></div>
                          <div className="h-4 bg-gray-700 rounded mb-2"></div>
                          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredContests.length === 0 ? (
                <Card className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 rounded-full bg-gray-800/50 mx-auto mb-4 w-fit">
                      <AlertCircle className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">대회가 없습니다</h3>
                    <p className="text-gray-400">
                      {searchTerm ? "검색 조건에 맞는 대회가 없습니다." : "아직 등록된 대회가 없습니다."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {filteredContests.map((contest) => (
                    <Card
                      key={contest.id}
                      className="group border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/ctf/${contest.id}`)}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                          {/* 배너 이미지 */}
                          <div className="lg:w-1/3 h-48 lg:h-auto relative overflow-hidden rounded-l-lg">
                            {contest.bannerImage ? (
                              <img
                                src={contest.bannerImage || "/placeholder.svg"}
                                alt={contest.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                <Shield className="h-16 w-16 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-4 left-4">{getStatusBadge(contest.status)}</div>
                            {contest.isPasswordProtected && (
                              <div className="absolute top-4 right-4">
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Private
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* 대회 정보 */}
                          <div className="lg:w-2/3 p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors">
                                  {contest.title}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{contest.description}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`ml-4 ${getDifficultyColor(contest.difficulty || "medium")}`}
                              >
                                {contest.difficulty === "easy"
                                  ? "초급"
                                  : contest.difficulty === "medium"
                                    ? "중급"
                                    : contest.difficulty === "hard"
                                      ? "고급"
                                      : "중급"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                <span>{formatDate(contest.startTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                <span>{contest.problemCount} 문제</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Users className="h-4 w-4 text-green-400" />
                                <span>{contest.participants.length} 참가자</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Eye className="h-4 w-4 text-purple-400" />
                                <span>by {contest.author}</span>
                              </div>
                            </div>

                            {contest.tags && contest.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {contest.tags.slice(0, 3).map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-gray-800/50 text-gray-300 border-gray-600 text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {contest.tags.length > 3 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-800/50 text-gray-300 border-gray-600 text-xs"
                                  >
                                    +{contest.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                {formatDate(contest.startTime)} - {formatDate(contest.endTime)}
                              </div>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/ctf/${contest.id}`)
                                }}
                              >
                                <Play className="mr-2 h-3 w-3" />
                                {contest.status === "active"
                                  ? "참가하기"
                                  : contest.status === "upcoming"
                                    ? "자세히 보기"
                                    : "결과 보기"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 사이드바 */}
            <div className="lg:col-span-4 space-y-6">
              {/* 실시간 랭킹 */}
              <Card className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg text-white">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                      <TrendingUp className="h-4 w-4 text-yellow-400" />
                    </div>
                    CTF 랭킹 TOP 10
                  </CardTitle>
                  <CardDescription className="text-gray-400">전체 CTF 대회 누적 점수 기준</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-3 p-4">
                    {topParticipants.slice(0, 10).map((participant) => (
                      <div
                        key={participant.uid}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-gray-800/50 ${
                          participant.uid === user?.uid
                            ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                            : "bg-gray-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                          {participant.rank === 1 ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                              <Crown className="h-4 w-4 text-white" />
                            </div>
                          ) : participant.rank === 2 ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
                              <Medal className="h-4 w-4 text-white" />
                            </div>
                          ) : participant.rank === 3 ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                              <Trophy className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                              {participant.rank}
                            </div>
                          )}
                        </div>
                        <Avatar className="h-8 w-8 border-2 border-gray-600 shadow-md">
                          <AvatarImage src={participant.photoURL || "/placeholder.svg"} alt={participant.username} />
                          <AvatarFallback className="bg-gray-700 text-gray-300 font-bold">
                            {participant.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate text-white">{participant.username}</p>
                            {participant.uid === user?.uid && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs px-2 py-0.5">
                                나
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            <span className="text-sm font-bold text-amber-400">
                              {participant.totalScore.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500">점</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 내 CTF 현황 */}
              {user && (
                <Card className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg text-white">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                        <Activity className="h-4 w-4 text-blue-400" />
                      </div>
                      내 CTF 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-300">총 점수</span>
                        </div>
                        <span className="font-bold text-yellow-400">
                          {topParticipants.find((p) => p.uid === user.uid)?.totalScore.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-300">참가 대회</span>
                        </div>
                        <span className="font-bold text-blue-400">
                          {topParticipants.find((p) => p.uid === user.uid)?.contestsParticipated || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-300">해결 문제</span>
                        </div>
                        <span className="font-bold text-green-400">
                          {topParticipants.find((p) => p.uid === user.uid)?.problemsSolved || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-gray-300">순위</span>
                        </div>
                        <span className="font-bold text-purple-400">
                          #{topParticipants.find((p) => p.uid === user.uid)?.rank || "순위권 외"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 빠른 링크 */}
              <Card className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">빠른 링크</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/wargame">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      워게임 문제 풀이하기
                    </Button>
                  </Link>
                  <Link href="/ranking">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      CTF 랭킹 & 점수 확인
                    </Button>
                  </Link>
                  <Link href="/community">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      CTF 후기 & 토론 참여
                    </Button>
                  </Link>
                  <Link href="/curriculum">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      CTF 준비 학습 과정
                    </Button>
                  </Link>
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
