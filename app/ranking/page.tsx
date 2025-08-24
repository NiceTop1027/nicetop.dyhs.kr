"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Trophy,
  Medal,
  Search,
  User,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Minus,
  Shield,
  Crown,
  Award,
  Sparkles,
  Flame,
  Layers,
  Calendar,
  Settings,
  RefreshCw,
  Edit,
  RotateCcw,
} from "lucide-react"
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, Timestamp, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { motion } from "framer-motion"
import { Particles } from "@/components/ui/particles"
import { Button } from "@/components/ui/button"
import { isAdmin } from "@/lib/admin-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 사용자 타입 정의
type UserRanking = {
  uid: string
  username: string
  photoURL?: string
  ctfPoints: number
  rank?: number
  previousRank?: number
  title?: string
  level?: number
  tier?: string
}

// 티어 정의
type Tier = {
  name: string
  minPoints: number
  color: string
  icon: React.ReactNode
}

export default function RankingPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showTierInfo, setShowTierInfo] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalCtfs, setTotalCtfs] = useState(0)

  // 관리자 기능 상태
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRanking | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    ctfPoints: 0,
    tier: "",
    reason: "",
  })

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // CTF 랭킹 데이터 가져오기
  const fetchUsersData = async () => {
    try {
      setIsLoading(true)

      // 1. CTF 점수 기준으로 상위 100명 사용자 가져오기
      const usersRef = collection(db, "users")
      const q = query(usersRef, orderBy("ctfPoints", "desc"), limit(100))
      const usersSnap = await getDocs(q)

      // 2. 사용자 데이터 가공
      const processed: UserRanking[] = usersSnap.docs
        .map((doc) => {
          const d = doc.data()
          const ctfPoints = d.ctfPoints || 0

          if (ctfPoints <= 0) return null // CTF 점수 0 이하는 제외

          const tierInfo = getTierByPoints(ctfPoints)

          return {
            uid: doc.id,
            username: d.username || d.displayName || "사용자",
            photoURL: d.photoURL,
            ctfPoints,
            rank: 0, // 나중에 재할당
            previousRank: d.previousRank || 0,
            title: d.title,
            level: calculateLevel(ctfPoints),
            tier: tierInfo.name,
          } as UserRanking
        })
        .filter(Boolean) as UserRanking[]

      // 3. CTF 점수 기준으로 정렬 및 순위 부여
      processed.sort((a, b) => b.ctfPoints - a.ctfPoints).forEach((u, i) => (u.rank = i + 1))

      setUsers(processed)

      // 4. 통계 값들
      setTotalUsers((await getDocs(collection(db, "users"))).size)
      setTotalCtfs((await getDocs(collection(db, "ctf_contests"))).size)
    } catch (err) {
      console.error("Error fetching users:", err)
      toast({
        title: "오류 발생",
        description: "랭킹 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersData()
  }, [])

  // 티어 정의
  const tiers: Tier[] = [
    { name: "Bronze", minPoints: 0, color: "#CD7F32", icon: <Shield className="h-4 w-4" /> },
    { name: "Silver", minPoints: 500, color: "#C0C0C0", icon: <Shield className="h-4 w-4" /> },
    { name: "Gold", minPoints: 1500, color: "#FFD700", icon: <Shield className="h-4 w-4" /> },
    { name: "Platinum", minPoints: 3000, color: "#E5E4E2", icon: <Shield className="h-4 w-4" /> },
    { name: "Diamond", minPoints: 5000, color: "#B9F2FF", icon: <Shield className="h-4 w-4" /> },
    { name: "Master", minPoints: 8000, color: "#9370DB", icon: <Crown className="h-4 w-4" /> },
    { name: "Grandmaster", minPoints: 12000, color: "#FF4500", icon: <Sparkles className="h-4 w-4" /> },
    { name: "Legend", minPoints: 20000, color: "#FF0000", icon: <Flame className="h-4 w-4" /> },
  ]

  // 티어 계산 함수
  const getTierByPoints = (points: number): Tier => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].minPoints) {
        return tiers[i]
      }
    }
    return tiers[0] // 기본 티어
  }

  // 레벨 계산 함수
  const calculateLevel = (points: number): number => {
    return Math.floor(Math.sqrt(points / 10)) + 1
  }

  // 검색 필터링
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))

  // 관리자 기능: 사용자 편집
  const handleEditUser = (userData: UserRanking) => {
    setSelectedUser(userData)
    setEditForm({
      ctfPoints: userData.ctfPoints,
      tier: userData.tier || "Bronze",
      reason: "",
    })
    setEditDialogOpen(true)
  }

  // 관리자 기능: 사용자 정보 업데이트
  const handleUpdateUser = async () => {
    if (!selectedUser || !editForm.reason.trim()) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 올바르게 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const userRef = doc(db, "users", selectedUser.uid)
      const selectedTier = tiers.find((t) => t.name === editForm.tier)

      await updateDoc(userRef, {
        ctfPoints: editForm.ctfPoints,
        tier: editForm.tier,
        level: calculateLevel(editForm.ctfPoints),
        updatedAt: Timestamp.now(),
        lastModifiedBy: user?.uid,
        lastModificationReason: editForm.reason,
      })

      // 점수 변경 히스토리 추가
      const historyRef = collection(db, "score_history")
      await getDocs(historyRef).then(async () => {
        const batch = writeBatch(db)
        const historyDoc = doc(historyRef)
        batch.set(historyDoc, {
          userId: selectedUser.uid,
          userName: selectedUser.username,
          scoreType: "ctf",
          oldPoints: selectedUser.ctfPoints,
          newPoints: editForm.ctfPoints,
          pointsChange: editForm.ctfPoints - selectedUser.ctfPoints,
          oldTier: selectedUser.tier,
          newTier: editForm.tier,
          reason: editForm.reason,
          adminId: user?.uid,
          adminName: userProfile?.username || "관리자",
          timestamp: Timestamp.now(),
        })
        await batch.commit()
      })

      toast({
        title: "사용자 정보 업데이트 완료",
        description: `${selectedUser.username}님의 정보가 성공적으로 업데이트되었습니다.`,
      })

      setEditDialogOpen(false)
      setSelectedUser(null)
      fetchUsersData() // 데이터 새로고침
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "업데이트 실패",
        description: `사용자 정보를 업데이트하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 관리자 기능: 전체 랭킹 초기화
  const handleResetAllRankings = async () => {
    try {
      const usersRef = collection(db, "users")
      const usersSnap = await getDocs(usersRef)

      const batch = writeBatch(db)

      usersSnap.docs.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          ctfPoints: 0,
          tier: "Bronze",
          level: 1,
          previousRank: userDoc.data().rank || 0,
          rank: 0,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user?.uid,
          lastModificationReason: "전체 랭킹 초기화",
        })
      })

      await batch.commit()

      // 초기화 히스토리 추가
      const historyRef = collection(db, "score_history")
      const historyDoc = doc(historyRef)
      await updateDoc(historyDoc, {
        action: "reset_all_rankings",
        adminId: user?.uid,
        adminName: userProfile?.username || "관리자",
        timestamp: Timestamp.now(),
        reason: "전체 CTF 랭킹 초기화",
      })

      toast({
        title: "랭킹 초기화 완료",
        description: "모든 사용자의 CTF 랭킹이 초기화되었습니다.",
      })

      setResetDialogOpen(false)
      fetchUsersData() // 데이터 새로고침
    } catch (error: any) {
      console.error("Error resetting rankings:", error)
      toast({
        title: "초기화 실패",
        description: `랭킹을 초기화하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 랭킹 변동 표시 컴포넌트
  const RankChange = ({ current, previous }: { current: number; previous: number }) => {
    if (current < previous) {
      return (
        <div className="flex items-center text-green-500">
          <ChevronUp className="h-4 w-4" />
          <span>{previous - current}</span>
        </div>
      )
    } else if (current > previous) {
      return (
        <div className="flex items-center text-red-500">
          <ChevronDown className="h-4 w-4" />
          <span>{current - previous}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-muted-foreground">
          <Minus className="h-4 w-4" />
        </div>
      )
    }
  }

  // 티어 배지 컴포넌트
  const TierBadge = ({ tier }: { tier: string }) => {
    const tierInfo = tiers.find((t) => t.name === tier)
    if (!tierInfo) return null

    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-none"
        style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
      >
        {tierInfo.icon}
        <span>{tier}</span>
      </Badge>
    )
  }

  // 통계 섹션으로 스크롤
  const scrollToStats = () => {
    if (statsRef.current) {
      statsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // 애니메이션 변수
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  }

  // 랭킹 카드 컴포넌트
  const RankingCard = ({ data, rank }: { data: UserRanking; rank: number }) => {
    const colors = {
      1: {
        border: "border-[#FFD700]",
        bg: "from-[#FFD700]/10 to-[#FFD700]/5",
        text: "text-[#FFD700]",
        icon: <Crown className="h-10 w-10 text-[#FFD700]" />,
        shadow: "shadow-[#FFD700]/20",
      },
      2: {
        border: "border-[#C0C0C0]",
        bg: "from-[#C0C0C0]/10 to-[#C0C0C0]/5",
        text: "text-[#C0C0C0]",
        icon: <Medal className="h-8 w-8 text-[#C0C0C0]" />,
        shadow: "shadow-[#C0C0C0]/20",
      },
      3: {
        border: "border-[#CD7F32]",
        bg: "from-[#CD7F32]/10 to-[#CD7F32]/5",
        text: "text-[#CD7F32]",
        icon: <Award className="h-8 w-8 text-[#CD7F32]" />,
        shadow: "shadow-[#CD7F32]/20",
      },
    }

    const color = colors[rank as keyof typeof colors] || {
      border: "border-primary/20",
      bg: "from-primary/10 to-primary/5",
      text: "text-primary",
      icon: <Trophy className="h-6 w-6 text-primary" />,
      shadow: "shadow-primary/20",
    }

    return (
      <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
        <Link href={`/user/${data.uid}`}>
          <Card
            className={`relative overflow-hidden border-2 ${color.border} hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm hover:${color.shadow} group`}
          >
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${color.bg}`}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-card/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-background/80 to-background/40 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                {color.icon}
              </div>
              <CardTitle className={`text-2xl ${color.text} group-hover:text-white transition-colors duration-300`}>
                {rank}등
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center pb-2">
              <Avatar className="mx-auto h-20 w-20 border-2 border-primary/30 ring-2 ring-primary/10 group-hover:ring-4 transition-all duration-300">
                <AvatarImage src={data.photoURL || "/placeholder.svg"} alt={data.username} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-xl font-bold group-hover:text-primary transition-colors duration-300">
                {data.username}
              </h3>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {data.tier && <TierBadge tier={data.tier} />}
                {data.title && (
                  <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary backdrop-blur-sm">
                    {data.title}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RankChange current={rank} previous={data.previousRank || rank} />
              </div>
            </CardContent>

            <CardFooter className="flex justify-center pt-2">
              <div className="text-center">
                <p className={`text-3xl font-bold ${color.text}`}>{data.ctfPoints}</p>
                <p className="text-sm text-muted-foreground">CTF 포인트</p>
              </div>
            </CardFooter>
          </Card>
        </Link>
      </motion.div>
    )
  }

  // 스켈레톤 로딩 컴포넌트
  const SkeletonCard = () => (
    <Card className="border border-primary/10 bg-card/30 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 animate-pulse"></div>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-muted/50 animate-pulse"></div>
        <div className="h-6 w-24 bg-muted/50 animate-pulse rounded"></div>
        <div className="h-4 w-16 bg-muted/50 animate-pulse rounded"></div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="h-8 w-16 bg-muted/50 animate-pulse rounded"></div>
      </CardFooter>
    </Card>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-background/80">
      <Navbar />
      {/* 동적 배경 효과 */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* 그라데이션 오브 */}
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-30"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px) rotate(${scrollY * 0.02}deg)`,
            transition: "transform 0.5s ease-out",
          }}
        ></div>
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 blur-3xl opacity-20"
          style={{
            transform: `translate(${-mousePosition.x * 0.01}px, ${-mousePosition.y * 0.01}px) rotate(${-scrollY * 0.01}deg)`,
            transition: "transform 0.7s ease-out",
          }}
        ></div>
        <div
          className="absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 blur-3xl opacity-20"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px) rotate(${scrollY * 0.015}deg)`,
            transition: "transform 0.6s ease-out",
          }}
        ></div>

        {/* 파티클 효과 */}
        <Particles className="absolute inset-0" quantity={40} />

        {/* 그리드 패턴 */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,black,rgba(0,0,0,0))]"></div>
      </div>
      <main className="flex-1 relative">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 m-4 z-10 relative backdrop-blur-sm"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                이 페이지는 로그인이 필요합니다.{" "}
                <Link href="/login" className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-100">
                  로그인
                </Link>{" "}
                또는{" "}
                <Link
                  href="/register"
                  className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-100"
                >
                  회원가입
                </Link>
                을 해주세요。
              </p>
            </div>
          </motion.div>
        )}

        {/* 헤더 섹션 */}
        <section className="relative py-20 md:py-24 lg:py-28 overflow-hidden">
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-[800px] text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Badge
                  className="mb-4 px-3 py-1 text-sm border border-primary/20 bg-primary/10 backdrop-blur-sm shadow-lg"
                  variant="outline"
                >
                  <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span className="text-primary">CTF 전문가 순위</span>
                </Badge>
              </motion.div>

              <motion.h1
                className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                CTF 랭킹 시스템
              </motion.h1>

              <motion.p
                className="text-xl text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                CTF 대회에서 획득한 점수를 기반으로 한 사용자 순위를 확인하세요.
              </motion.p>

              <motion.div
                className="flex flex-wrap justify-center gap-4 mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  랭킹 보기
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary/20 bg-background/30 backdrop-blur-sm"
                  onClick={() => {
                    setShowTierInfo(!showTierInfo)
                    scrollToStats()
                  }}
                >
                  <Layers className="mr-2 h-5 w-5" />
                  티어 시스템
                </Button>
                {isAdmin(userProfile) && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    관리자 패널
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* 관리자 패널 */}
        {isAdmin(userProfile) && showAdminPanel && (
          <motion.section
            className="py-8 relative z-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="container mx-auto px-4 md:px-6">
              <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Settings className="h-5 w-5" />
                    관리자 패널
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      variant="outline"
                      className="border-red-500/20 text-red-600 hover:bg-red-500/10 bg-transparent"
                      onClick={() => setResetDialogOpen(true)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      전체 랭킹 초기화
                    </Button>
                    <Button variant="outline" onClick={fetchUsersData}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      데이터 새로고침
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>
        )}

        {/* 플랫폼 통계 섹션 */}
        <motion.section
          className="py-8 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{totalUsers || 120}</h3>
                  <p className="text-sm text-muted-foreground">등록된 사용자</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <Trophy className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{totalCtfs || 12}</h3>
                  <p className="text-sm text-muted-foreground">CTF 대회</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <Calendar className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{filteredUsers.length}</h3>
                  <p className="text-sm text-muted-foreground">활성 참가자</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.section>

        {/* 상위 랭킹 섹션 */}
        <section className="py-16 md:py-20 relative z-10">
          <div className="container mx-auto px-4 md:px-6">
            {isLoading ? (
              <motion.div className="grid gap-6 md:grid-cols-3" variants={container} initial="hidden" animate="show">
                {[...Array(3)].map((_, i) => (
                  <motion.div key={i} variants={item}>
                    <SkeletonCard />
                  </motion.div>
                ))}
              </motion.div>
            ) : filteredUsers.length > 0 ? (
              <motion.div variants={container} initial="hidden" animate="show">
                {/* 상위 3명 - 시상식 스타일 */}
                <motion.div className="flex justify-center items-end gap-8 mb-12" variants={item}>
                  {/* 2등 - 왼쪽, 낮은 높이 */}
                  {filteredUsers.length > 1 && (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="absolute -inset-4 bg-gradient-to-r from-gray-400/20 via-gray-500/30 to-gray-400/20 rounded-2xl blur-xl opacity-60"></div>
                        <div className="relative transform scale-90 z-10">
                          <RankingCard data={filteredUsers[1]} rank={2} />
                        </div>
                      </div>
                      {/* 2등 받침대 */}
                      <div className="w-32 h-16 bg-gradient-to-t from-gray-300/30 to-gray-400/20 rounded-t-lg border-t-4 border-gray-400 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-400">2</span>
                      </div>
                    </div>
                  )}

                  {/* 1등 - 가운데, 가장 높은 높이 */}
                  {filteredUsers.length > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-yellow-400/20 rounded-3xl blur-2xl animate-pulse"></div>
                        <div className="relative transform scale-110 z-10">
                          <RankingCard data={filteredUsers[0]} rank={1} />
                        </div>
                        {/* 왕관 효과 */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                          <Crown className="h-12 w-12 text-yellow-500 animate-bounce" />
                        </div>
                      </div>
                      {/* 1등 받침대 */}
                      <div className="w-36 h-24 bg-gradient-to-t from-yellow-300/30 to-yellow-400/20 rounded-t-lg border-t-4 border-yellow-400 flex items-center justify-center">
                        <span className="text-3xl font-bold text-yellow-500">1</span>
                      </div>
                    </div>
                  )}

                  {/* 3등 - 오른쪽, 중간 높이 */}
                  {filteredUsers.length > 2 && (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="absolute -inset-4 bg-gradient-to-r from-orange-400/20 via-orange-500/30 to-orange-400/20 rounded-2xl blur-xl opacity-60"></div>
                        <div className="relative transform scale-85 z-10">
                          <RankingCard data={filteredUsers[2]} rank={3} />
                        </div>
                      </div>
                      {/* 3등 받침대 */}
                      <div className="w-28 h-12 bg-gradient-to-t from-orange-300/30 to-orange-400/20 rounded-t-lg border-t-4 border-orange-400 flex items-center justify-center">
                        <span className="text-xl font-bold text-orange-400">3</span>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* 랭킹 테이블 */}
                <motion.div variants={item}>
                  <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="사용자 검색..."
                        className="pl-10 rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <Card className="rounded-lg border border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden shadow-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-primary/5 border-b border-primary/10">
                          <TableHead className="w-16 text-center font-medium text-primary/80">순위</TableHead>
                          <TableHead className="font-medium text-primary/80">사용자</TableHead>
                          <TableHead className="text-center font-medium text-primary/80">레벨</TableHead>
                          <TableHead className="text-center font-medium text-primary/80">티어</TableHead>
                          <TableHead className="text-right font-medium text-primary/80">CTF 점수</TableHead>
                          {isAdmin(userProfile) && (
                            <TableHead className="text-center font-medium text-primary/80">관리</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((data, index) => {
                          const rank = index + 1

                          return (
                            <TableRow
                              key={data.uid}
                              className={`cursor-pointer hover:bg-primary/10 transition-colors duration-200 ${
                                data.uid === user?.uid ? "bg-primary/10" : ""
                              }`}
                              onClick={() => router.push(`/user/${data.uid}`)}
                            >
                              <TableCell className="text-center font-medium">
                                {rank <= 3 && (
                                  <span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full 
                                    ${
                                      rank === 1
                                        ? "bg-[#FFD700]/10 text-[#FFD700]"
                                        : rank === 2
                                          ? "bg-[#A8A9AD]/10 text-[#A8A9AD]"
                                          : "bg-[#CD7F32]/10 text-[#CD7F32]"
                                    }`}
                                  >
                                    {rank}
                                  </span>
                                )}
                                {rank > 3 && <span className="font-medium">{rank}</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 ring-1 ring-primary/20 transition-all duration-300 hover:ring-2">
                                    <AvatarImage src={data.photoURL || "/placeholder.svg"} alt={data.username} />
                                    <AvatarFallback>
                                      <User className="h-5 w-5" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">
                                        {data.username}
                                        {data.uid === user?.uid && <span className="ml-1 text-primary">(나)</span>}
                                      </p>
                                      {data.title && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-primary/10 text-primary backdrop-blur-sm"
                                        >
                                          {data.title}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <RankChange current={rank} previous={data.previousRank || rank} />
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  Lv.{data.level || 1}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <TierBadge tier={data.tier || "Bronze"} />
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                <span
                                  className="bg-clip-text text-transparent bg-gradient-to-r 
                                  from-blue-500 to-purple-500 text-lg"
                                >
                                  {data.ctfPoints}
                                </span>
                              </TableCell>
                              {isAdmin(userProfile) && (
                                <TableCell className="text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditUser(data)
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                </motion.div>

                {/* 티어 시스템 정보 */}
                {showTierInfo && (
                  <motion.div
                    variants={item}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    ref={statsRef}
                    className="mt-12"
                  >
                    <Card className="mb-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          티어 시스템
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-6 text-muted-foreground">
                          티어 시스템은 CTF 대회에서 획득한 점수를 기반으로 등급을 부여합니다. 더 높은 티어에 도달하기
                          위해 CTF 대회에 참여하고 포인트를 획득하세요.
                        </p>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {tiers.map((tier) => (
                            <Card
                              key={tier.name}
                              className="border border-primary/20 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300 hover:shadow-lg"
                              style={{ borderColor: `${tier.color}40` }}
                            >
                              <CardHeader className="pb-2 text-center">
                                <div
                                  className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2"
                                  style={{ borderColor: tier.color, backgroundColor: `${tier.color}20` }}
                                >
                                  <div style={{ color: tier.color, transform: "scale(1.5)" }}>{tier.icon}</div>
                                </div>
                                <CardTitle style={{ color: tier.color }}>{tier.name}</CardTitle>
                              </CardHeader>
                              <CardContent className="text-center pb-2">
                                <p className="text-sm text-muted-foreground mb-2">필요 포인트</p>
                                <p className="text-2xl font-bold" style={{ color: tier.color }}>
                                  {tier.minPoints}+
                                </p>
                              </CardContent>
                              <CardFooter className="justify-center pt-0">
                                <Badge
                                  variant="outline"
                                  className="border-none"
                                  style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                                >
                                  {tier.name === "Bronze" && "시작"}
                                  {tier.name === "Silver" && "초급"}
                                  {tier.name === "Gold" && "중급"}
                                  {tier.name === "Platinum" && "고급"}
                                  {tier.name === "Diamond" && "전문가"}
                                  {tier.name === "Master" && "마스터"}
                                  {tier.name === "Grandmaster" && "그랜드마스터"}
                                  {tier.name === "Legend" && "레전드"}
                                </Badge>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-28 h-28 mb-6 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <AlertCircle className="h-14 w-14 text-primary opacity-70" />
                </div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                  랭킹 정보가 없습니다
                </h3>
                <p className="text-muted-foreground mt-3 max-w-md">
                  아직 CTF 랭킹 정보가 없습니다. CTF 대회에 참여하여 점수를 획득해보세요.
                </p>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      {/* 사용자 편집 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 정보 편집</DialogTitle>
            <DialogDescription>{selectedUser?.username}님의 CTF 점수와 티어를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ctfPoints">CTF 점수</Label>
              <Input
                id="ctfPoints"
                type="number"
                value={editForm.ctfPoints}
                onChange={(e) => setEditForm({ ...editForm, ctfPoints: Number.parseInt(e.target.value) || 0 })}
                placeholder="CTF 점수를 입력하세요"
              />
            </div>
            <div>
              <Label htmlFor="tier">티어</Label>
              <Select value={editForm.tier} onValueChange={(value) => setEditForm({ ...editForm, tier: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="티어를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.name} value={tier.name}>
                      <div className="flex items-center gap-2">
                        <div style={{ color: tier.color }}>{tier.icon}</div>
                        <span>{tier.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">수정 사유</Label>
              <Textarea
                id="reason"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                placeholder="수정 사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateUser}>수정 적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 랭킹 초기화 확인 다이얼로그 */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 랭킹 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              모든 사용자의 CTF 점수와 티어가 초기화됩니다. 이 작업은 되돌릴 수 없습니다. 정말로 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAllRankings} className="bg-red-600 hover:bg-red-700">
              초기화 실행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
