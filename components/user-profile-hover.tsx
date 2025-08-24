"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Trophy, Calendar, MapPin, ExternalLink, Crown, Shield, Activity, Flag } from "lucide-react"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Skeleton } from "@/components/ui/skeleton"

interface UserData {
  uid: string
  username: string
  displayName?: string
  email?: string
  photoURL?: string
  role?: string
  isAdmin?: boolean
  title?: string
  bio?: string
  location?: string
  website?: string
  joinedAt?: any
  lastActive?: any

  // 점수 관련
  points?: number
  wargameScore?: number
  ctfScore?: number
  level?: number

  // 통계
  solvedWargameProblems?: string[]
  solvedCTFProblems?: string[]
  totalSolved?: number
  streak?: number
  rank?: number

  // 업적
  achievements?: string[]
  badges?: string[]

  // 소셜
  followers?: number
  following?: number

  // 활동
  recentActivity?: any[]
}

interface UserProfileHoverProps {
  userId: string
  username: string
  children: React.ReactNode
}

export function UserProfileHover({ userId, username, children }: UserProfileHoverProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchUserData = async () => {
    if (!userId || isLoading || userData) return

    setIsLoading(true)
    try {
      // 기본 사용자 정보 가져오기
      const userRef = doc(db, "users", userId)
      const userSnap = await getDoc(userRef)

      let user: UserData = {
        uid: userId,
        username: username,
      }

      if (userSnap.exists()) {
        const userData = userSnap.data()
        user = {
          ...user,
          ...userData,
          displayName: userData.displayName || userData.username || username,
          role: userData.role || "user",
          isAdmin: userData.role === "admin" || userData.isAdmin === true || userData.title === "관리자",
          title: userData.title || (userData.role === "admin" ? "관리자" : "사용자"),
        }
      }

      // 워게임 점수 계산
      const wargameLogsRef = collection(db, "wargame_solve_logs")
      const wargameQuery = query(wargameLogsRef, where("userId", "==", userId))
      const wargameSnapshot = await getDocs(wargameQuery)

      let wargameScore = 0
      const solvedWargameProblems: string[] = []
      wargameSnapshot.forEach((doc) => {
        const data = doc.data()
        wargameScore += data.points || 0
        if (data.challengeId && !solvedWargameProblems.includes(data.challengeId)) {
          solvedWargameProblems.push(data.challengeId)
        }
      })

      // CTF 점수 계산
      const ctfLogsRef = collection(db, "ctf_solve_logs")
      const ctfQuery = query(ctfLogsRef, where("userId", "==", userId))
      const ctfSnapshot = await getDocs(ctfQuery)

      let ctfScore = 0
      const solvedCTFProblems: string[] = []
      ctfSnapshot.forEach((doc) => {
        const data = doc.data()
        ctfScore += data.points || 0
        if (data.problemId && !solvedCTFProblems.includes(data.problemId)) {
          solvedCTFProblems.push(data.problemId)
        }
      })

      // 총 점수 및 레벨 계산
      const totalPoints = wargameScore + ctfScore
      const level = Math.floor(totalPoints / 1000) + 1

      // 최근 활동 가져오기
      const recentWargameQuery = query(
        wargameLogsRef,
        where("userId", "==", userId),
        orderBy("solvedAt", "desc"),
        limit(3),
      )
      const recentWargameSnapshot = await getDocs(recentWargameQuery)
      const recentActivity: any[] = []

      recentWargameSnapshot.forEach((doc) => {
        const data = doc.data()
        recentActivity.push({
          type: "wargame",
          title: data.challengeTitle || "워게임 문제",
          points: data.points || 0,
          solvedAt: data.solvedAt,
        })
      })

      // 사용자 통계 업데이트
      const updatedUser: UserData = {
        ...user,
        points: totalPoints,
        wargameScore,
        ctfScore,
        level,
        solvedWargameProblems,
        solvedCTFProblems,
        totalSolved: solvedWargameProblems.length + solvedCTFProblems.length,
        recentActivity,
      }

      setUserData(updatedUser)
    } catch (error) {
      console.error("Error fetching user data:", error)
      // 기본 사용자 정보라도 설정
      setUserData({
        uid: userId,
        username: username,
        displayName: username,
        role: "user",
        isAdmin: false,
        title: "사용자",
        points: 0,
        wargameScore: 0,
        ctfScore: 0,
        level: 1,
        totalSolved: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !userData && !isLoading) {
      fetchUserData()
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "정보 없음"
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "정보 없음"
    }
  }

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return "정보 없음"
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (days === 0) return "오늘"
      if (days === 1) return "어제"
      if (days < 7) return `${days}일 전`
      if (days < 30) return `${Math.floor(days / 7)}주 전`
      if (days < 365) return `${Math.floor(days / 30)}개월 전`
      return `${Math.floor(days / 365)}년 전`
    } catch {
      return "정보 없음"
    }
  }

  const getTierInfo = (level: number) => {
    if (level >= 50) return { name: "레전드", color: "text-red-400", bgColor: "bg-red-500/10" }
    if (level >= 30) return { name: "마스터", color: "text-purple-400", bgColor: "bg-purple-500/10" }
    if (level >= 20) return { name: "다이아몬드", color: "text-blue-400", bgColor: "bg-blue-500/10" }
    if (level >= 15) return { name: "플래티넘", color: "text-cyan-400", bgColor: "bg-cyan-500/10" }
    if (level >= 10) return { name: "골드", color: "text-yellow-400", bgColor: "bg-yellow-500/10" }
    if (level >= 5) return { name: "실버", color: "text-gray-400", bgColor: "bg-gray-500/10" }
    return { name: "브론즈", color: "text-amber-600", bgColor: "bg-amber-500/10" }
  }

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-96 p-0 bg-gray-900/95 border-gray-700/50 backdrop-blur-md shadow-2xl"
        side="top"
        align="center"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full bg-gray-800" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32 bg-gray-800" />
                      <Skeleton className="h-4 w-24 bg-gray-800" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full bg-gray-800" />
                </div>
              ) : userData ? (
                <div className="relative overflow-hidden">
                  {/* 관리자 특별 배경 */}
                  {userData.isAdmin && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-red-500/10" />
                  )}

                  {/* 헤더 */}
                  <div
                    className={`relative p-6 ${userData.isAdmin ? "bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-red-500/20" : "bg-gray-800/30"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar
                          className={`h-16 w-16 border-2 ${userData.isAdmin ? "border-yellow-500/50" : "border-gray-600"}`}
                        >
                          <AvatarImage src={userData.photoURL || "/placeholder.svg"} alt={userData.displayName} />
                          <AvatarFallback
                            className={`text-lg font-bold ${userData.isAdmin ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white" : "bg-gray-700 text-white"}`}
                          >
                            {userData.displayName?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {userData.isAdmin && (
                          <div className="absolute -top-1 -right-1">
                            <Crown className="h-6 w-6 text-yellow-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-bold text-lg truncate ${userData.isAdmin ? "text-yellow-400" : "text-white"}`}
                          >
                            {userData.displayName}
                          </h3>
                          {userData.isAdmin && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              관리자
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTierInfo(userData.level || 1).color} ${getTierInfo(userData.level || 1).bgColor} border-current/30`}
                          >
                            <Trophy className="h-3 w-3 mr-1" />
                            {getTierInfo(userData.level || 1).name}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
                            Lv.{userData.level || 1}
                          </Badge>
                        </div>

                        {userData.bio && <p className="text-sm text-gray-400 line-clamp-2 mb-2">{userData.bio}</p>}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {userData.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{userData.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(userData.joinedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-4 space-y-4">
                    {/* 점수 통계 */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className={`text-lg font-bold ${userData.isAdmin ? "text-yellow-400" : "text-cyan-400"}`}>
                          {userData.points?.toLocaleString() || 0}
                        </div>
                        <div className="text-xs text-gray-400">총 점수</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="text-lg font-bold text-green-400">{userData.totalSolved || 0}</div>
                        <div className="text-xs text-gray-400">해결 문제</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="text-lg font-bold text-purple-400">{userData.level || 1}</div>
                        <div className="text-xs text-gray-400">레벨</div>
                      </div>
                    </div>

                    <Separator className="bg-gray-700/50" />

                    {/* 세부 점수 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-400">워게임</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-400">
                            {userData.wargameScore?.toLocaleString() || 0}점
                          </div>
                          <div className="text-xs text-gray-400">{userData.solvedWargameProblems?.length || 0}문제</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-medium text-purple-400">CTF</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-purple-400">
                            {userData.ctfScore?.toLocaleString() || 0}점
                          </div>
                          <div className="text-xs text-gray-400">{userData.solvedCTFProblems?.length || 0}문제</div>
                        </div>
                      </div>
                    </div>

                    {/* 최근 활동 */}
                    {userData.recentActivity && userData.recentActivity.length > 0 && (
                      <>
                        <Separator className="bg-gray-700/50" />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <Activity className="h-4 w-4" />
                            최근 활동
                          </div>
                          <div className="space-y-2">
                            {userData.recentActivity.slice(0, 3).map((activity, index) => (
                              <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-800/30">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {activity.type === "wargame" ? (
                                    <Shield className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                  ) : (
                                    <Flag className="h-3 w-3 text-purple-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs text-gray-300 truncate">{activity.title}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs font-medium text-cyan-400">+{activity.points}</span>
                                  <span className="text-xs text-gray-500">{formatRelativeTime(activity.solvedAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* 관리자 특별 메시지 */}
                    {userData.isAdmin && (
                      <>
                        <Separator className="bg-yellow-500/20" />
                        <div className="text-center p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                          <div className="flex items-center justify-center gap-2 text-yellow-400 font-medium">
                            <Crown className="h-4 w-4" />
                            <span>NT Security 관리자</span>
                          </div>
                          <p className="text-xs text-yellow-500/80 mt-1">보안 전문가이자 플랫폼 관리자입니다</p>
                        </div>
                      </>
                    )}

                    {/* 웹사이트 링크 */}
                    {userData.website && (
                      <div className="pt-2">
                        <a
                          href={userData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          웹사이트 방문
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400">사용자 정보를 불러올 수 없습니다</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </HoverCardContent>
    </HoverCard>
  )
}
