"use client"

import { useState, useEffect } from "react"
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Search,
  Plus,
  AlertCircle,
  Trophy,
  Users,
  Target,
  Shield,
  Zap,
  Code,
  Lock,
  Server,
  Brain,
  Activity,
  TrendingUp,
  Filter,
  Star,
  Flame,
  Sparkles,
  LogIn,
  UserPlus,
  X,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { WargameChallenge } from "@/lib/wargame-types"
import { Alert, AlertDescription } from "@/components/ui/alert"

// 워게임 사용자 타입 정의
type WargameUser = {
  uid: string
  username: string
  photoURL?: string
  wargameScore: number
  solvedWargameProblems: string[]
  rank?: number
}

// 활성 사용자 타입 정의
type ActiveUser = {
  uid: string
  username: string
  photoURL?: string
  lastActive: Timestamp
}

// 플랫폼 통계 타입
type PlatformStats = {
  totalChallenges: number
  totalSolves: number
  activeUsers: number
  totalUsers: number
}

// 파티클 컴포넌트
const Particle = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
      initial={{
        x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1920),
        y: typeof window !== "undefined" ? window.innerHeight + 10 : 1080,
        opacity: 0,
      }}
      animate={{
        y: -10,
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: Math.random() * 3 + 2,
        delay: delay,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: Math.random() * 2,
        ease: "linear",
      }}
    />
  )
}

// 배경 파티클 시스템
const BackgroundParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <Particle key={i} delay={i * 0.1} />
      ))}
    </div>
  )
}

export default function WargamePage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<WargameChallenge[]>([])
  const [filteredChallenges, setFilteredChallenges] = useState<WargameChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState(0)
  const [solvedFilter, setSolvedFilter] = useState("all")
  const [topUsers, setTopUsers] = useState<WargameUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalChallenges: 0,
    totalSolves: 0,
    activeUsers: 0,
    totalUsers: 0,
  })
  const [showLoginAlert, setShowLoginAlert] = useState(false)

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  // 부드러운 스프링 애니메이션
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const scaleSpring = useSpring(1, springConfig)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 로그인 알림 표시 (페이지 로드 시 한 번만)
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowLoginAlert(true)
      }, 2000) // 2초 후 알림 표시

      return () => clearTimeout(timer)
    }
  }, [user])

  // 플랫폼 통계 가져오기 (로그인 상태와 무관)
  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const [challengesSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "wargame_challenges")),
          getDocs(collection(db, "users")),
        ])

        const totalSolves = challengesSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data()
          return acc + (data.solvedCount || 0)
        }, 0)

        setPlatformStats({
          totalChallenges: challengesSnapshot.size,
          totalSolves,
          activeUsers: activeUsers.length,
          totalUsers: usersSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching platform stats:", error)
        // 에러가 발생해도 기본값 유지
      }
    }

    fetchPlatformStats()
  }, [activeUsers])

  // 활성 사용자 실시간 업데이트
  useEffect(() => {
    const now = Timestamp.now()
    const fiveMinutesAgo = new Timestamp(now.seconds - 300, now.nanoseconds)

    const activeUsersRef = collection(db, "active_users")
    const q = query(activeUsersRef, where("lastActive", ">", fiveMinutesAgo), where("page", "==", "wargame"), limit(50))

    // 실시간 리스너 설정 (로그인 상태와 무관하게 활성 사용자 목록 가져오기)
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users: ActiveUser[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          users.push({
            uid: doc.id,
            username: data.username || "사용자",
            photoURL: data.photoURL,
            lastActive: data.lastActive,
          })
        })
        users.sort((a, b) => b.lastActive.seconds - a.lastActive.seconds)
        setActiveUsers(users)
      },
      (error) => {
        console.error("Error listening to active users:", error)
        // 에러 발생 시 빈 배열로 설정
        setActiveUsers([])
      },
    )

    // 로그인한 사용자만 자신의 활성 상태 업데이트
    let interval: NodeJS.Timeout | null = null
    if (user && userProfile) {
      const updateUserActivity = async () => {
        try {
          const userActivityRef = doc(db, "active_users", user.uid)
          await updateDoc(userActivityRef, {
            uid: user.uid,
            username: userProfile.username || user.displayName || "사용자",
            photoURL: user.photoURL || userProfile.photoURL,
            lastActive: Timestamp.now(),
            page: "wargame",
          }).catch(async (error) => {
            // 문서가 없으면 새로 생성
            if (error.code === "not-found") {
              await setDoc(userActivityRef, {
                uid: user.uid,
                username: userProfile.username || user.displayName || "사용자",
                photoURL: user.photoURL || userProfile.photoURL,
                lastActive: Timestamp.now(),
                page: "wargame",
              })
            }
          })
        } catch (error) {
          console.error("Error updating user activity:", error)
        }
      }

      // 즉시 업데이트
      updateUserActivity()

      // 30초마다 업데이트
      interval = setInterval(updateUserActivity, 30000)

      // 페이지 포커스/블러 이벤트 처리
      const handleFocus = () => updateUserActivity()
      const handleBeforeUnload = async () => {
        try {
          const userActivityRef = doc(db, "active_users", user.uid)
          await updateDoc(userActivityRef, {
            lastActive: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000)), // 10분 전으로 설정하여 비활성화
          })
        } catch (error) {
          console.error("Error updating user activity on leave:", error)
        }
      }

      window.addEventListener("focus", handleFocus)
      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        unsubscribe()
        if (interval) clearInterval(interval)
        window.removeEventListener("focus", handleFocus)
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }

    return () => {
      unsubscribe()
      if (interval) clearInterval(interval)
    }
  }, [user, userProfile])

  // 워게임 상위 사용자 불러오기 (로그인 상태와 무관)
  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setIsLoadingUsers(true)
        const usersRef = collection(db, "users")
        const q = query(usersRef, orderBy("wargameScore", "desc"), limit(10))
        const querySnapshot = await getDocs(q)

        const users: WargameUser[] = []
        let rank = 1

        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          if (userData.wargameScore && userData.wargameScore > 0) {
            // 점수가 있는 사용자만 표시
            users.push({
              uid: doc.id,
              username: userData.username || "사용자",
              photoURL: userData.photoURL,
              wargameScore: userData.wargameScore || 0,
              solvedWargameProblems: userData.solvedWargameProblems || [],
              rank,
            })
            rank++
          }
        })

        setTopUsers(users)
      } catch (error) {
        console.error("Error fetching top users:", error)
        // 에러 발생 시 빈 배열로 설정
        setTopUsers([])
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchTopUsers()
  }, [])

  // 워게임 문제 불러오기 (로그인 상태와 무관)
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setIsLoading(true)
        const challengesRef = collection(db, "wargame_challenges")
        const q = query(challengesRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        const challengesData: WargameChallenge[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as WargameChallenge
          challengesData.push({
            id: doc.id,
            ...data,
            solvedBy: data.solvedBy || [],
            solvedCount: data.solvedCount || 0,
          })
        })

        setChallenges(challengesData)
        setFilteredChallenges(challengesData)
      } catch (error) {
        console.error("Error fetching challenges:", error)
        toast({
          title: "데이터 로딩 오류",
          description: "문제 목록을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.",
          variant: "destructive",
        })
        // 에러 발생 시 빈 배열로 설정
        setChallenges([])
        setFilteredChallenges([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchChallenges()
  }, [toast])

  // 필터링 적용
  useEffect(() => {
    let result = [...challenges]

    if (searchQuery) {
      result = result.filter(
        (challenge) =>
          challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          challenge.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      result = result.filter((challenge) => challenge.category === categoryFilter)
    }

    if (difficultyFilter !== "all") {
      result = result.filter((challenge) => challenge.difficulty === difficultyFilter)
    }

    if (levelFilter > 0) {
      result = result.filter((challenge) => challenge.level === levelFilter)
    }

    // 로그인한 사용자만 풀이 상태 필터 적용
    if (user) {
      if (solvedFilter === "solved") {
        result = result.filter(
          (challenge) => Array.isArray(challenge.solvedBy) && challenge.solvedBy.includes(user.uid),
        )
      } else if (solvedFilter === "unsolved") {
        result = result.filter(
          (challenge) => !Array.isArray(challenge.solvedBy) || !challenge.solvedBy.includes(user.uid),
        )
      }
    }

    setFilteredChallenges(result)
  }, [challenges, searchQuery, categoryFilter, difficultyFilter, levelFilter, solvedFilter, user])

  const difficultyLevels = Array.from({ length: 10 }, (_, i) => i + 1)

  const getLevelColor = (level: number) => {
    if (level <= 3)
      return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400 shadow-emerald-500/25"
    if (level <= 6)
      return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-amber-500/25"
    if (level <= 8)
      return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400 shadow-orange-500/25"
    return "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-400 shadow-red-500/25"
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "웹 해킹":
        return <Code className="h-4 w-4" />
      case "시스템 해킹":
        return <Server className="h-4 w-4" />
      case "리버싱":
        return <Brain className="h-4 w-4" />
      case "암호학":
        return <Lock className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "웹 해킹":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
      case "시스템 해킹":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
      case "리버싱":
        return "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20"
      case "암호학":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20"
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 고급 배경 효과 */}
      <div className="fixed inset-0 -z-10">
        {/* 기본 그라데이션 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

        {/* 네온 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-purple-900/10" />

        {/* 움직이는 그라데이션 구체들 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, rgba(236, 72, 153, 0.2) 50%, transparent 100%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(34, 197, 94, 0.2) 50%, transparent 100%)",
          }}
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* 격자 패턴 */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* 파티클 시스템 */}
      <BackgroundParticles />

      {/* 로그인 알림 모달 */}
      <AnimatePresence>
        {showLoginAlert && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLoginAlert(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(59, 130, 246, 0.4)",
                        "0 0 0 20px rgba(59, 130, 246, 0)",
                        "0 0 0 0 rgba(59, 130, 246, 0.4)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <Shield className="h-6 w-6 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white">보안 전문가가 되어보세요!</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLoginAlert(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-gray-300">
                  🚀 <strong>무료로 시작하세요!</strong> 다양한 보안 문제를 풀고 실력을 향상시키세요.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Trophy className="h-4 w-4" />
                    <span>점수 획득</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Target className="h-4 w-4" />
                    <span>실력 향상</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <Users className="h-4 w-4" />
                    <span>랭킹 경쟁</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Zap className="h-4 w-4" />
                    <span>실시간 대결</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href="/register" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300">
                    <UserPlus className="mr-2 h-4 w-4" />
                    무료 회원가입
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 transition-all duration-300 bg-transparent"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    로그인
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                이미 {platformStats.totalUsers.toLocaleString()}명의 보안 전문가들이 함께하고 있습니다!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar />

      <main className="py-8 relative">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* 로그인 유도 메시지 */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8"
            >
              <Alert className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/30 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  </motion.div>
                  <AlertDescription className="text-blue-200 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <span>
                        문제를 풀고 점수를 획득하려면 로그인이 필요합니다. 지금 가입하고 보안 전문가가 되어보세요! 🚀
                      </span>
                      <div className="flex gap-2">
                        <Link href="/login">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            로그인
                          </Button>
                        </Link>
                        <Link href="/register">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 transition-all duration-300 bg-transparent"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            회원가입
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            </motion.div>
          )}

          {/* 헤더 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ y, opacity }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-12 text-center"
          >
            <motion.h1
              className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              워게임 문제
            </motion.h1>
            <motion.p
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              다양한 보안 문제를 풀면서 실력을 향상시키세요
            </motion.p>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                {
                  title: "총 문제",
                  value: platformStats.totalChallenges,
                  icon: <Target className="h-6 w-6" />,
                  color: "from-blue-500 to-cyan-500",
                  shadowColor: "shadow-blue-500/25",
                },
                {
                  title: "총 풀이",
                  value: platformStats.totalSolves,
                  icon: <Trophy className="h-6 w-6" />,
                  color: "from-amber-500 to-orange-500",
                  shadowColor: "shadow-amber-500/25",
                },
                {
                  title: "활성 사용자",
                  value: platformStats.activeUsers,
                  icon: <Activity className="h-6 w-6" />,
                  color: "from-emerald-500 to-teal-500",
                  shadowColor: "shadow-emerald-500/25",
                },
                {
                  title: "전체 사용자",
                  value: platformStats.totalUsers,
                  icon: <Users className="h-6 w-6" />,
                  color: "from-purple-500 to-pink-500",
                  shadowColor: "shadow-purple-500/25",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.1 + 0.4,
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                  }}
                  whileHover={{
                    y: -10,
                    scale: 1.05,
                    transition: { duration: 0.3, ease: "easeOut" },
                  }}
                  className="group cursor-pointer"
                >
                  <Card
                    className={`p-6 bg-gray-900/40 border-gray-700/50 hover:border-gray-600 transition-all duration-500 backdrop-blur-md ${stat.shadowColor} hover:shadow-xl`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <motion.div
                        className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white shadow-lg`}
                        whileHover={{
                          rotate: 360,
                          scale: 1.1,
                        }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      >
                        {stat.icon}
                      </motion.div>
                      <div className="text-right">
                        <motion.div
                          className="text-3xl font-bold text-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.6, type: "spring", stiffness: 200 }}
                        >
                          {stat.value.toLocaleString()}
                        </motion.div>
                        <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                          {stat.title}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* 검색 및 액션 */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div className="relative group" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors duration-300" />
                <Input
                  placeholder="문제 검색..."
                  className="pl-12 w-80 bg-gray-900/50 border-gray-700 focus:border-cyan-500 text-white placeholder-gray-500 backdrop-blur-md transition-all duration-300 focus:shadow-lg focus:shadow-cyan-500/25"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </motion.div>
              {isAdmin && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <Link href="/admin/wargame/create">
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">
                      <Plus className="mr-2 h-4 w-4" />
                      문제 추가
                    </Button>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-3 space-y-8">
              {/* 필터 섹션 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="space-y-6"
              >
                {/* 카테고리 필터 */}
                <Card className="p-6 bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600"
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Shield className="h-5 w-5 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-white">분야</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      {
                        key: "all",
                        label: "전체",
                        icon: <Filter className="h-4 w-4" />,
                        color: "from-gray-500 to-gray-600",
                      },
                      {
                        key: "웹 해킹",
                        label: "웹 해킹",
                        icon: <Code className="h-4 w-4" />,
                        color: "from-blue-500 to-cyan-500",
                      },
                      {
                        key: "시스템 해킹",
                        label: "시스템 해킹",
                        icon: <Server className="h-4 w-4" />,
                        color: "from-purple-500 to-pink-500",
                      },
                      {
                        key: "리버싱",
                        label: "리버싱",
                        icon: <Brain className="h-4 w-4" />,
                        color: "from-pink-500 to-rose-500",
                      },
                      {
                        key: "암호학",
                        label: "암호학",
                        icon: <Lock className="h-4 w-4" />,
                        color: "from-cyan-500 to-teal-500",
                      },
                    ].map((category) => (
                      <motion.div
                        key={category.key}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          variant={categoryFilter === category.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCategoryFilter(category.key)}
                          className={`${
                            categoryFilter === category.key
                              ? `bg-gradient-to-r ${category.color} text-white border-transparent shadow-lg hover:shadow-xl`
                              : "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                          } transition-all duration-300 backdrop-blur-sm`}
                        >
                          {category.icon}
                          <span className="ml-2">{category.label}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </Card>

                {/* 레벨 및 풀이 상태 필터 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                      >
                        <TrendingUp className="h-5 w-5 text-white" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white">레벨</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant={levelFilter === 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLevelFilter(0)}
                          className={`${
                            levelFilter === 0
                              ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg"
                              : "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                          } transition-all duration-300`}
                        >
                          전체
                        </Button>
                      </motion.div>
                      {difficultyLevels.map((level) => (
                        <motion.div
                          key={level}
                          whileHover={{ scale: 1.1, y: -3 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Button
                            variant={levelFilter === level ? "default" : "outline"}
                            size="sm"
                            onClick={() => setLevelFilter(level)}
                            className={`w-10 h-10 p-0 font-bold transition-all duration-300 ${
                              levelFilter === level
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                                : `${getLevelColor(level)} border-2 hover:scale-110 hover:shadow-lg`
                            }`}
                          >
                            {level}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Zap className="h-5 w-5 text-white" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white">풀이 상태</h3>
                      {!user && (
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                          로그인 필요
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "all", label: "전체", color: "from-gray-500 to-gray-600" },
                        { key: "unsolved", label: "미해결", color: "from-red-500 to-pink-500" },
                        { key: "solved", label: "해결", color: "from-emerald-500 to-teal-500" },
                      ].map((filter) => (
                        <motion.div
                          key={filter.key}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Button
                            variant={solvedFilter === filter.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSolvedFilter(filter.key)}
                            disabled={!user && filter.key !== "all"}
                            className={`${
                              solvedFilter === filter.key
                                ? `bg-gradient-to-r ${filter.color} text-white shadow-lg hover:shadow-xl`
                                : "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            } transition-all duration-300`}
                          >
                            {filter.label}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>

              {/* 문제 목록 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                    <div className="text-gray-300 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-cyan-400" />총{" "}
                      <span className="font-semibold text-cyan-400 text-lg">{filteredChallenges.length}</span>개의 문제
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50 backdrop-blur-sm">
                        <tr>
                          <th className="py-4 px-6 text-left font-semibold text-gray-300">문제</th>
                          <th className="py-4 px-6 text-left font-semibold text-gray-300">분야</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">레벨</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">풀이</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">점수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          Array(5)
                            .fill(0)
                            .map((_, index) => (
                              <motion.tr
                                key={index}
                                className="border-b border-gray-800/50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <td className="py-6 px-6">
                                  <div className="animate-pulse">
                                    <motion.div
                                      className="h-5 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-3/4 mb-2"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                                    />
                                    <motion.div
                                      className="h-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-1/2"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                                    />
                                  </div>
                                </td>
                                <td className="py-6 px-6">
                                  <motion.div
                                    className="h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-20"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                                  />
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <motion.div
                                    className="h-8 w-8 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full mx-auto"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
                                  />
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <motion.div
                                    className="h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-10 mx-auto"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.8 }}
                                  />
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <motion.div
                                    className="h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-16 mx-auto"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 1.0 }}
                                  />
                                </td>
                              </motion.tr>
                            ))
                        ) : filteredChallenges.length > 0 ? (
                          filteredChallenges.map((challenge, index) => (
                            <motion.tr
                              key={challenge.id}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: index * 0.05,
                                duration: 0.5,
                                ease: "easeOut",
                              }}
                              whileHover={{
                                backgroundColor: "rgba(55, 65, 81, 0.3)",
                                scale: 1.01,
                                transition: { duration: 0.2 },
                              }}
                              className="border-b border-gray-800/50 transition-all duration-300 cursor-pointer"
                            >
                              <td className="py-6 px-6">
                                <Link href={`/wargame/${challenge.id}`} className="block group">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <motion.div
                                        className="font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300"
                                        whileHover={{ x: 5 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        {challenge.title}
                                      </motion.div>
                                      <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                                        {challenge.author || "관리자"}
                                      </div>
                                    </div>
                                    {user &&
                                      Array.isArray(challenge.solvedBy) &&
                                      challenge.solvedBy.includes(user.uid) && (
                                        <motion.div
                                          initial={{ scale: 0, rotate: -180 }}
                                          animate={{ scale: 1, rotate: 0 }}
                                          transition={{
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 15,
                                          }}
                                        >
                                          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400/30 shadow-lg shadow-emerald-500/25">
                                            <Star className="h-3 w-3 mr-1" />
                                            해결
                                          </Badge>
                                        </motion.div>
                                      )}
                                  </div>
                                </Link>
                              </td>
                              <td className="py-6 px-6">
                                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                                  <Badge
                                    className={`${getCategoryColor(challenge.category)} flex items-center gap-1 w-fit transition-all duration-300 border backdrop-blur-sm`}
                                  >
                                    {getCategoryIcon(challenge.category)}
                                    {challenge.category}
                                  </Badge>
                                </motion.div>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.2 }}>
                                  <Badge
                                    className={`${getLevelColor(challenge.level)} w-8 h-8 rounded-full flex items-center justify-center font-semibold border shadow-lg`}
                                  >
                                    {challenge.level}
                                  </Badge>
                                </motion.div>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <motion.span
                                  className="font-semibold text-gray-300"
                                  whileHover={{ scale: 1.1, color: "#06b6d4" }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {challenge.solvedCount || 0}
                                </motion.span>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-400/30 font-semibold shadow-lg shadow-blue-500/25">
                                    <Flame className="h-3 w-3 mr-1" />
                                    {challenge.points} 점
                                  </Badge>
                                </motion.div>
                              </td>
                            </motion.tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <motion.div
                                className="flex flex-col items-center gap-4"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                              >
                                <motion.div
                                  animate={{
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <Target className="h-12 w-12 text-gray-600" />
                                </motion.div>
                                <div>
                                  <p className="text-lg font-medium text-gray-400">문제를 찾을 수 없습니다</p>
                                  <p className="text-sm text-gray-500">필터를 변경해보세요</p>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* 사이드바 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="lg:col-span-1 space-y-6"
            >
              {/* 활성 사용자 */}
              <Card className="p-6 bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(34, 197, 94, 0.4)",
                        "0 0 0 10px rgba(34, 197, 94, 0)",
                        "0 0 0 0 rgba(34, 197, 94, 0.4)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <Users className="h-5 w-5 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">활성 사용자</h3>
                  <motion.div
                    className="ml-auto flex items-center gap-1"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <motion.div
                      className="w-2 h-2 bg-emerald-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                    />
                    <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                  </motion.div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  현재{" "}
                  <motion.span
                    className="font-semibold text-emerald-400 text-lg"
                    key={activeUsers.length}
                    initial={{ scale: 1.2, color: "#10b981" }}
                    animate={{ scale: 1, color: "#34d399" }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeUsers.length}
                  </motion.span>
                  명이 활동 중
                </p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {activeUsers.slice(0, 12).map((activeUser, index) => (
                      <motion.div
                        key={activeUser.uid}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0, rotate: 180 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                        }}
                        whileHover={{
                          scale: 1.2,
                          y: -5,
                          transition: { duration: 0.2 },
                        }}
                        className="relative group"
                      >
                        <Avatar className="h-10 w-10 border-2 border-emerald-500/30 transition-all duration-200 group-hover:border-emerald-400 shadow-lg">
                          <AvatarImage src={activeUser.photoURL || "/placeholder.svg"} alt={activeUser.username} />
                          <AvatarFallback className="bg-gradient-to-r from-gray-700 to-gray-800 text-white text-xs font-semibold">
                            {activeUser.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        {/* 실시간 활성 표시 */}
                        <motion.div
                          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900"
                          animate={{
                            scale: [1, 1.2, 1],
                            boxShadow: [
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                              "0 0 0 6px rgba(34, 197, 94, 0)",
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        />

                        {/* 호버 시 사용자 정보 툴팁 */}
                        <motion.div
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 backdrop-blur-sm border border-gray-700"
                          initial={{ opacity: 0, y: 10 }}
                          whileHover={{ opacity: 1, y: 0 }}
                        >
                          {activeUser.username}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {activeUsers.length > 12 && (
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 text-xs font-medium text-gray-300 border-2 border-gray-600 shadow-lg"
                      whileHover={{ scale: 1.1, backgroundColor: "#4b5563" }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      +{activeUsers.length - 12}
                    </motion.div>
                  )}
                </div>

                {/* 최근 접속한 사용자 표시 */}
                {activeUsers.length > 0 && (
                  <motion.div
                    className="mt-4 pt-4 border-t border-gray-700/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      최근 접속
                    </div>
                    <div className="space-y-1">
                      {activeUsers.slice(0, 3).map((activeUser, index) => {
                        const timeAgo = Math.floor((Date.now() - activeUser.lastActive.toDate().getTime()) / 1000)
                        const timeText =
                          timeAgo < 60
                            ? "방금 전"
                            : timeAgo < 3600
                              ? `${Math.floor(timeAgo / 60)}분 전`
                              : `${Math.floor(timeAgo / 3600)}시간 전`

                        return (
                          <motion.div
                            key={activeUser.uid}
                            className="flex items-center gap-2 text-xs"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + index * 0.1 }}
                          >
                            <motion.div
                              className="w-2 h-2 bg-emerald-400 rounded-full"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                            />
                            <span className="text-gray-400 truncate flex-1">{activeUser.username}</span>
                            <span className="text-gray-500">{timeText}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </Card>

              {/* TOP 10 랭킹 */}
              <Card className="p-6 bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Trophy className="h-5 w-5 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">TOP 10</h3>
                </div>
                <div className="space-y-3">
                  {isLoadingUsers ? (
                    Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center gap-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <motion.div
                            className="w-6 h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.div
                            className="h-10 w-10 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                          />
                          <div className="flex-1">
                            <motion.div
                              className="h-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-3/4 mb-1"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                            />
                            <motion.div
                              className="h-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-1/2"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
                            />
                          </div>
                          <motion.div
                            className="h-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-12"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.8 }}
                          />
                        </motion.div>
                      ))
                  ) : topUsers.length > 0 ? (
                    topUsers.map((topUser, index) => (
                      <motion.div
                        key={topUser.uid}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 5, scale: 1.02 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                          index < 3
                            ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10"
                            : "hover:bg-gray-800/50"
                        }`}
                      >
                        <motion.div
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all duration-300 ${
                            index === 0
                              ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/25"
                              : index === 1
                                ? "bg-gradient-to-r from-gray-400 to-gray-500 text-black shadow-lg shadow-gray-400/25"
                                : index === 2
                                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
                                  : "bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300"
                          }`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {index + 1}
                        </motion.div>
                        <Avatar className="h-10 w-10 border-2 border-gray-600 hover:border-gray-500 transition-colors duration-300 shadow-lg">
                          <AvatarImage src={topUser.photoURL || "/placeholder.svg"} alt={topUser.username} />
                          <AvatarFallback className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                            {topUser.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <motion.div
                            className="font-semibold text-white truncate"
                            whileHover={{ color: "#06b6d4" }}
                            transition={{ duration: 0.2 }}
                          >
                            {topUser.username}
                          </motion.div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {topUser.solvedWargameProblems?.length || 0}문제
                          </div>
                        </div>
                        <motion.div
                          className="font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text"
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {topUser.wargameScore || 0}
                        </motion.div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      className="text-center text-gray-500 py-8"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                      >
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      </motion.div>
                      <p>아직 참가자가 없습니다</p>
                    </motion.div>
                  )}
                </div>
              </Card>

              {/* 문제 제출 */}
              <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.3 }}>
                <Card className="p-6 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-purple-500/30 backdrop-blur-md shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5 text-purple-400" />
                    </motion.div>
                    <h3 className="font-semibold text-white">문제 제출하기</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">여러분의 문제를 공유해주세요!</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                    <Button
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                      onClick={() => router.push("/wargame/submit")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      문제 제출
                    </Button>
                  </motion.div>
                </Card>
              </motion.div>

              {/* 빠른 링크 */}
              <Card className="border-0 shadow-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">빠른 링크</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/ctf">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      CTF 대회 참가하기
                    </Button>
                  </Link>
                  <Link href="/ranking">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      전체 사용자 랭킹 확인
                    </Button>
                  </Link>
                  <Link href="/community">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      커뮤니티 질문 & 답변
                    </Button>
                  </Link>
                  <Link href="/curriculum">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white bg-transparent"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      보안 학습 커리큘럼
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
