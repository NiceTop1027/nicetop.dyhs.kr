"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { isAdmin, isSuperAdmin } from "@/lib/admin-utils"
import { motion } from "framer-motion"
import {
  Users,
  Flag,
  Trophy,
  FileText,
  Settings,
  Bell,
  Shield,
  UserCog,
  LogOut,
  Award,
  Calendar,
  BookOpen,
  Activity,
  Server,
  Zap,
  Target,
  BarChart3,
  Globe,
  ChevronRight,
  Star,
  Sparkles,
  Crown,
  Flame,
} from "lucide-react"
import Link from "next/link"

import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export default function AdminPage() {
  const { user, userProfile, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    activeSeasons: 0,
    totalCurriculum: 0,
    totalWargameProblems: 0,
    activeCTFContests: 0,
    totalCommunityPosts: 0,
    pendingReservations: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("로그아웃 오류:", error)
    }
  }

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!isAdmin(userProfile)) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, userProfile, router, toast])

  useEffect(() => {
    if (!user || !isAdmin(userProfile)) return

    const unsubscribers: (() => void)[] = []

    // 사용자 수 실시간 구독
    const usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalUsers: snapshot.size }))
    })
    unsubscribers.push(usersUnsubscribe)

    // 워게임 문제 수 실시간 구독
    const wargameUnsubscribe = onSnapshot(collection(db, "wargame_problems"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalWargameProblems: snapshot.size }))
    })
    unsubscribers.push(wargameUnsubscribe)

    // CTF 대회 수 실시간 구독
    const ctfUnsubscribe = onSnapshot(collection(db, "ctf_contests"), (snapshot) => {
      const activeContests = snapshot.docs.filter((doc) => {
        const data = doc.data()
        const now = new Date()
        const startDate = data.startDate?.toDate()
        const endDate = data.endDate?.toDate()
        return startDate && endDate && startDate <= now && now <= endDate
      }).length
      setStats((prev) => ({ ...prev, activeCTFContests: activeContests }))
    })
    unsubscribers.push(ctfUnsubscribe)

    // 커리큘럼 수 실시간 구독
    const curriculumUnsubscribe = onSnapshot(collection(db, "curriculum"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalCurriculum: snapshot.size }))
    })
    unsubscribers.push(curriculumUnsubscribe)

    // 커뮤니티 게시글 수 실시간 구독
    const communityUnsubscribe = onSnapshot(collection(db, "community_posts"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalCommunityPosts: snapshot.size }))
    })
    unsubscribers.push(communityUnsubscribe)

    // 예약 요청 수 실시간 구독
    const reservationsUnsubscribe = onSnapshot(
      query(collection(db, "ctf_reservations"), where("status", "==", "pending")),
      (snapshot) => {
        setStats((prev) => ({ ...prev, pendingReservations: snapshot.size }))
      },
    )
    unsubscribers.push(reservationsUnsubscribe)

    // 시즌 수 실시간 구독
    const seasonsUnsubscribe = onSnapshot(collection(db, "seasons"), (snapshot) => {
      const activeSeasons = snapshot.docs.filter((doc) => {
        const data = doc.data()
        return data.isActive === true
      }).length
      setStats((prev) => ({ ...prev, activeSeasons }))
    })
    unsubscribers.push(seasonsUnsubscribe)

    // 총 점수 계산
    const calculateTotalPoints = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        let totalPoints = 0
        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          totalPoints += data.points || 0
        })
        setStats((prev) => ({ ...prev, totalPoints }))
      } catch (error) {
        console.error("Error calculating total points:", error)
      }
    }

    calculateTotalPoints()
    setIsLoadingStats(false)

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user, userProfile])

  const quickActions = [
    {
      title: "새 워게임 문제",
      description: "워게임 문제를 생성합니다",
      href: "/admin/wargame/create",
      icon: Flag,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
    },
    {
      title: "새 CTF 대회",
      description: "CTF 대회를 생성합니다",
      href: "/admin/ctf/create",
      icon: Trophy,
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-500",
    },
    {
      title: "새 커리큘럼",
      description: "교육 커리큘럼을 작성합니다",
      href: "/admin/curriculum/create",
      icon: BookOpen,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      textColor: "text-green-500",
    },
    {
      title: "공지사항 작성",
      description: "커뮤니티 공지사항을 작성합니다",
      href: "/admin/community/create",
      icon: Bell,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-500",
    },
  ]

  const managementCards = [
    {
      title: "사용자 관리",
      description: "사용자 계정 및 권한을 관리합니다",
      href: "/admin/users",
      icon: Users,
      color: "from-indigo-500 to-purple-500",
      stats: "전체 사용자",
      value: isLoadingStats ? "..." : stats.totalUsers.toLocaleString(),
      trend: "+12%",
    },
    {
      title: "점수 관리",
      description: "유저 점수 및 랭킹을 관리합니다",
      href: "/admin/scores",
      icon: Award,
      color: "from-yellow-500 to-red-500",
      stats: "총 점수",
      value: isLoadingStats ? "..." : stats.totalPoints.toLocaleString(),
      trend: "+8%",
    },
    {
      title: "시즌 관리",
      description: "CTF 시즌 및 기간을 관리합니다",
      href: "/admin/seasons",
      icon: Calendar,
      color: "from-green-500 to-teal-500",
      stats: "활성 시즌",
      value: isLoadingStats ? "..." : stats.activeSeasons.toString(),
      trend: "진행중",
    },
    {
      title: "커리큘럼 관리",
      description: "교육 콘텐츠를 관리합니다",
      href: "/admin/curriculum",
      icon: BookOpen,
      color: "from-blue-500 to-indigo-500",
      stats: "총 커리큘럼",
      value: isLoadingStats ? "..." : stats.totalCurriculum.toString(),
      trend: "+3",
    },
    {
      title: "워게임 관리",
      description: "워게임 문제를 관리합니다",
      href: "/admin/wargame",
      icon: Flag,
      color: "from-cyan-500 to-blue-500",
      stats: "총 문제",
      value: isLoadingStats ? "..." : stats.totalWargameProblems.toString(),
      trend: "+7",
    },
    {
      title: "CTF 관리",
      description: "CTF 대회를 관리합니다",
      href: "/admin/ctf",
      icon: Trophy,
      color: "from-orange-500 to-red-500",
      stats: "진행중 대회",
      value: isLoadingStats ? "..." : stats.activeCTFContests.toString(),
      trend: "활성",
    },
    {
      title: "커뮤니티 관리",
      description: "커뮤니티 게시글을 관리합니다",
      href: "/admin/community",
      icon: FileText,
      color: "from-pink-500 to-rose-500",
      stats: "총 게시글",
      value: isLoadingStats ? "..." : stats.totalCommunityPosts.toString(),
      trend: "+15",
    },
    {
      title: "예약 관리",
      description: "CTF 예약 요청을 관리합니다",
      href: "/admin/reservations",
      icon: Settings,
      color: "from-violet-500 to-purple-500",
      stats: "대기중",
      value: isLoadingStats ? "..." : stats.pendingReservations.toString(),
      trend: "검토 필요",
    },
  ]

  if (!isAdmin(userProfile)) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-background/90">
      <Navbar />

      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />

        <motion.div
          className="relative container mx-auto px-4 py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">관리자 대시보드</h1>
                  <p className="text-xl text-blue-200 mt-1">
                    {isSuperAdmin(userProfile) ? "최고 관리자" : "관리자"} 권한으로 로그인됨
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1">
                  <Activity className="mr-1 h-3 w-3" />
                  시스템 정상
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1">
                  <Zap className="mr-1 h-3 w-3" />
                  실시간 모니터링
                </Badge>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                대시보드
              </TabsTrigger>
              <TabsTrigger
                value="management"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                콘텐츠 관리
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shield className="mr-2 h-4 w-4" />
                시스템 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
              {/* 빠른 작업 섹션 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">빠른 작업</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link href={action.href}>
                        <Card className="group cursor-pointer border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                          />
                          <CardHeader className="relative">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-300`}
                              >
                                <action.icon className={`h-5 w-5 ${action.textColor}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                  {action.title}
                                </CardTitle>
                                <CardDescription className="text-sm">{action.description}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* 관리 카드 섹션 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Target className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">시스템 관리</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {managementCards.map((card, index) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link href={card.href}>
                        <Card className="group cursor-pointer border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 overflow-hidden h-full">
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                          />
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />

                          <CardHeader className="relative pb-2">
                            <div className="flex items-center justify-between">
                              <div
                                className={`p-3 rounded-xl bg-gradient-to-br ${card.color} group-hover:scale-110 transition-transform duration-300`}
                              >
                                <card.icon className="h-6 w-6 text-white" />
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                          </CardHeader>

                          <CardContent className="relative">
                            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                              {card.title}
                            </CardTitle>
                            <CardDescription className="text-sm mb-4 line-clamp-2">{card.description}</CardDescription>

                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-bold text-primary">{card.value}</p>
                                <p className="text-xs text-muted-foreground">{card.stats}</p>
                              </div>
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                {card.trend}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* 최고 관리자 전용 섹션 */}
              {isSuperAdmin(userProfile) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-2xl font-bold">최고 관리자 전용</h2>
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      <Star className="mr-1 h-3 w-3" />
                      SUPER ADMIN
                    </Badge>
                  </div>

                  <Card className="border-0 bg-gradient-to-br from-yellow-500/10 via-card/80 to-orange-500/10 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-yellow-500" />
                        고급 시스템 관리
                      </CardTitle>
                      <CardDescription>시스템 전체 권한과 고급 관리 기능에 접근할 수 있습니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <Link href="/admin/users">
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-transparent hover:bg-yellow-500/10 hover:border-yellow-500/30"
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            관리자 권한 관리
                          </Button>
                        </Link>
                        <Link href="/admin/verifications">
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-transparent hover:bg-yellow-500/10 hover:border-yellow-500/30"
                          >
                            <Bell className="mr-2 h-4 w-4" />
                            인증 요청 관리
                          </Button>
                        </Link>
                        <Link href="/admin/aws-test">
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-transparent hover:bg-yellow-500/10 hover:border-yellow-500/30"
                          >
                            <Server className="mr-2 h-4 w-4" />
                            AWS 연결 테스트
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="management" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {managementCards.map((card, index) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                              <card.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{card.title}</CardTitle>
                              <CardDescription className="text-sm">{card.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Link href={card.href}>
                            <Button className="w-full">
                              <card.icon className="mr-2 h-4 w-4" />
                              {card.title.replace(" 관리", "")} 관리
                            </Button>
                          </Link>
                          <Link href={`${card.href}/create`}>
                            <Button variant="outline" className="w-full bg-transparent">
                              <Flame className="mr-2 h-4 w-4" />
                              새로 만들기
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Card className="border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      시스템 설정
                    </CardTitle>
                    <CardDescription>관리자 계정 및 시스템 설정을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Link href="/admin/users">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Users className="mr-2 h-4 w-4" />
                          사용자 관리
                        </Button>
                      </Link>
                      {isSuperAdmin(userProfile) && (
                        <Link href="/admin/users">
                          <Button variant="outline" className="w-full justify-start bg-transparent">
                            <UserCog className="mr-2 h-4 w-4" />
                            관리자 권한 관리
                          </Button>
                        </Link>
                      )}
                      <Link href="/admin/verifications">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Bell className="mr-2 h-4 w-4" />
                          인증 요청 관리
                        </Button>
                      </Link>
                      <Link href="/admin/reservations">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Settings className="mr-2 h-4 w-4" />
                          예약 관리
                        </Button>
                      </Link>
                      <Link href="/admin/banners">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Globe className="mr-2 h-4 w-4" />
                          배너 관리
                        </Button>
                      </Link>
                      <Link href="/admin/aws-test">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Server className="mr-2 h-4 w-4" />
                          AWS 연결 테스트
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
