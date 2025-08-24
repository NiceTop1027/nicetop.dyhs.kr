"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { Calendar, Users, Code, Zap, ArrowRight, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Firebase imports
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { CTFContest } from "@/lib/ctf-types"

export default function LiveChallenges() {
  const [contests, setContests] = useState<CTFContest[]>([])
  const [loading, setLoading] = useState(true)
  const [featuredContest, setFeaturedContest] = useState<CTFContest | null>(null)
  const router = useRouter()
  const { userProfile } = useAuth()

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // CTF 대회 목록 불러오기
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true)
        const contestsRef = collection(db, "ctf_contests")

        // 인덱스 오류를 방지하기 위해 쿼리 방식 변경
        let querySnapshot

        if (isAdmin) {
          // 관리자는 모든 대회 볼 수 있음
          const q = query(contestsRef, orderBy("startTime", "desc"))
          querySnapshot = await getDocs(q)
        } else {
          // 일반 사용자는 공개 대회만 볼 수 있음
          // 모든 대회를 가져온 후 클라이언트에서 필터링
          const q = query(contestsRef, orderBy("startTime", "desc"))
          const allContestsSnapshot = await getDocs(q)

          // 클라이언트에서 isPublic이 true인 항목만 필터링
          const publicContests = allContestsSnapshot.docs.filter((doc) => doc.data().isPublic === true)

          // QuerySnapshot과 유사한 형태로 만들기
          querySnapshot = {
            forEach: (callback: (doc: any) => void) => {
              publicContests.forEach(callback)
            },
          }
        }

        const contestsData: CTFContest[] = []
        const now = new Date()
        const upcoming: CTFContest[] = []
        const active: CTFContest[] = []
        const completed: CTFContest[] = []

        querySnapshot.forEach((doc: any) => {
          const data = doc.data()
          const startTime = data.startTime?.toDate() || new Date()
          const endTime = data.endTime?.toDate() || new Date()

          let status: "upcoming" | "active" | "completed" = "upcoming"
          if (now < startTime) {
            status = "upcoming"
          } else if (now >= startTime && now <= endTime) {
            status = "active"
          } else {
            status = "completed"
          }

          const contest = {
            id: doc.id,
            ...data,
            status,
          } as CTFContest

          contestsData.push(contest)

          // 상태별로 분류
          if (status === "upcoming") {
            upcoming.push(contest)
          } else if (status === "active") {
            active.push(contest)
          } else {
            completed.push(contest)
          }
        })

        // 대회 정렬
        upcoming.sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
        active.sort((a, b) => b.endTime.toDate().getTime() - a.endTime.toDate().getTime())
        completed.sort((a, b) => b.endTime.toDate().getTime() - a.endTime.toDate().getTime())

        setContests(contestsData)

        // 추천 대회 설정 - 진행 중인 대회 우선
        if (active.length > 0) {
          setFeaturedContest(active[0])
        } else if (upcoming.length > 0) {
          setFeaturedContest(upcoming[0])
        } else if (completed.length > 0) {
          setFeaturedContest(completed[0])
        } else {
          // 대회가 없는 경우 null 설정
          setFeaturedContest(null)
        }
      } catch (error) {
        console.error("Error fetching contests:", error)
        // 오류 발생 시 null 설정
        setFeaturedContest(null)
      } finally {
        setLoading(false)
      }
    }

    fetchContests()
  }, [isAdmin])

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 남은 시간 계산 함수
  const getTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()

    if (diff <= 0) return "종료됨"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}일 ${hours}시간 남음`
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`
    return `${minutes}분 남음`
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-2xl backdrop-blur-xl">
          <div className="absolute -inset-px rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 animate-rotate-gradient"></div>
            <div className="absolute inset-[1px] rounded-2xl bg-black/80"></div>
          </div>

          <div className="relative rounded-xl bg-black/80 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">CTF 정보를 불러오는 중...</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (!featuredContest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-2xl backdrop-blur-xl">
          <div className="absolute -inset-px rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 animate-rotate-gradient"></div>
            <div className="absolute inset-[1px] rounded-2xl bg-black/80"></div>
          </div>

          <div className="relative rounded-xl bg-black/80 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">CTF 대회가 없습니다</h3>
              <p className="text-muted-foreground mb-4">현재 등록된 CTF 대회가 없습니다. 관리자에게 문의하세요.</p>
              <Link href="/ctf">
                <Button variant="outline" className="rounded-full">
                  CTF 페이지로 이동
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-2xl backdrop-blur-xl">
        {/* Glowing border effect */}
        <div className="absolute -inset-px rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 animate-rotate-gradient"></div>
          <div className="absolute inset-[1px] rounded-2xl bg-black/80"></div>
        </div>

        <div className="relative rounded-xl bg-black/80 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="bg-gradient-to-r from-primary to-blue-500 text-white border-0">
                  {featuredContest.status === "active"
                    ? "진행 중"
                    : featuredContest.status === "upcoming"
                      ? "예정됨"
                      : "종료됨"}
                </Badge>
                {featuredContest.status === "active" && (
                  <Badge variant="outline" className="border-red-500/50 text-red-400 animate-pulse">
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                    {getTimeRemaining(featuredContest.endTime.toDate())}
                  </Badge>
                )}
                {featuredContest.status === "upcoming" && (
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {formatDate(featuredContest.startTime.toDate())} 시작
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                {featuredContest.title}
              </h3>
              <p className="text-muted-foreground">
                {featuredContest.description.substring(0, 100).replace(/<[^>]*>?/gm, "")}...
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="rounded-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 border-0 shadow-lg hover:shadow-primary/20"
                onClick={() => router.push(`/ctf/${featuredContest.id}`)}
              >
                {featuredContest.status === "active"
                  ? "참가하기"
                  : featuredContest.status === "upcoming"
                    ? "자세히 보기"
                    : "결과 확인하기"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/10 bg-black/30 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/20"
                onClick={() => router.push(`/ctf`)}
              >
                모든 대회 보기
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Users,
                label: "참가자",
                value: featuredContest.participants?.length || 0,
                color: "from-blue-600/20 to-blue-400/20",
              },
              {
                icon: Code,
                label: "문제",
                value: featuredContest.problemCount || 0,
                color: "from-purple-600/20 to-purple-400/20",
              },
              {
                icon: Zap,
                label: "상태",
                value:
                  featuredContest.status === "active"
                    ? "진행 중"
                    : featuredContest.status === "upcoming"
                      ? "예정됨"
                      : "종료됨",
                color: "from-green-600/20 to-green-400/20",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/10 bg-black/30 p-4 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20 group-hover:from-primary/30 group-hover:to-blue-500/30 transition-all duration-300">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
