"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import {
  User,
  Calendar,
  Trophy,
  Terminal,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Globe,
  FileText,
  Building,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Code,
  Cpu,
  Database,
  Lock,
  Puzzle,
  Server,
  Smartphone,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
  BookOpen,
  GraduationCap,
  Award,
  Target,
  Zap,
} from "lucide-react"
import {
  doc as firebaseDoc,
  getDoc as firebaseGetDoc,
  query,
  where,
  getDocs,
  Timestamp,
  collection,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { type UserProfile, type SolvedChallenge, normalizeUserProfileData, type Affiliation } from "@/lib/user-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { calculateLevelFromExp } from "@/lib/level-system"
import { TIERS, getTierByPoints, getTierIcon, getNextTier, calculateTierProgress } from "@/lib/tier-system"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { followSystem } from "@/lib/follow-system"
import { FollowListModal } from "@/components/follow-list-modal"

// 커리큘럼 진도 타입 정의
type CurriculumProgress = {
  id: string
  title: string
  category: string
  totalSteps: number
  completedSteps: number
  progress: number
  lastAccessed: Timestamp
  isCompleted: boolean
  certificate?: string
}

// 카테고리별 아이콘 매핑
const categoryIcons: Record<string, React.ReactNode> = {
  "웹 해킹": <Globe className="h-4 w-4" />,
  "시스템 해킹": <Terminal className="h-4 w-4" />,
  리버싱: <Cpu className="h-4 w-4" />,
  암호학: <Lock className="h-4 w-4" />,
  포렌식: <FileText className="h-4 w-4" />,
  네트워크: <Server className="h-4 w-4" />,
  모바일: <Smartphone className="h-4 w-4" />,
  기타: <Puzzle className="h-4 w-4" />,
  "코드 분석": <Code className="h-4 w-4" />,
  데이터베이스: <Database className="h-4 w-4" />,
  CTF: <Shield className="h-4 w-4" />,
  "CTF 대회": <Trophy className="h-4 w-4" />,
}

// 난이도별 색상 매핑
const difficultyColors: Record<string, string> = {
  초급: "text-green-500",
  중급: "text-yellow-500",
  고급: "text-red-500",
  대회: "text-purple-500",
}

// 레벨에 따른 점수 계산 함수
const calculatePointsByLevel = (level: number): number => {
  const basePoints = 100
  const weights = {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.5,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 8,
    10: 10,
  }
  const weight = weights[level as keyof typeof weights] || 1
  return Math.round(basePoints * weight)
}

// 개선된 날짜 포맷 함수들
const formatDate = (date: Date) => {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatDateTime = (date: Date) => {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "방금 전"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}분 전`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}시간 전`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}일 전`
  } else {
    return formatDate(date)
  }
}

const getTimestampDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()

  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate()
  }

  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000)
  }

  if (timestamp instanceof Date) {
    return timestamp
  }

  return new Date(timestamp)
}

export default function MyPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [solvedChallenges, setSolvedChallenges] = useState<SolvedChallenge[]>([])
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [wargameCount, setWargameCount] = useState(0)
  const [ctfCount, setCtfCount] = useState(0)
  const [verifiedAffiliations, setVerifiedAffiliations] = useState<Affiliation[]>([])
  const [userLevel, setUserLevel] = useState({ level: 1, currentExp: 0, requiredExp: 100, totalExp: 0 })
  const [userTier, setUserTier] = useState(TIERS[0])
  const [nextTier, setNextTier] = useState(TIERS[1])
  const [tierProgress, setTierProgress] = useState(0)
  const [currentTab, setCurrentTab] = useState("profile")
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null)
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  const [difficultyStats, setDifficultyStats] = useState<Record<string, number>>({})
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalType, setFollowModalType] = useState<"following" | "followers">("following")

  // 현재 사용자가 관리자인지 확인
  const isCurrentUserAdmin = user && (user.email === "admin@example.com" || user.uid === "admin")

  // 디버그 로그 추가 함수
  const addDebugLog = (message: string) => {
    console.log(`[MyPage Debug] ${message}`)
    setDebugInfo((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // 커리큘럼 진도 불러오기
  const fetchCurriculumProgress = async (userId: string) => {
    try {
      addDebugLog("커리큘럼 진도 로딩 시작")

      // 사용자의 커리큘럼 진도 조회
      const progressRef = collection(db, "user_curriculum_progress")
      const progressQuery = query(progressRef, where("userId", "==", userId))
      const progressSnapshot = await getDocs(progressQuery)

      const progressData: CurriculumProgress[] = []

      for (const doc of progressSnapshot.docs) {
        const data = doc.data()

        // 커리큘럼 정보 가져오기
        const curriculumRef = firebaseDoc(db, "curriculum", data.curriculumId)
        const curriculumSnap = await firebaseGetDoc(curriculumRef)

        if (curriculumSnap.exists()) {
          const curriculumData = curriculumSnap.data()

          progressData.push({
            id: data.curriculumId,
            title: curriculumData.title || "커리큘럼",
            category: curriculumData.category || "기타",
            totalSteps: curriculumData.steps?.length || 0,
            completedSteps: data.completedSteps || 0,
            progress: data.progress || 0,
            lastAccessed: data.lastAccessed || Timestamp.now(),
            isCompleted: data.isCompleted || false,
            certificate: data.certificate,
          })
        }
      }

      // 진도순으로 정렬
      progressData.sort((a, b) => b.progress - a.progress)
      setCurriculumProgress(progressData)

      addDebugLog(`커리큘럼 진도 ${progressData.length}개 로딩 완료`)
    } catch (error) {
      addDebugLog(`커리큘럼 진도 로딩 오류: ${error}`)
      console.error("Error fetching curriculum progress:", error)
    }
  }

  // 사용자 프로필 불러오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        addDebugLog(`사용자 프로필 로딩 시작: ${user.uid}`)

        const userRef = firebaseDoc(db, "users", user.uid)
        const userSnap = await firebaseGetDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          addDebugLog(`사용자 데이터 발견: ${JSON.stringify(Object.keys(userData))}`)

          const normalizedProfile = normalizeUserProfileData(userData, userSnap.id)
          setProfile(normalizedProfile)

          // 팔로우/팔로워 수 불러오기
          const [following, followers] = await Promise.all([
            followSystem.getFollowing(userSnap.id),
            followSystem.getFollowers(userSnap.id),
          ])

          // 중복 제거
          const uniqueFollowing = following.filter(
            (item, index, self) => index === self.findIndex((t) => t.userId === item.userId),
          )
          const uniqueFollowers = followers.filter(
            (item, index, self) => index === self.findIndex((t) => t.userId === item.userId),
          )

          setFollowingCount(uniqueFollowing.length)
          setFollowersCount(uniqueFollowers.length)

          // 인증된 소속 정보 설정
          if (normalizedProfile.affiliations && Array.isArray(normalizedProfile.affiliations)) {
            const verified = normalizedProfile.affiliations.filter((aff) => aff.isVerified)
            setVerifiedAffiliations(verified)
          } else {
            setVerifiedAffiliations([])
          }

          // 레벨 계산
          const totalExp = userData.exp || 0
          const levelInfo = calculateLevelFromExp(totalExp)
          setUserLevel(levelInfo)

          // 티어 계산
          const totalPoints = userData.points || 0
          const tier = getTierByPoints(totalPoints)
          setUserTier(tier)

          // 다음 티어 및 진행률 계산
          const next = getNextTier(tier)
          setNextTier(next)
          if (next) {
            const progress = calculateTierProgress(totalPoints, tier)
            setTierProgress(progress)
          } else {
            setTierProgress(100)
          }

          // 해결한 문제 불러오기
          await fetchSolvedChallenges(userSnap.id, normalizedProfile)

          // 커리큘럼 진도 불러오기
          // await fetchCurriculumProgress(userSnap.id)
        } else {
          addDebugLog("사용자 프로필이 존재하지 않음")
          toast({
            title: "프로필을 찾을 수 없습니다",
            description: "사용자 프로필이 존재하지 않습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        addDebugLog(`프로필 로딩 오류: ${error}`)
        console.error("Error fetching user profile:", error)
        toast({
          title: "오류 발생",
          description: "사용자 프로필을 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchUserProfile()
    } else {
      setIsLoading(false)
    }
  }, [user, router, toast])

  // 해결한 문제 불러오기 - 모든 가능한 소스에서 데이터 수집
  const fetchSolvedChallenges = async (userId: string, profileData: UserProfile | null) => {
    addDebugLog("=== 해결 문제 데이터 수집 시작 ===")

    try {
      const allChallenges: SolvedChallenge[] = []
      let wargameCount = 0
      let ctfCount = 0

      // 7. 커리큘럼 진도 데이터 수집
      addDebugLog("7. 커리큘럼 진도 데이터 수집 중...")
      try {
        const progressRef = collection(db, "user_curriculum_progress")
        const progressQuery = query(progressRef, where("userId", "==", userId))
        const progressSnapshot = await getDocs(progressQuery)

        const progressData: CurriculumProgress[] = []

        for (const doc of progressSnapshot.docs) {
          const data = doc.data()

          // 커리큘럼 정보 가져오기
          const curriculumRef = firebaseDoc(db, "curriculum", data.curriculumId)
          const curriculumSnap = await firebaseGetDoc(curriculumRef)

          if (curriculumSnap.exists()) {
            const curriculumData = curriculumSnap.data()

            progressData.push({
              id: data.curriculumId,
              title: curriculumData.title || "커리큘럼",
              category: curriculumData.category || "기타",
              totalSteps: curriculumData.steps?.length || 0,
              completedSteps: data.completedSteps || 0,
              progress: data.progress || 0,
              lastAccessed: data.lastAccessed || Timestamp.now(),
              isCompleted: data.isCompleted || false,
              certificate: data.certificate,
            })
          }
        }

        // 진도순으로 정렬
        progressData.sort((a, b) => b.progress - a.progress)
        setCurriculumProgress(progressData)

        addDebugLog(`커리큘럼 진도 ${progressData.length}개 수집 완료`)
      } catch (error) {
        addDebugLog(`커리큘럼 진도 수집 오류: ${error}`)
        console.error("Error fetching curriculum progress:", error)
      }

      // 1. user_solve_logs 컬렉션 조회 (가장 중요한 소스)
      addDebugLog("1. user_solve_logs 컬렉션 조회 중...")
      try {
        const userSolveLogsRef = collection(db, "user_solve_logs")
        const userLogsQuery = query(userSolveLogsRef, where("userId", "==", userId), orderBy("solvedAt", "desc"))
        const userLogsSnapshot = await getDocs(userLogsQuery)

        addDebugLog(`user_solve_logs에서 ${userLogsSnapshot.size}개 문서 발견`)

        for (const doc of userLogsSnapshot.docs) {
          const data = doc.data()

          const challenge: SolvedChallenge = {
            id: data.challengeId || data.problemId || doc.id,
            title: data.challengeTitle || data.problemTitle || data.title || `문제 #${doc.id.substring(0, 8)}`,
            category: data.category || (data.type === "wargame" ? "기타" : "CTF"),
            difficulty: data.difficulty || (data.level ? `레벨 ${data.level}` : "중급"),
            points: data.points || 0,
            solvedAt: data.solvedAt || data.timestamp || Timestamp.now(),
            type: data.type === "wargame" ? "wargame" : "ctf",
            contestId: data.contestId,
            contestTitle: data.contestTitle,
          }

          allChallenges.push(challenge)

          if (data.type === "wargame") {
            wargameCount++
          } else {
            ctfCount++
          }
        }
      } catch (error) {
        addDebugLog(`user_solve_logs 조회 오류: ${error}`)
      }

      // 2. wargame_solve_logs 컬렉션 조회
      addDebugLog("2. wargame_solve_logs 컬렉션 조회 중...")
      try {
        const wargameSolveLogsRef = collection(db, "wargame_solve_logs")
        const wargameLogsQuery = query(wargameSolveLogsRef, where("userId", "==", userId), orderBy("solvedAt", "desc"))
        const wargameLogsSnapshot = await getDocs(wargameLogsQuery)

        addDebugLog(`wargame_solve_logs에서 ${wargameLogsSnapshot.size}개 문서 발견`)

        for (const doc of wargameLogsSnapshot.docs) {
          const data = doc.data()
          const challengeId = data.challengeId || doc.id

          if (!allChallenges.some((c) => c.id === challengeId)) {
            allChallenges.push({
              id: challengeId,
              title: data.challengeTitle || `워게임 문제 #${challengeId.substring(0, 8)}`,
              category: data.category || "기타",
              difficulty: data.level ? `레벨 ${data.level}` : data.difficulty || "중급",
              points: data.points || 0,
              solvedAt: data.solvedAt || Timestamp.now(),
              type: "wargame",
            })
            wargameCount++
          }
        }
      } catch (error) {
        addDebugLog(`wargame_solve_logs 조회 오류: ${error}`)
      }

      // 3. ctf_solve_logs 컬렉션 조회
      addDebugLog("3. ctf_solve_logs 컬렉션 조회 중...")
      try {
        const ctfSolveLogsRef = collection(db, "ctf_solve_logs")
        const ctfLogsQuery = query(ctfSolveLogsRef, where("userId", "==", userId), orderBy("solvedAt", "desc"))
        const ctfLogsSnapshot = await getDocs(ctfLogsQuery)

        addDebugLog(`ctf_solve_logs에서 ${ctfLogsSnapshot.size}개 문서 발견`)

        for (const doc of ctfLogsSnapshot.docs) {
          const data = doc.data()
          const problemId = data.problemId || data.challengeId || doc.id

          if (!allChallenges.some((c) => c.id === problemId)) {
            allChallenges.push({
              id: problemId,
              title: data.problemTitle || data.challengeTitle || `CTF 문제 #${problemId.substring(0, 8)}`,
              category: data.category || "CTF",
              difficulty: data.difficulty || "중급",
              points: data.points || 0,
              solvedAt: data.solvedAt || Timestamp.now(),
              type: "ctf",
              contestId: data.contestId,
              contestTitle: data.contestTitle,
            })
            ctfCount++
          }
        }
      } catch (error) {
        addDebugLog(`ctf_solve_logs 조회 오류: ${error}`)
      }

      // 4. 워게임 문제에서 직접 solvedBy 확인
      addDebugLog("4. 워게임 문제 컬렉션에서 solvedBy 확인 중...")
      try {
        const wargameProblemsRef = collection(db, "wargame_problems")
        const wargameProblemsSnapshot = await getDocs(wargameProblemsRef)

        for (const doc of wargameProblemsSnapshot.docs) {
          const data = doc.data()
          if (data.solvedBy && Array.isArray(data.solvedBy) && data.solvedBy.includes(userId)) {
            const challengeId = doc.id

            if (!allChallenges.some((c) => c.id === challengeId)) {
              // 해결 시간 찾기 (solvedTimes 배열에서)
              let solvedAt = Timestamp.now()
              if (data.solvedTimes && Array.isArray(data.solvedTimes)) {
                const userSolveTime = data.solvedTimes.find((st: any) => st.userId === userId)
                if (userSolveTime && userSolveTime.timestamp) {
                  solvedAt = userSolveTime.timestamp
                }
              }

              allChallenges.push({
                id: challengeId,
                title: data.title || `워게임 문제 #${challengeId.substring(0, 8)}`,
                category: data.category || "기타",
                difficulty: data.level ? `레벨 ${data.level}` : data.difficulty || "중급",
                points: calculatePointsByLevel(data.level || 1),
                solvedAt: solvedAt,
                type: "wargame",
              })
              wargameCount++
            }
          }
        }
      } catch (error) {
        addDebugLog(`워게임 문제 컬렉션 조회 오류: ${error}`)
      }

      // 5. CTF 문제에서 직접 solvedBy 확인
      addDebugLog("5. CTF 문제 컬렉션에서 solvedBy 확인 중...")
      try {
        const ctfProblemsRef = collection(db, "ctf_problems")
        const ctfProblemsSnapshot = await getDocs(ctfProblemsRef)

        for (const doc of ctfProblemsSnapshot.docs) {
          const data = doc.data()
          if (data.solvedBy && Array.isArray(data.solvedBy) && data.solvedBy.includes(userId)) {
            const problemId = doc.id

            if (!allChallenges.some((c) => c.id === problemId)) {
              // 해결 시간 찾기
              let solvedAt = Timestamp.now()
              if (data.solvedTimes && Array.isArray(data.solvedTimes)) {
                const userSolveTime = data.solvedTimes.find((st: any) => st.userId === userId)
                if (userSolveTime && userSolveTime.timestamp) {
                  solvedAt = userSolveTime.timestamp
                }
              }

              // 대회 정보 가져오기
              let contestTitle = ""
              if (data.contestId) {
                try {
                  const contestRef = firebaseDoc(db, "ctf_contests", data.contestId)
                  const contestSnap = await firebaseGetDoc(contestRef)
                  if (contestSnap.exists()) {
                    contestTitle = contestSnap.data().title || ""
                  }
                } catch (error) {
                  addDebugLog(`CTF 대회 정보 조회 오류: ${error}`)
                }
              }

              allChallenges.push({
                id: problemId,
                title: data.title || `CTF 문제 #${problemId.substring(0, 8)}`,
                category: data.category || "CTF",
                difficulty: data.difficulty || "중급",
                points: data.points || 0,
                solvedAt: solvedAt,
                type: "ctf",
                contestId: data.contestId,
                contestTitle: contestTitle,
              })
              ctfCount++
            }
          }
        }
      } catch (error) {
        addDebugLog(`CTF 문제 컬렉션 조회 오류: ${error}`)
      }

      // 6. 사용자 프로필의 solvedProblems 확인
      addDebugLog("6. 사용자 프로필의 solvedProblems 확인 중...")
      if (profileData && profileData.solvedProblems && Array.isArray(profileData.solvedProblems)) {
        for (const problemId of profileData.solvedProblems) {
          if (!allChallenges.some((c) => c.id === problemId)) {
            // 워게임 문제인지 CTF 문제인지 확인
            try {
              // 먼저 워게임에서 찾기
              const wargameProblemRef = firebaseDoc(db, "wargame_problems", problemId)
              const wargameProblemSnap = await firebaseGetDoc(wargameProblemRef)

              if (wargameProblemSnap.exists()) {
                const data = wargameProblemSnap.data()
                allChallenges.push({
                  id: problemId,
                  title: data.title || `워게임 문제 #${problemId.substring(0, 8)}`,
                  category: data.category || "기타",
                  difficulty: data.level ? `레벨 ${data.level}` : data.difficulty || "중급",
                  points: calculatePointsByLevel(data.level || 1),
                  solvedAt: Timestamp.now(), // 정확한 시간을 알 수 없으므로 현재 시간 사용
                  type: "wargame",
                })
                wargameCount++
              } else {
                // CTF 문제에서 찾기
                const ctfProblemRef = firebaseDoc(db, "ctf_problems", problemId)
                const ctfProblemSnap = await firebaseGetDoc(ctfProblemRef)

                if (ctfProblemSnap.exists()) {
                  const data = ctfProblemSnap.data()
                  allChallenges.push({
                    id: problemId,
                    title: data.title || `CTF 문제 #${problemId.substring(0, 8)}`,
                    category: data.category || "CTF",
                    difficulty: data.difficulty || "중급",
                    points: data.points || 0,
                    solvedAt: Timestamp.now(),
                    type: "ctf",
                    contestId: data.contestId,
                  })
                  ctfCount++
                }
              }
            } catch (error) {
              addDebugLog(`문제 정보 조회 오류 (${problemId}): ${error}`)
            }
          }
        }
      }

      // 중복 제거 (ID 기준)
      const uniqueChallenges = allChallenges.filter(
        (challenge, index, self) => index === self.findIndex((c) => c.id === challenge.id),
      )

      // 최종 개수 재계산
      wargameCount = uniqueChallenges.filter((c) => c.type === "wargame").length
      ctfCount = uniqueChallenges.filter((c) => c.type === "ctf").length

      setWargameCount(wargameCount)
      setCtfCount(ctfCount)

      // 시간순 정렬
      uniqueChallenges.sort((a, b) => {
        const dateA = getTimestampDate(a.solvedAt)
        const dateB = getTimestampDate(b.solvedAt)
        return dateB.getTime() - dateA.getTime()
      })

      setSolvedChallenges(uniqueChallenges)

      // 통계 계산
      const categories: Record<string, number> = {}
      const difficulties: Record<string, number> = {
        초급: 0,
        중급: 0,
        고급: 0,
        대회: 0,
      }

      uniqueChallenges.forEach((challenge) => {
        categories[challenge.category] = (categories[challenge.category] || 0) + 1

        if (
          challenge.difficulty.includes("초급") ||
          challenge.difficulty.includes("레벨 1") ||
          challenge.difficulty.includes("레벨 2")
        ) {
          difficulties["초급"]++
        } else if (
          challenge.difficulty.includes("고급") ||
          challenge.difficulty.includes("레벨 5") ||
          challenge.difficulty.includes("레벨 6") ||
          challenge.difficulty.includes("레벨 7") ||
          challenge.difficulty.includes("레벨 8") ||
          challenge.difficulty.includes("레벨 9") ||
          challenge.difficulty.includes("레벨 10")
        ) {
          difficulties["고급"]++
        } else if (challenge.difficulty === "대회") {
          difficulties["대회"]++
        } else {
          difficulties["중급"]++
        }
      })

      setCategoryStats(categories)
      setDifficultyStats(difficulties)

      addDebugLog("=== 최종 결과 ===")
      addDebugLog(`총 해결 문제: ${uniqueChallenges.length}`)
      addDebugLog(`워게임: ${wargameCount}`)
      addDebugLog(`CTF: ${ctfCount}`)
      addDebugLog(`카테고리: ${Object.keys(categories).join(", ")}`)
    } catch (error) {
      addDebugLog(`전체 오류: ${error}`)
      console.error("Error in fetchSolvedChallenges:", error)

      setSolvedChallenges([])
      setWargameCount(0)
      setCtfCount(0)
      setCategoryStats({})
      setDifficultyStats({ 초급: 0, 중급: 0, 고급: 0, 대회: 0 })
    }
  }

  // 데이터 새로고침 함수
  const refreshData = async () => {
    if (!user || !profile) return

    setIsRefreshing(true)
    setDebugInfo([])

    try {
      await fetchSolvedChallenges(user.uid, profile)
      // await fetchCurriculumProgress(user.uid)
      toast({
        title: "데이터 새로고침 완료",
        description: "최신 활동 기록을 불러왔습니다.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "새로고침 실패",
        description: "데이터를 새로고침하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const openFollowModal = (type: "following" | "followers") => {
    setFollowModalType(type)
    setFollowModalOpen(true)
  }

  // 문제 상세 정보 토글
  const toggleChallengeDetails = (id: string) => {
    if (expandedChallenge === id) {
      setExpandedChallenge(null)
    } else {
      setExpandedChallenge(id)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">로그인이 필요합니다</h3>
                <p className="text-muted-foreground mt-2">마이페이지를 보려면 로그인이 필요합니다.</p>
                <Button className="mt-4" onClick={() => router.push("/login")}>
                  로그인 페이지로
                </Button>
              </motion.div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-background/80">
      <Navbar />

      {/* 프로필 배너 섹션 */}
      {profile && (
        <motion.div
          className="relative w-full h-48 md:h-64 overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {profile.bannerUrl ? (
            <img
              src={profile.bannerUrl || "/placeholder.svg"}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          )}

          {/* 프로필 정보 오버레이 */}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-6 left-6 flex items-end gap-4">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 10 }}>
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white ring-4 ring-background shadow-xl">
                <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.username} />
                <AvatarFallback>
                  <User className="h-12 w-12 md:h-16 md:w-16" />
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="text-white mb-2">
              <h1 className="text-2xl md:text-4xl font-bold drop-shadow-lg">마이페이지</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile.title && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {profile.title}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  {profile.rank > 0 ? `${profile.rank}위` : "순위 미정"}
                </Badge>
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  {profile.createdAt?.toDate ? formatDate(profile.createdAt.toDate()) : ""}부터 활동
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ) : profile ? (
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {profile.createdAt?.toDate ? formatDate(profile.createdAt.toDate()) : ""}부터 활동 중
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "새로고침 중..." : "데이터 새로고침"}
                  </Button>
                  <Link href="/profile">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 group transition-all duration-300 hover:bg-primary hover:text-white bg-transparent"
                    >
                      <Settings className="h-4 w-4 group-hover:animate-spin" />
                      프로필 설정
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">프로필을 찾을 수 없습니다</h3>
                <p className="text-muted-foreground mt-2">사용자 프로필이 존재하지 않습니다.</p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          ) : profile ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                    <CardHeader className="text-center relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                      >
                        <Avatar className="mx-auto h-24 w-24 border-2 border-primary/20 ring-4 ring-background">
                          <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.username} />
                          <AvatarFallback>
                            <User className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <CardTitle className="mt-4 text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                        {profile.username}
                      </CardTitle>
                      <div className="flex flex-col items-center gap-2 mt-2">
                        {profile.title && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {profile.title}
                          </Badge>
                        )}
                        {profile.rank > 0 && (
                          <Badge variant="outline" className="bg-primary/10">
                            {profile.rank}위
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      {/* 레벨 정보 */}
                      <motion.div
                        className="space-y-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">레벨</span>
                          <motion.span
                            className="font-bold"
                            initial={{ color: "#FFFFFF" }}
                            animate={{ color: "#FFFFFF" }}
                            whileHover={{
                              color: ["#FFFFFF", "#FFD700", "#FFFFFF"],
                              transition: {
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                              },
                            }}
                          >
                            Lv. {userLevel.level}
                          </motion.span>
                        </div>
                        <div className="relative">
                          <Progress value={(userLevel.currentExp / userLevel.requiredExp) * 100} className="h-2" />
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{
                              width: `${(userLevel.currentExp / userLevel.requiredExp) * 100}%`,
                              transition: { duration: 1.5, ease: "easeOut" },
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{userLevel.currentExp} EXP</span>
                          <span>{userLevel.requiredExp} EXP</span>
                        </div>
                      </motion.div>

                      {/* 티어 정보 */}
                      <motion.div
                        className="space-y-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">티어</span>
                          <div className="flex items-center gap-1">
                            <motion.div
                              style={{ color: userTier.color }}
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.8 }}
                            >
                              {getTierIcon(userTier.icon)}
                            </motion.div>
                            <span className="font-bold" style={{ color: userTier.color }}>
                              {userTier.name}
                            </span>
                          </div>
                        </div>
                        {nextTier && (
                          <>
                            <div className="relative">
                              <Progress
                                value={tierProgress}
                                className="h-2"
                                style={{
                                  background: `linear-gradient(to right, ${userTier.color}40, ${nextTier.color}40)`,
                                }}
                              />
                              <motion.div
                                className="absolute top-0 left-0 h-full rounded-full"
                                style={{
                                  background: `linear-gradient(to right, ${userTier.color}, ${nextTier.color})`,
                                  opacity: 0.6,
                                }}
                                initial={{ width: "0%" }}
                                animate={{
                                  width: `${tierProgress}%`,
                                  transition: { duration: 1.5, ease: "easeOut" },
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{profile.points} 점</span>
                              <span>
                                다음 티어: {nextTier.name} ({nextTier.minPoints} 점)
                              </span>
                            </div>
                          </>
                        )}
                      </motion.div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">총 점수</span>
                          <span className="font-bold">{profile.points} 점</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">워게임</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{wargameCount} 문제</p>
                          <p className="text-sm text-muted-foreground">{profile.wargamePoints || 0} 점</p>
                        </motion.div>
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">CTF</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{ctfCount} 문제</p>
                          <p className="text-sm text-muted-foreground">{profile.ctfPoints || 0} 점</p>
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          onClick={() => openFollowModal("following")}
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">팔로잉</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{followingCount}</p>
                          <p className="text-sm text-muted-foreground">팔로우 중</p>
                        </motion.div>
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          onClick={() => openFollowModal("followers")}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">팔로워</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{followersCount}</p>
                          <p className="text-sm text-muted-foreground">팔로워</p>
                        </motion.div>
                      </div>

                      <Separator className="bg-primary/10" />

                      {profile.bio && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">자기소개</h3>
                          <p className="text-sm text-muted-foreground">{profile.bio}</p>
                        </div>
                      )}

                      {/* 인증된 소속 정보 표시 */}
                      {verifiedAffiliations.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">인증된 소속</h3>
                          <div className="space-y-2">
                            {verifiedAffiliations.map((aff) => (
                              <motion.div
                                key={aff.id}
                                className="flex items-center gap-2 text-sm"
                                whileHover={{ x: 5 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              >
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center">
                                  <span>{aff.name}</span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
                                          <BadgeCheck className="ml-1 h-4 w-4 text-green-500" />
                                        </motion.div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>인증된 소속</p>
                                        {aff.verifiedAt && (
                                          <p className="text-xs mt-1">
                                            {formatDate(getTimestampDate(aff.verifiedAt))} 인증됨
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                {aff.department && <span className="text-muted-foreground">({aff.department})</span>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {profile.location && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.location}</span>
                          </motion.div>
                        )}
                        {profile.website && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {profile.website.replace(/^https?:\/\//, "")}
                            </a>
                          </motion.div>
                        )}
                        <motion.div
                          className="flex items-center gap-2 text-sm"
                          whileHover={{ x: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{profile.createdAt?.toDate ? formatDate(profile.createdAt.toDate()) : ""}에 가입</span>
                        </motion.div>
                        {profile.lastLogin?.toDate && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(profile.lastLogin.toDate())}에 마지막 로그인</span>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="md:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="mb-4 w-full justify-start bg-background/50 backdrop-blur-sm p-1">
                      <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        프로필
                      </TabsTrigger>
                      <TabsTrigger
                        value="curriculum"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        커리큘럼 ({curriculumProgress.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="solved"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        해결한 문제 ({solvedChallenges.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="stats"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        통계
                      </TabsTrigger>
                      {isCurrentUserAdmin && (
                        <TabsTrigger
                          value="debug"
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                        >
                          디버그
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {/* 프로필 탭 */}
                    <TabsContent value="profile">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            최근 활동
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          {solvedChallenges.length > 0 ? (
                            <div className="space-y-4">
                              {solvedChallenges.slice(0, 10).map((challenge, index) => (
                                <motion.div
                                  key={challenge.id}
                                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1, duration: 0.5 }}
                                  whileHover={{
                                    scale: 1.02,
                                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <motion.div
                                      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
                                      whileHover={{ rotate: 360 }}
                                      transition={{ duration: 0.8 }}
                                    >
                                      {challenge.type === "wargame" ? (
                                        <Terminal className="h-5 w-5 text-primary" />
                                      ) : (
                                        <Shield className="h-5 w-5 text-primary" />
                                      )}
                                    </motion.div>
                                    <div>
                                      <p className="font-medium text-foreground">{challenge.title}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{challenge.type === "wargame" ? "워게임" : "CTF"}</span>
                                        <span>•</span>
                                        <span>{challenge.category}</span>
                                        <span>•</span>
                                        <span>{challenge.difficulty}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-foreground">{challenge.points} 점</p>
                                    <div className="text-xs text-muted-foreground">
                                      <p className="font-medium">
                                        {formatRelativeTime(getTimestampDate(challenge.solvedAt))}
                                      </p>
                                      <p className="text-[10px] opacity-75">
                                        {formatDateTime(getTimestampDate(challenge.solvedAt))}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-xl font-bold">활동 기록이 없습니다</h3>
                              <p className="text-muted-foreground mt-2">
                                아직 해결한 문제가 없거나 데이터를 불러올 수 없습니다.
                              </p>
                              <Button
                                variant="outline"
                                className="mt-4 bg-transparent"
                                onClick={refreshData}
                                disabled={isRefreshing}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                                {isRefreshing ? "새로고침 중..." : "데이터 새로고침"}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="relative z-10">
                          <Button
                            variant="outline"
                            className="w-full group hover:bg-primary hover:text-primary-foreground transition-all duration-300 bg-transparent"
                            onClick={() => setCurrentTab("solved")}
                          >
                            모든 활동 보기
                            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </TabsContent>

                    {/* 커리큘럼 탭 */}
                    <TabsContent value="curriculum">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            커리큘럼 진도 ({curriculumProgress.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          {curriculumProgress.length === 0 ? (
                            <motion.div
                              className="flex flex-col items-center justify-center py-8 text-center"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5 }}
                            >
                              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-xl font-bold">진행 중인 커리큘럼이 없습니다</h3>
                              <p className="text-muted-foreground mt-2">커리큘럼을 시작해서 체계적으로 학습해보세요.</p>
                              <Link href="/curriculum">
                                <Button className="mt-4">
                                  <Target className="mr-2 h-4 w-4" />
                                  커리큘럼 둘러보기
                                </Button>
                              </Link>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              {curriculumProgress.map((curriculum, index) => (
                                <motion.div
                                  key={curriculum.id}
                                  className="rounded-lg border p-4 bg-card/50 hover:bg-card/80 transition-colors"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1, duration: 0.5 }}
                                  whileHover={{
                                    scale: 1.01,
                                    boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="flex items-center gap-1">
                                        {categoryIcons[curriculum.category] || <BookOpen className="h-3.5 w-3.5" />}
                                        <span>{curriculum.category}</span>
                                      </Badge>
                                      {curriculum.isCompleted && (
                                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                          <Award className="mr-1 h-3 w-3" />
                                          완료
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-sm font-medium">
                                        {curriculum.completedSteps}/{curriculum.totalSteps} 단계
                                      </span>
                                    </div>
                                  </div>

                                  <h3 className="text-lg font-bold mb-2">{curriculum.title}</h3>

                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">진도율</span>
                                      <span className="font-medium">{Math.round(curriculum.progress)}%</span>
                                    </div>
                                    <div className="relative">
                                      <Progress value={curriculum.progress} className="h-2" />
                                      <motion.div
                                        className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                                        initial={{ width: "0%" }}
                                        animate={{
                                          width: `${curriculum.progress}%`,
                                          transition: { duration: 1, ease: "easeOut", delay: index * 0.1 },
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                      마지막 학습: {formatRelativeTime(getTimestampDate(curriculum.lastAccessed))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {curriculum.certificate && (
                                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                                          <GraduationCap className="mr-1 h-3 w-3" />
                                          수료증
                                        </Badge>
                                      )}
                                      <Link href={`/curriculum/${curriculum.id}`}>
                                        <Button size="sm" variant="outline">
                                          {curriculum.isCompleted ? "복습하기" : "계속 학습"}
                                          <ChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="relative z-10">
                          <Link href="/curriculum" className="w-full">
                            <Button
                              variant="outline"
                              className="w-full group hover:bg-primary hover:text-primary-foreground transition-all duration-300 bg-transparent"
                            >
                              <Zap className="mr-2 h-4 w-4" />새 커리큘럼 시작하기
                              <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    </TabsContent>

                    <TabsContent value="solved">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            해결한 문제 ({solvedChallenges.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          {solvedChallenges.length === 0 ? (
                            <motion.div
                              className="flex flex-col items-center justify-center py-8 text-center"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5 }}
                            >
                              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-xl font-bold">해결한 문제가 없습니다</h3>
                              <p className="text-muted-foreground mt-2">
                                아직 해결한 문제가 없거나 데이터를 불러올 수 없습니다.
                              </p>
                              <Button
                                variant="outline"
                                className="mt-4 bg-transparent"
                                onClick={refreshData}
                                disabled={isRefreshing}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                                {isRefreshing ? "새로고침 중..." : "데이터 새로고침"}
                              </Button>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              {solvedChallenges.map((challenge, index) => (
                                <motion.div
                                  key={challenge.id}
                                  className="rounded-lg border p-4 bg-card/50 hover:bg-card/80 transition-colors"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.5 }}
                                  whileHover={{
                                    scale: 1.01,
                                    boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                                  }}
                                >
                                  <Collapsible
                                    open={expandedChallenge === challenge.id}
                                    onOpenChange={() => toggleChallengeDetails(challenge.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          {challenge.type === "wargame" ? (
                                            <Terminal className="h-3.5 w-3.5" />
                                          ) : (
                                            <Shield className="h-3.5 w-3.5" />
                                          )}
                                          <span>{challenge.type === "wargame" ? "워게임" : "CTF"}</span>
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="bg-muted text-muted-foreground flex items-center gap-1"
                                        >
                                          {categoryIcons[challenge.category] || <Puzzle className="h-3.5 w-3.5" />}
                                          <span>{challenge.category}</span>
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className={`bg-muted ${difficultyColors[challenge.difficulty] || "text-muted-foreground"}`}
                                        >
                                          {challenge.difficulty}
                                        </Badge>
                                      </div>
                                      {challenge.points > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Trophy className="h-4 w-4 text-yellow-500" />
                                          <span className="font-bold">{challenge.points} 점</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <h3 className="text-lg font-bold">{challenge.title}</h3>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                          {expandedChallenge === challenge.id ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </CollapsibleTrigger>
                                    </div>
                                    {challenge.contestTitle && (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {challenge.contestTitle} 대회
                                      </p>
                                    )}
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-medium">
                                          {formatRelativeTime(getTimestampDate(challenge.solvedAt))}
                                        </span>
                                        <span className="text-xs opacity-75">
                                          ({formatDateTime(getTimestampDate(challenge.solvedAt))})
                                        </span>
                                      </div>
                                    </div>
                                    <CollapsibleContent>
                                      <div className="mt-4 space-y-3 pt-3 border-t">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">카테고리</p>
                                            <p className="text-sm font-medium flex items-center gap-1">
                                              {categoryIcons[challenge.category] || <Puzzle className="h-4 w-4" />}
                                              {challenge.category}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">난이도</p>
                                            <p
                                              className={`text-sm font-medium ${difficultyColors[challenge.difficulty] || ""}`}
                                            >
                                              {challenge.difficulty}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">획득 점수</p>
                                            <p className="text-sm font-medium">{challenge.points} 점</p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">해결 날짜</p>
                                            <p className="text-sm font-medium">
                                              {formatDateTime(getTimestampDate(challenge.solvedAt))}
                                            </p>
                                          </div>
                                          {challenge.type === "ctf" && challenge.contestTitle && (
                                            <div className="space-y-1">
                                              <p className="text-xs text-muted-foreground">대회 정보</p>
                                              <p className="text-sm font-medium">{challenge.contestTitle}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            통계
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="grid gap-6 md:grid-cols-2">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <Card className="border-primary/20 bg-card/50">
                                <CardHeader>
                                  <CardTitle className="text-lg">카테고리별 해결 문제</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {Object.keys(categoryStats).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {Object.entries(categoryStats).map(([category, count], index) => (
                                        <motion.div
                                          key={category}
                                          className="space-y-1"
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: index * 0.1, duration: 0.5 }}
                                        >
                                          <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-1">
                                              {categoryIcons[category] || <Puzzle className="h-3.5 w-3.5" />}
                                              <span>{category}</span>
                                            </div>
                                            <span className="font-medium">{count}문제</span>
                                          </div>
                                          <div className="relative">
                                            <Progress value={(count / solvedChallenges.length) * 100} className="h-2" />
                                            <motion.div
                                              className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                                              initial={{ width: "0%" }}
                                              animate={{
                                                width: `${(count / solvedChallenges.length) * 100}%`,
                                                transition: { duration: 1, ease: "easeOut", delay: index * 0.1 },
                                              }}
                                            />
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <Card className="border-primary/20 bg-card/50">
                                <CardHeader>
                                  <CardTitle className="text-lg">난이도별 해결 문제</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {Object.keys(difficultyStats).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {Object.entries(difficultyStats)
                                        .filter(([_, count]) => count > 0)
                                        .map(([difficulty, count], index) => {
                                          const difficultyColor =
                                            {
                                              초급: "bg-green-500",
                                              중급: "bg-yellow-500",
                                              고급: "bg-red-500",
                                              대회: "bg-purple-500",
                                            }[difficulty] || "bg-primary"

                                          return (
                                            <motion.div
                                              key={difficulty}
                                              className="space-y-1"
                                              initial={{ opacity: 0, x: -20 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: index * 0.1, duration: 0.5 }}
                                            >
                                              <div className="flex justify-between text-sm">
                                                <span className={difficultyColors[difficulty] || ""}>{difficulty}</span>
                                                <span className="font-medium">{count}문제</span>
                                              </div>
                                              <div className="relative h-2 w-full rounded-full bg-muted">
                                                <motion.div
                                                  className={`h-2 rounded-full ${difficultyColor}`}
                                                  initial={{ width: "0%" }}
                                                  animate={{
                                                    width: `${(count / solvedChallenges.length) * 100}%`,
                                                    transition: { duration: 1, ease: "easeOut", delay: index * 0.1 },
                                                  }}
                                                ></motion.div>
                                              </div>
                                            </motion.div>
                                          )
                                        })}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          </div>

                          {/* CTF 대회 참여 정보 */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            whileHover={{
                              scale: 1.01,
                              boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <Card className="mt-6 border-primary/20 bg-card/50">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Trophy className="h-5 w-5 text-yellow-500" />
                                  CTF 대회 참여 기록
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {solvedChallenges.filter((c) => c.type === "ctf" && c.contestTitle).length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-4 text-center">
                                    <Trophy className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">아직 CTF 대회 참여 기록이 없습니다</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {(() => {
                                      const contests: Record<
                                        string,
                                        { title: string; problems: number; points: number }
                                      > = {}

                                      solvedChallenges
                                        .filter((c) => c.type === "ctf" && c.contestId && c.contestTitle)
                                        .forEach((challenge) => {
                                          const contestId = challenge.contestId as string
                                          if (!contests[contestId]) {
                                            contests[contestId] = {
                                              title: challenge.contestTitle as string,
                                              problems: 0,
                                              points: 0,
                                            }
                                          }
                                          contests[contestId].problems++
                                          contests[contestId].points += challenge.points
                                        })

                                      return Object.entries(contests).map(([contestId, data], index) => (
                                        <motion.div
                                          key={contestId}
                                          className="rounded-lg border p-4 bg-card/50 hover:bg-card/80 transition-colors"
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: index * 0.1, duration: 0.5 }}
                                          whileHover={{
                                            scale: 1.02,
                                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                                          }}
                                        >
                                          <h3 className="text-lg font-bold">{data.title}</h3>
                                          <div className="mt-2 flex flex-wrap gap-4">
                                            <div className="flex items-center gap-1">
                                              <FileText className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-sm">{data.problems}문제 해결</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Trophy className="h-4 w-4 text-yellow-500" />
                                              <span className="text-sm font-medium">{data.points}점 획득</span>
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))
                                    })()}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* 디버그 탭 - 관리자만 볼 수 있음 */}
                    {isCurrentUserAdmin && (
                      <TabsContent value="debug">
                        <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                          <CardHeader className="relative z-10">
                            <CardTitle className="flex items-center gap-2">
                              <Code className="h-5 w-5 text-primary" />
                              디버그 정보 (관리자 전용)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="relative z-10">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">기본 정보</h4>
                                  <div className="text-sm space-y-1">
                                    <p>사용자 ID: {user?.uid}</p>
                                    <p>사용자 이메일: {user?.email}</p>
                                    <p>총 해결 문제: {solvedChallenges.length}개</p>
                                    <p>워게임: {wargameCount}개</p>
                                    <p>CTF: {ctfCount}개</p>
                                    <p>커리큘럼 진도: {curriculumProgress.length}개</p>
                                    <p>프로필 존재: {profile ? "예" : "아니오"}</p>
                                    <p>프로필 점수: {profile?.points || 0}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-medium">통계</h4>
                                  <div className="text-sm space-y-1">
                                    <p>카테고리 수: {Object.keys(categoryStats).length}</p>
                                    <p>카테고리: {Object.keys(categoryStats).join(", ")}</p>
                                    <p>
                                      난이도 분포:{" "}
                                      {Object.entries(difficultyStats)
                                        .map(([k, v]) => `${k}:${v}`)
                                        .join(", ")}
                                    </p>
                                    <p>로딩 상태: {isLoading ? "로딩 중" : "완료"}</p>
                                    <p>새로고침 상태: {isRefreshing ? "진행 중" : "대기"}</p>
                                    <p>팔로잉: {followingCount}명</p>
                                    <p>팔로워: {followersCount}명</p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <h4 className="font-medium">최근 해결한 문제 (상위 5개)</h4>
                                <div className="max-h-32 overflow-y-auto bg-muted/20 p-3 rounded-lg border">
                                  {solvedChallenges.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">해결한 문제가 없습니다.</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {solvedChallenges.slice(0, 5).map((challenge, index) => (
                                        <p key={index} className="text-xs font-mono text-muted-foreground">
                                          {challenge.title} ({challenge.type}) - {challenge.points}점 -{" "}
                                          {formatRelativeTime(getTimestampDate(challenge.solvedAt))}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <h4 className="font-medium">디버그 로그</h4>
                                <div className="max-h-64 overflow-y-auto bg-muted/20 p-3 rounded-lg border">
                                  {debugInfo.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">디버그 로그가 없습니다.</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {debugInfo.map((log, index) => (
                                        <p key={index} className="text-xs font-mono text-muted-foreground">
                                          {log}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                                  데이터 새로고침
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDebugInfo([])}>
                                  로그 지우기
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log("Profile data:", profile)
                                    console.log("Solved challenges:", solvedChallenges)
                                    console.log("Category stats:", categoryStats)
                                    console.log("Difficulty stats:", difficultyStats)
                                  }}
                                >
                                  콘솔에 데이터 출력
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    )}
                  </Tabs>
                </motion.div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />

      {/* 팔로우 목록 모달 */}
      {profile && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          userId={user.uid}
          username={profile.username}
          type={followModalType}
        />
      )}
    </div>
  )
}
