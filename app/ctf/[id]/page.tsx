"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Clock,
  Trophy,
  Users,
  AlertCircle,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Lock,
  FileText,
  Server,
  Layers,
  Cpu,
  Loader2,
  Flag,
  Activity,
  Medal,
  Target,
  Crown,
  Play,
  Send,
  TrendingUp,
  PieChartIcon,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Download,
  Globe,
  Database,
  Key,
  Search,
  RefreshCw,
  Braces,
} from "lucide-react"

// 기존 CTF 타입 import
import type { CTFContest, CTFProblem } from "@/lib/ctf-types"
import { normalizeContestData, normalizeProblemData } from "@/lib/ctf-types"

// 마크다운 파서 import
import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"

// 참가자 타입 정의
interface Participant {
  uid: string
  username: string
  photoURL?: string
  score: number
  solvedProblems: string[]
  lastSolveTime?: any
  rank?: number
  affiliation?: string
  joinedAt?: any
  contestId: string
  solvedDetails?: { problemId: string; problemTitle: string; points: number; solvedAt: any; category: string }[]
}

// 실시간 활동 타입
interface RecentActivity {
  id: string
  username: string
  photoURL?: string
  problemTitle: string
  points: number
  solvedAt: any
  category: string
  difficulty: string
  userId: string
  contestId: string
  problemId: string
}

// 점수 차트 데이터 타입
interface ScoreData {
  time: string
  score: number
  rank: number
}

export default function CTFContestPage({ params }: { params: { id: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 상태 관리
  const [contest, setContest] = useState<CTFContest | null>(null)
  const [problems, setProblems] = useState<CTFProblem[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [flagInput, setFlagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<CTFProblem | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 비밀번호 관련 상태
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 실시간 차트 데이터
  const [scoreHistory, setScoreHistory] = useState<ScoreData[]>([])
  const [categoryStats, setCategoryStats] = useState<{ name: string; value: number; color: string }[]>([])

  // 시상식 관련 상태 추가
  const [showAwardCeremony, setShowAwardCeremony] = useState(false)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 내 참가자 정보 찾기
  const myParticipant = participants.find((p) => p.uid === user?.uid)

  // 카테고리 아이콘 매핑
  const categoryIcons: Record<string, React.ReactNode> = {
    "웹 해킹": <Globe className="h-4 w-4" />,
    "시스템 해킹": <Server className="h-4 w-4" />,
    리버싱: <Cpu className="h-4 w-4" />,
    암호학: <Key className="h-4 w-4" />,
    포렌식: <Search className="h-4 w-4" />,
    네트워크: <Database className="h-4 w-4" />,
    웹: <Braces className="h-4 w-4" />,
    기타: <Layers className="h-4 w-4" />,
  }

  // 난이도 색상 매핑
  const difficultyColors: Record<string, string> = {
    초급: "bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-green-300 border-green-500/40",
    중급: "bg-gradient-to-r from-yellow-600/30 to-orange-600/30 text-yellow-300 border-yellow-500/40",
    고급: "bg-gradient-to-r from-red-600/30 to-pink-600/30 text-red-300 border-red-500/40",
    easy: "bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-green-300 border-green-500/40",
    medium: "bg-gradient-to-r from-yellow-600/30 to-orange-600/30 text-yellow-300 border-yellow-500/40",
    hard: "bg-gradient-to-r from-red-600/30 to-pink-600/30 text-red-300 border-red-500/40",
  }

  // 카테고리별 색상
  const categoryColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"]

  // 대회 시작 여부 확인 함수
  const isContestStarted = (contest: CTFContest | null): boolean => {
    if (!contest) return false
    const now = new Date()
    const startTime = contest.startTime?.toDate() || new Date()
    return now >= startTime
  }

  // 대회 종료 여부 확인 함수
  const isContestEnded = (contest: CTFContest | null): boolean => {
    if (!contest) return false
    const now = new Date()
    const endTime = contest.endTime?.toDate() || new Date()
    return now > endTime
  }

  // 시상식 표시 여부 확인 함수 추가
  const shouldShowAwardCeremony = (contest: CTFContest | null): boolean => {
    if (!contest) return false
    return isContestEnded(contest) && participants.length > 0
  }

  // 문제 접근 권한 확인 함수
  const canAccessProblems = (contest: CTFContest | null): boolean => {
    if (!contest) return false

    // 관리자는 항상 접근 가능
    if (isAdmin) return true

    // 대회가 시작되지 않았으면 일반 사용자는 접근 불가
    if (!isContestStarted(contest)) return false

    // 비밀번호 보호 대회인 경우 인증 확인
    if (contest.isPasswordProtected && !isAuthorized) return false

    return true
  }

  // 플래그 제출 권한 확인 함수
  const canSubmitFlag = (contest: CTFContest | null): boolean => {
    if (!contest || !user) return false

    // 관리자는 항상 제출 가능
    if (isAdmin) return true

    // 대회가 시작되지 않았으면 제출 불가
    if (!isContestStarted(contest)) return false

    // 대회가 종료되었으면 제출 불가
    if (isContestEnded(contest)) return false

    // 참가하지 않았으면 제출 불가
    if (!hasJoined) return false

    // 비밀번호 보호 대회인 경우 인증 확인
    if (contest.isPasswordProtected && !isAuthorized) return false

    return true
  }

  // 로컬 스토리지 함수들
  const saveAuthStateToLocalStorage = (contestId: string, isAuthorized: boolean) => {
    if (typeof window !== "undefined" && user) {
      try {
        localStorage.setItem(`ctf_auth_${contestId}_${user.uid}`, isAuthorized ? "true" : "false")
        const expiryTime = new Date()
        expiryTime.setDate(expiryTime.getDate() + 7)
        localStorage.setItem(`ctf_auth_${contestId}_${user.uid}_expiry`, expiryTime.toISOString())
      } catch (e) {
        console.error("Failed to save auth state to localStorage:", e)
      }
    }
  }

  const getAuthStateFromLocalStorage = (contestId: string): boolean => {
    if (typeof window !== "undefined" && user) {
      try {
        const expiryTimeStr = localStorage.getItem(`ctf_auth_${contestId}_${user.uid}_expiry`)
        if (expiryTimeStr) {
          const expiryTime = new Date(expiryTimeStr)
          if (expiryTime < new Date()) {
            localStorage.removeItem(`ctf_auth_${contestId}_${user.uid}`)
            localStorage.removeItem(`ctf_auth_${contestId}_${user.uid}_expiry`)
            return false
          }
        }
        return localStorage.getItem(`ctf_auth_${contestId}_${user.uid}`) === "true"
      } catch (e) {
        console.error("Failed to get auth state from localStorage:", e)
        return false
      }
    }
    return false
  }

  // 대회 정보 불러오기
  const fetchContest = async () => {
    try {
      console.log("Fetching contest:", params.id)
      const contestRef = doc(db, "ctf_contests", params.id)
      const contestSnap = await getDoc(contestRef)

      if (contestSnap.exists()) {
        const contestData = normalizeContestData(contestSnap.data(), contestSnap.id)
        setContest(contestData)
        console.log("Contest loaded:", contestData.title, "Status:", contestData.status)

        // 비밀번호 보호 대회인 경우 권한 확인
        if (contestData.isPasswordProtected) {
          if (isAdmin) {
            console.log("Admin access - bypassing password protection")
            setIsAuthorized(true)
            saveAuthStateToLocalStorage(params.id, true)
          } else if (user && contestData.authorizedUsers?.includes(user.uid)) {
            setIsAuthorized(true)
            saveAuthStateToLocalStorage(params.id, true)
          } else if (user && getAuthStateFromLocalStorage(params.id)) {
            setIsAuthorized(true)
          } else {
            setIsAuthorized(false)
            if (user) {
              setIsPasswordDialogOpen(true)
            }
          }
        } else {
          setIsAuthorized(true)
        }

        // 사용자가 이미 참가했는지 확인
        if (user && contestData.participants?.includes(user.uid)) {
          setHasJoined(true)
        }

        return contestData
      } else {
        toast({
          title: "대회를 찾을 수 없습니다",
          description: "요청하신 CTF 대회가 존재하지 않습니다.",
          variant: "destructive",
        })
        router.push("/ctf")
        return null
      }
    } catch (error) {
      console.error("Error fetching contest:", error)
      toast({
        title: "오류 발생",
        description: "대회 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      return null
    }
  }

  // 문제 불러오기
  const fetchProblems = async (contestId: string) => {
    try {
      console.log("Fetching problems for contest:", contestId)

      const problemsRef = collection(db, "ctf_problems")
      const q = query(problemsRef, where("contestId", "==", contestId), orderBy("points", "asc"))
      const querySnapshot = await getDocs(q)

      const problemsData: CTFProblem[] = []
      querySnapshot.forEach((doc) => {
        const normalizedProblem = normalizeProblemData(doc.data(), doc.id)
        problemsData.push(normalizedProblem)
      })

      console.log("Loaded problems:", problemsData.length)
      setProblems(problemsData)

      // 자동으로 첫 번째 문제를 선택하지 않도록 수정
      // 사용자가 명시적으로 문제를 선택할 때까지 기다림
    } catch (error) {
      console.error("Error fetching problems:", error)
      toast({
        title: "문제 로딩 실패",
        description: "문제를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 참가자 불러오기
  const fetchParticipants = async (contestId: string) => {
    try {
      const participantsRef = collection(db, "ctf_participants")
      const q = query(participantsRef, where("contestId", "==", contestId))
      const querySnapshot = await getDocs(q)

      const participantsData: Participant[] = []

      for (const doc of querySnapshot.docs) {
        const data = doc.data()

        const solvedDetails: {
          problemId: string
          problemTitle: string
          points: number
          solvedAt: any
          category: string
        }[] = []

        if (data.solvedProblems && data.solvedProblems.length > 0) {
          const solveLogsRef = collection(db, "ctf_solve_logs")
          const solveLogsQuery = query(
            solveLogsRef,
            where("userId", "==", data.uid),
            where("contestId", "==", contestId),
          )
          const solveLogsSnapshot = await getDocs(solveLogsQuery)

          solveLogsSnapshot.forEach((logDoc) => {
            const logData = logDoc.data()
            solvedDetails.push({
              problemId: logData.problemId,
              problemTitle: logData.problemTitle,
              points: logData.points,
              solvedAt: logData.solvedAt,
              category: logData.category,
            })
          })
        }

        participantsData.push({
          uid: data.uid,
          username: data.username || "Unknown",
          photoURL: data.photoURL,
          score: data.score || 0,
          solvedProblems: data.solvedProblems || [],
          lastSolveTime: data.lastSolveTime,
          affiliation: data.affiliation || "",
          joinedAt: data.joinedAt,
          contestId: data.contestId,
          solvedDetails: solvedDetails.sort((a, b) => b.solvedAt?.toMillis() - a.solvedAt?.toMillis()),
        })
      }

      // 점수순으로 정렬하고 순위 부여
      participantsData.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (!a.lastSolveTime) return 1
        if (!b.lastSolveTime) return -1
        return a.lastSolveTime.toMillis() - b.lastSolveTime.toMillis()
      })

      let currentRank = 1
      for (let i = 0; i < participantsData.length; i++) {
        if (i > 0 && participantsData[i].score !== participantsData[i - 1].score) {
          currentRank = i + 1
        }
        participantsData[i].rank = currentRank
      }

      setParticipants(participantsData)
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  // 최근 활동 불러오기
  const fetchRecentActivities = async (contestId: string) => {
    try {
      const solveLogsRef = collection(db, "ctf_solve_logs")
      // Removed limit(20) to fetch all activities
      const q = query(solveLogsRef, where("contestId", "==", contestId), orderBy("solvedAt", "desc"))
      const querySnapshot = await getDocs(q)

      const activities: RecentActivity[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        activities.push({
          id: doc.id,
          username: data.username,
          photoURL: data.photoURL,
          problemTitle: data.problemTitle,
          points: data.points,
          solvedAt: data.solvedAt,
          category: data.category,
          difficulty: data.difficulty,
          userId: data.userId,
          contestId: data.contestId,
          problemId: data.problemId,
        })
      })

      setRecentActivities(activities)
    } catch (error) {
      console.error("Error fetching recent activities:", error)
    }
  }

  // 실시간 데이터 새로고침
  const refreshData = async (showToast = false) => {
    if (!contest) return

    setIsRefreshing(true)
    try {
      if (canAccessProblems(contest)) {
        await Promise.all([
          fetchParticipants(contest.id),
          fetchRecentActivities(contest.id),
          fetchProblems(contest.id),
          updateChartData(),
        ])
        setLastUpdate(new Date())
        if (showToast) {
          toast({
            title: "데이터 새로고침 완료",
            description: "최신 순위표와 활동 내역을 불러왔습니다.",
            variant: "default",
          })
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      if (showToast) {
        toast({
          title: "새로고침 실패",
          description: "데이터를 새로고침하는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // 차트 데이터 업데이트
  const updateChartData = async () => {
    if (!contest || !user) return

    try {
      // 내 점수 히스토리 생성
      const solveLogsRef = collection(db, "ctf_solve_logs")
      const q = query(
        solveLogsRef,
        where("userId", "==", user.uid),
        where("contestId", "==", contest.id),
        orderBy("solvedAt", "asc"),
      )
      const querySnapshot = await getDocs(q)

      let cumulativeScore = 0
      const scoreData: ScoreData[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        cumulativeScore += data.points
        scoreData.push({
          time: data.solvedAt.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          score: cumulativeScore,
          rank: 0,
        })
      })

      setScoreHistory(scoreData)

      // 카테고리별 통계
      const categoryCount: Record<string, number> = {}
      problems.forEach((problem) => {
        if (problem.solvedBy?.includes(user.uid)) {
          categoryCount[problem.category] = (categoryCount[problem.category] || 0) + 1
        }
      })

      const categoryData = Object.entries(categoryCount).map(([name, value], index) => ({
        name,
        value,
        color: categoryColors[index % categoryColors.length],
      }))

      setCategoryStats(categoryData)
    } catch (error) {
      console.error("Error updating chart data:", error)
    }
  }

  // 초기 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const contestData = await fetchContest()
        if (contestData && (canAccessProblems(contestData) || isAdmin)) {
          await Promise.all([
            fetchProblems(contestData.id),
            fetchParticipants(contestData.id),
            fetchRecentActivities(contestData.id),
          ])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadData()
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [params.id, user, isAdmin])

  // 실시간 업데이트 설정
  useEffect(() => {
    if (contest && (isAuthorized || isAdmin) && contest.status === "active") {
      refreshIntervalRef.current = setInterval(() => {
        refreshData(false)
      }, 30000) // 30초마다 업데이트

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [contest, isAuthorized, isAdmin])

  // 남은 시간 계산
  useEffect(() => {
    if (!contest) return

    const updateTimeRemaining = () => {
      const now = new Date()
      let targetTime: Date

      if (contest.status === "upcoming") {
        targetTime = contest.startTime.toDate()
      } else if (contest.status === "active") {
        targetTime = contest.endTime.toDate()
      } else {
        setTimeRemaining("대회 종료")
        return
      }

      const total = targetTime.getTime() - now.getTime()

      if (total <= 0) {
        if (contest.status === "upcoming") {
          setContest({ ...contest, status: "active" })
          setTimeRemaining("대회 시작됨")
        } else if (contest.status === "active") {
          setContest({ ...contest, status: "completed" })
          setTimeRemaining("대회 종료")
        }
        return
      }

      const seconds = Math.floor((total / 1000) % 60)
      const minutes = Math.floor((total / 1000 / 60) % 60)
      const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
      const days = Math.floor(total / (1000 * 60 * 60 * 24))

      let timeString = ""

      if (days > 0) {
        timeString = `${days}일 ${hours}시간 ${minutes}분`
      } else if (hours > 0) {
        timeString = `${hours}시간 ${minutes}분 ${seconds}초`
      } else {
        timeString = `${minutes}분 ${seconds}초`
      }

      setTimeRemaining(timeString)
    }

    updateTimeRemaining()
    timerRef.current = setInterval(updateTimeRemaining, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [contest])

  // 차트 데이터 업데이트
  useEffect(() => {
    if (contest && user && (isAuthorized || isAdmin)) {
      updateChartData()
    }
  }, [contest, user, isAuthorized, isAdmin, problems])

  // 대회 참가 처리
  const handleJoinContest = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "대회에 참가하려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!contest) return

    setIsJoining(true)

    try {
      const contestRef = doc(db, "ctf_contests", contest.id)
      await updateDoc(contestRef, {
        participants: arrayUnion(user.uid),
      })

      const participantId = `${contest.id}_${user.uid}`
      const participantRef = doc(db, "ctf_participants", participantId)
      await setDoc(participantRef, {
        uid: user.uid,
        username: userProfile?.username || user.displayName || "참가자",
        photoURL: user.photoURL || null,
        contestId: contest.id,
        score: 0,
        solvedProblems: [],
        joinedAt: serverTimestamp(),
        affiliation: userProfile?.affiliation || "",
      })

      setHasJoined(true)
      toast({
        title: "대회 참가 완료",
        description: "CTF 대회에 성공적으로 참가했습니다.",
        variant: "default",
      })

      await fetchParticipants(contest.id)
    } catch (error) {
      console.error("대회 참가 중 오류:", error)
      toast({
        title: "오류 발생",
        description: "대회 참가 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !contest || !selectedProblem) {
      toast({
        title: "제출 불가",
        description: "로그인하고 대회에 참가한 후 문제를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!canSubmitFlag(contest)) {
      if (!isContestStarted(contest) && !isAdmin) {
        toast({
          title: "대회 시작 전입니다",
          description: "대회가 시작된 후에 플래그를 제출할 수 있습니다.",
          variant: "destructive",
        })
        return
      }

      if (isContestEnded(contest)) {
        toast({
          title: "대회가 종료되었습니다",
          description: "대회가 종료되어 더 이상 플래그를 제출할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      if (!hasJoined && !isAdmin) {
        toast({
          title: "대회 참가가 필요합니다",
          description: "플래그를 제출하려면 먼저 먼저 대회에 참가해야 합니다.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "제출 권한이 없습니다",
        description: "플래그를 제출할 권한이 없습니다.",
        variant: "destructive",
      })
      return
    }

    if (!flagInput.trim()) {
      toast({
        title: "플래그를 입력해주세요",
        description: "플래그를 입력한 후 제출해주세요.",
        variant: "destructive",
      })
      return
    }

    if (selectedProblem.solvedBy?.includes(user?.uid)) {
      toast({
        title: "이미 해결한 문제입니다",
        description: "이 문제는 이미 해결하셨습니다.",
        variant: "default",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const problemRef = doc(db, "ctf_problems", selectedProblem.id)
      const problemSnap = await getDoc(problemRef)

      if (!problemSnap.exists()) {
        throw new Error("문제를 찾을 수 없습니다")
      }

      const freshProblemData = problemSnap.data()
      const correctFlag = freshProblemData.flag

      if (flagInput.trim().toLowerCase() === correctFlag.trim().toLowerCase()) {
        const batch = writeBatch(db)

        const participantId = `${contest.id}_${user.uid}`
        const participantRef = doc(db, "ctf_participants", participantId)

        batch.set(
          participantRef,
          {
            score: increment(selectedProblem.points),
            solvedProblems: arrayUnion(selectedProblem.id),
            lastSolveTime: serverTimestamp(),
          },
          { merge: true },
        )

        batch.update(problemRef, {
          solvedCount: increment(1),
          solvedBy: arrayUnion(user.uid),
        })

        const solveLogId = `${contest.id}_${user.uid}_${selectedProblem.id}`
        const solveLogRef = doc(db, "ctf_solve_logs", solveLogId)
        batch.set(solveLogRef, {
          userId: user.uid,
          username: userProfile?.username || user.displayName || "참가자",
          photoURL: user.photoURL || null,
          contestId: contest.id,
          problemId: selectedProblem.id,
          problemTitle: selectedProblem.title,
          category: selectedProblem.category,
          difficulty: selectedProblem.difficulty,
          points: selectedProblem.points,
          solvedAt: serverTimestamp(),
        })

        const userRef = doc(db, "users", user.uid)
        batch.set(
          userRef,
          {
            points: increment(selectedProblem.points),
            ctfPoints: increment(selectedProblem.points),
          },
          { merge: true },
        )

        await batch.commit()

        const updatedProblems = problems.map((p) =>
          p.id === selectedProblem.id
            ? {
                ...p,
                solvedCount: p.solvedCount + 1,
                solvedBy: [...(p.solvedBy || []), user.uid],
              }
            : p,
        )
        setProblems(updatedProblems)

        const updatedSelectedProblem = {
          ...selectedProblem,
          solvedCount: selectedProblem.solvedCount + 1,
          solvedBy: [...(selectedProblem.solvedBy || []), user.uid],
        }
        setSelectedProblem(updatedSelectedProblem)

        toast({
          title: "정답입니다! 🎉",
          description: `축하합니다! ${selectedProblem.points}점을 획득했습니다!`,
          variant: "default",
        })

        setFlagInput("")
        await refreshData(false)
      } else {
        toast({
          title: "오답입니다",
          description: "제출한 플래그가 정확하지 않습니다.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("플래그 제출 중 오류:", error)

      if (error.code === "permission-denied") {
        toast({
          title: "권한 오류",
          description: "플래그 제출 권한이 없습니다. 로그인 상태를 확인해주세요.",
          variant: "destructive",
        })
      } else if (error.code === "unavailable") {
        toast({
          title: "서버 연결 오류",
          description: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
          variant: "destructive",
        })
      } else if (error.code === "not-found") {
        toast({
          title: "문제 오류",
          description: "문제를 찾을 수 없습니다. 페이지를 새로고침해주세요.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "제출 실패",
          description: "플래그 제출 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 비밀번호 제출 처리
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (!passwordInput.trim()) {
      setPasswordError("비밀번호를 입력해주세요.")
      return
    }

    if (!contest || !user) {
      toast({
        title: "로그인이 필요합니다",
        description: "비밀번호 보호 대회에 참가하려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsPasswordSubmitting(true)

    try {
      const contestRef = doc(db, "ctf_contests", contest.id)
      const contestSnap = await getDoc(contestRef)

      if (!contestSnap.exists()) {
        setPasswordError("대회를 찾을 수 없습니다.")
        setIsPasswordSubmitting(false)
        return
      }

      const contestData = contestSnap.data()

      if (passwordInput === contestData.password) {
        await updateDoc(contestRef, {
          authorizedUsers: arrayUnion(user.uid),
        })

        setIsAuthorized(true)
        setIsPasswordDialogOpen(false)
        saveAuthStateToLocalStorage(contest.id, true)

        // 권한 확인 후 문제 로딩
        if (canAccessProblems(contest) || isAdmin) {
          await fetchProblems(contest.id)
          await fetchParticipants(contest.id)
          await fetchRecentActivities(contest.id)
        }

        toast({
          title: "인증 성공",
          description: "비밀번호가 확인되었습니다.",
          variant: "default",
        })
      } else {
        setPasswordError("비밀번호가 일치하지 않습니다.")
      }
    } catch (error) {
      console.error("Error verifying password:", error)
      setPasswordError("비밀번호 확인 중 오류가 발생했습니다.")
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  // 마크다운 복사 스크립트 로드
  useEffect(() => {
    const script = document.createElement("script")
    script.innerHTML = generateCopyScript()
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 상대 시간 포맷 함수
  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return "방금 전"

    const now = new Date()
    const time = timestamp.toDate()
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return "방금 전"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    return `${Math.floor(diffInSeconds / 86400)}일 전`
  }

  const getCategoryStyle = (category: string) => {
    const styles = {
      "웹 해킹": "bg-blue-600/30 text-blue-300 border-blue-500/40",
      "시스템 해킹": "bg-red-600/30 text-red-300 border-red-500/40",
      리버싱: "bg-purple-600/30 text-purple-300 border-purple-500/40",
      암호학: "bg-green-600/30 text-green-300 border-green-500/40",
      포렌식: "bg-orange-600/30 text-orange-300 border-orange-500/40",
      네트워크: "bg-cyan-600/30 text-cyan-300 border-cyan-500/40",
      웹: "bg-blue-600/30 text-blue-300 border-blue-500/40",
      기타: "bg-gray-600/30 text-gray-300 border-gray-500/40",
    }
    return styles[category as keyof typeof styles] || styles["기타"]
  }

  const getDifficultyStyle = (difficulty: string) => {
    const styles = {
      초급: "bg-green-600/30 text-green-300 border-green-500/40",
      중급: "bg-yellow-600/30 text-yellow-300 border-yellow-500/40",
      고급: "bg-red-600/30 text-red-300 border-red-500/40",
      easy: "bg-green-600/30 to-emerald-600/30 text-green-300 border-green-500/40",
      medium: "bg-yellow-600/30 to-orange-600/30 text-yellow-300 border-yellow-500/40",
      hard: "bg-red-600/30 to-pink-600/30 text-red-300 border-red-500/40",
    }
    return styles[difficulty as keyof typeof styles] || styles["중급"]
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 md:px-6 max-w-[1800px]">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/ctf")}
              className="mb-4 hover:bg-gray-900/50 text-gray-300 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              대회 목록으로
            </Button>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3 bg-gray-800" />
                <Skeleton className="h-6 w-1/4 bg-gray-800" />
                <Skeleton className="h-4 w-1/5 bg-gray-800" />
              </div>
            ) : contest ? (
              <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                {/* 시상식 */}
                {shouldShowAwardCeremony(contest) && (
                  <div className="mb-6">
                    <Card className="border-0 shadow-2xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-xl border border-yellow-500/30">
                      <CardHeader className="text-center pb-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/40">
                            <Trophy className="h-8 w-8 text-yellow-400" />
                          </div>
                          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                            🏆 시상식 🏆
                          </CardTitle>
                          <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/40">
                            <Crown className="h-8 w-8 text-yellow-400" />
                          </div>
                        </div>
                        <CardDescription className="text-lg text-gray-300">
                          {contest.title} 대회 결과 발표
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center items-end gap-6 mb-8">
                          {/* 2등 */}
                          {participants[1] && (
                            <div className="flex flex-col items-center">
                              <div className="relative mb-4">
                                <div className="w-20 h-28 bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-lg flex items-end justify-center pb-2 shadow-2xl">
                                  <span className="text-white font-bold">2nd</span>
                                </div>
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-xl border-4 border-white">
                                    <Medal className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              </div>
                              <Avatar className="h-16 w-16 border-4 border-gray-400 shadow-xl mb-3">
                                <AvatarImage
                                  src={participants[1].photoURL || "/placeholder.svg"}
                                  alt={participants[1].username}
                                />
                                <AvatarFallback className="bg-gray-400 text-white font-bold">
                                  {participants[1].username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-lg font-bold text-gray-300 mb-1">{participants[1].username}</h3>
                              {participants[1].affiliation && (
                                <p className="text-sm text-gray-500 mb-2">{participants[1].affiliation}</p>
                              )}
                              <div className="flex items-center gap-2 bg-gray-500/20 px-3 py-1.5 rounded-full border border-gray-500/40">
                                <Medal className="h-4 w-4 text-gray-400" />
                                <span className="font-bold text-gray-400">
                                  {participants[1].score.toLocaleString()}점
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 1등 - 가운데, 가장 높게 */}
                          {participants[0] && (
                            <div className="flex flex-col items-center">
                              <div className="relative mb-4">
                                <div className="w-24 h-36 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg flex items-end justify-center pb-2 shadow-2xl">
                                  <span className="text-white font-bold text-lg">1st</span>
                                </div>
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl border-4 border-white">
                                    <Crown className="h-8 w-8 text-white" />
                                  </div>
                                </div>
                              </div>
                              <Avatar className="h-20 w-20 border-4 border-yellow-400 shadow-xl mb-3">
                                <AvatarImage
                                  src={participants[0].photoURL || "/placeholder.svg"}
                                  alt={participants[0].username}
                                />
                                <AvatarFallback className="bg-yellow-400 text-white font-bold text-xl">
                                  {participants[0].username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-xl font-bold text-yellow-400 mb-1">{participants[0].username}</h3>
                              {participants[0].affiliation && (
                                <p className="text-sm text-gray-400 mb-2">{participants[0].affiliation}</p>
                              )}
                              <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/40">
                                <Trophy className="h-5 w-5 text-yellow-400" />
                                <span className="text-lg font-bold text-yellow-400">
                                  {participants[0].score.toLocaleString()}점
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 3등 */}
                          {participants[2] && (
                            <div className="flex flex-col items-center">
                              <div className="relative mb-4">
                                <div className="w-20 h-24 bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-lg flex items-end justify-center pb-2 shadow-2xl">
                                  <span className="text-white font-bold">3rd</span>
                                </div>
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl border-4 border-white">
                                    <Trophy className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              </div>
                              <Avatar className="h-16 w-16 border-4 border-amber-500 shadow-xl mb-3">
                                <AvatarImage
                                  src={participants[2].photoURL || "/placeholder.svg"}
                                  alt={participants[2].username}
                                />
                                <AvatarFallback className="bg-amber-500 text-white font-bold">
                                  {participants[2].username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-lg font-bold text-amber-400 mb-1">{participants[2].username}</h3>
                              {participants[2].affiliation && (
                                <p className="text-sm text-gray-500 mb-2">{participants[2].affiliation}</p>
                              )}
                              <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/40">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="font-bold text-amber-400">
                                  {participants[2].score.toLocaleString()}점
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 대회 통계 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-black/30 rounded-xl border border-gray-700/50">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">{participants.length}</div>
                            <div className="text-sm text-gray-400">총 참가자</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">{problems.length}</div>
                            <div className="text-sm text-gray-400">총 문제 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">
                              {problems.reduce((sum, p) => sum + (p.solvedCount || 0), 0)}
                            </div>
                            <div className="text-sm text-gray-400">총 해결 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">
                              {participants[0] ? participants[0].score : 0}
                            </div>
                            <div className="text-sm text-gray-400">최고 점수</div>
                          </div>
                        </div>

                        {/* 축하 메시지 */}
                        <div className="text-center mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
                          <p className="text-lg text-gray-300 mb-2">🎉 모든 참가자들에게 축하드립니다! 🎉</p>
                          <p className="text-sm text-gray-400">{contest.title} 대회에 참가해주셔서 감사합니다.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {contest.status === "active" ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1.5 shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      Live
                    </Badge>
                  ) : contest.status === "upcoming" ? (
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1.5 shadow-lg">
                      <Clock className="h-3 w-3 mr-2" />
                      Upcoming
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0 px-3 py-1.5 shadow-lg">
                      <CheckCircle className="h-3 w-3 mr-2" />
                      Ended
                    </Badge>
                  )}

                  {contest.isPasswordProtected && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1.5 shadow-lg">
                      <Lock className="h-3 w-3 mr-2" />
                      Private
                    </Badge>
                  )}

                  {isAdmin && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-3 py-1.5 shadow-lg">
                      <Shield className="h-3 w-3 mr-2" />
                      Admin
                    </Badge>
                  )}

                  <Badge className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 text-white border border-gray-600/50 px-3 py-1.5 ml-auto backdrop-blur-sm shadow-lg">
                    <Clock className="h-3 w-3 mr-2" />
                    {timeRemaining}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshData(true)}
                    disabled={isRefreshing}
                    className="border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white"
                  >
                    {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {contest.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(contest.startTime.toDate())} - {formatDate(contest.endTime.toDate())}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>{problems.length} problems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{contest.participants?.length || 0} participants</span>
                  </div>
                  <div className="text-xs text-gray-500">마지막 업데이트: {lastUpdate.toLocaleTimeString("ko-KR")}</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 비밀번호 다이얼로그 */}
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  비밀번호 보호 대회
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  이 대회는 비밀번호로 보호되어 있습니다. 참가하려면 비밀번호를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="대회 비밀번호를 입력하세요"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 pr-10"
                    disabled={isPasswordSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordDialogOpen(false)}
                    className="flex-1 border-gray-600 hover:bg-gray-800 text-gray-300"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPasswordSubmitting}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {isPasswordSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        확인 중...
                      </>
                    ) : (
                      "확인"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-12 h-[calc(100vh-250px)]">
              <div className="lg:col-span-3">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
              <div className="lg:col-span-6">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
              <div className="lg:col-span-3">
                <Skeleton className="h-full w-full bg-gray-800" />
              </div>
            </div>
          ) : contest && (isAuthorized || isAdmin) ? (
            <div className="grid gap-6 lg:grid-cols-12 min-h-[calc(100vh-250px)]">
              {/* 왼쪽: 문제 목록 (3/12) */}
              <div className="lg:col-span-3">
                <Card className="h-full border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="flex items-center gap-3 text-lg text-white">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                        <Target className="h-4 w-4 text-orange-400" />
                      </div>
                      문제 목록
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {!isContestStarted(contest) && !isAdmin
                        ? "대회가 시작되면 문제를 볼 수 있습니다."
                        : "문제를 선택하여 풀어보세요."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    {!isContestStarted(contest) && !isAdmin ? (
                      <div className="p-6 text-center h-full flex flex-col justify-center">
                        <div className="p-3 rounded-full bg-gray-800/50 mx-auto mb-4 w-fit">
                          <Lock className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 mb-2">대회 시작 전입니다</p>
                        <p className="text-sm text-gray-500">{formatDate(contest.startTime.toDate())}에 시작됩니다</p>
                      </div>
                    ) : !hasJoined && !isAdmin ? (
                      <div className="p-6 text-center h-full flex flex-col justify-center">
                        <div className="p-3 rounded-full bg-gray-800/50 mx-auto mb-4 w-fit">
                          <Users className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 mb-4">대회 참가가 필요합니다</p>
                        <Button
                          onClick={handleJoinContest}
                          disabled={isJoining}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              참가 중...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              대회 참가하기
                            </>
                          )}
                        </Button>
                      </div>
                    ) : problems.length === 0 ? (
                      <div className="p-6 text-center h-full flex flex-col justify-center items-center bg-gray-800/30 rounded-xl border border-gray-700/50 shadow-inner">
                        <div className="p-4 rounded-full bg-gray-700/50 mx-auto mb-4 w-fit">
                          <AlertCircle className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">아직 등록된 문제가 없습니다</h3>
                        <p className="text-gray-400 text-sm max-w-xs">
                          대회 관리자가 문제를 추가하거나, 대회가 시작되면 새로운 문제가 나타날 수 있습니다.
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-full max-h-[calc(100vh-350px)]">
                        <div className="p-4 space-y-3">
                          {problems.map((problem) => (
                            <Card
                              key={problem.id}
                              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border ${
                                selectedProblem?.id === problem.id
                                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-xl"
                                  : "bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50"
                              }`}
                              onClick={() => setSelectedProblem(problem)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge
                                    variant="outline"
                                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 ${getCategoryStyle(problem.category)}`}
                                  >
                                    {categoryIcons[problem.category] || <Layers className="h-3 w-3" />}
                                    <span>{problem.category}</span>
                                  </Badge>
                                  <div className="flex items-center gap-1.5 bg-amber-500/20 px-2 py-1 rounded-full">
                                    <Trophy className="h-3 w-3 text-amber-400" />
                                    <span className="text-xs font-bold text-amber-300">{problem.points}</span>
                                  </div>
                                </div>

                                <h4 className="font-semibold text-sm mb-3 text-white group-hover:text-orange-300 transition-colors line-clamp-2">
                                  {problem.title}
                                </h4>

                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-medium px-2 py-0.5 ${getDifficultyStyle(problem.difficulty)}`}
                                  >
                                    {problem.difficulty}
                                  </Badge>

                                  {problem.solvedBy?.includes(user?.uid || "") ? (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium px-2 py-0.5 border-0">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Solved
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-gray-400 font-medium">
                                      {problem.solvedCount || 0} solves
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 가운데: 문제 상세 및 차트 (6/12) */}
              <div className="lg:col-span-6 space-y-6">
                {/* 문제 상세 */}
                {selectedProblem ? (
                  <Card className="border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 flex flex-col">
                    <CardHeader className="pb-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-2 ${getCategoryStyle(selectedProblem.category)}`}
                        >
                          {categoryIcons[selectedProblem.category] || <Layers className="h-4 w-4" />}
                          <span>{selectedProblem.category}</span>
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`${difficultyColors[selectedProblem.difficulty] || "bg-gray-700 text-gray-300"} border-0`}
                        >
                          {selectedProblem.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="mt-3 text-xl text-white">{selectedProblem.title}</CardTitle>
                      <CardDescription className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold text-yellow-400">{selectedProblem.points} 점</span>
                        </div>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">{selectedProblem.solvedCount || 0}명 해결</span>
                        {selectedProblem.solvedBy?.includes(user?.uid || "") && (
                          <>
                            <span className="text-gray-500">•</span>
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              해결 완료
                            </Badge>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex flex-col">
                      {!isContestStarted(contest) && !isAdmin ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="p-4 rounded-full bg-gray-800/50 mb-4">
                            <Lock className="h-8 w-8 text-gray-500" />
                          </div>
                          <h3 className="text-xl font-bold text-white">대회 시작 전입니다</h3>
                          <p className="text-gray-400 mt-2">대회가 시작된 후에 문제를 볼 수 있습니다.</p>
                        </div>
                      ) : (
                        <ScrollArea className="flex-1 min-h-0">
                          <div className="p-6 bg-black/50 rounded-xl border border-gray-700/50 select-text overflow-hidden">
                            <div
                              className="select-text prose prose-invert max-w-none break-words overflow-wrap-anywhere"
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedProblem.description) }}
                            />

                            {/* 파일 다운로드 섹션 */}
                            {selectedProblem.files && selectedProblem.files.length > 0 && (
                              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  첨부 파일
                                </h4>
                                <div className="space-y-2">
                                  {selectedProblem.files.map((file, index) => {
                                    const fileName = typeof file === "string" ? file : file.name || "Unknown File"
                                    const fileUrl = typeof file === "string" ? file : file.url || "#"

                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-600"
                                      >
                                        <span className="text-sm text-gray-300 font-mono">{fileName}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-gray-600 hover:bg-gray-700 text-gray-300 bg-transparent"
                                          onClick={() => window.open(fileUrl, "_blank")}
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          다운로드
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 포트 정보 */}
                            {selectedProblem.port && (
                              <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                                <div className="flex items-center gap-2 text-blue-300">
                                  <Server className="h-4 w-4" />
                                  <span className="text-sm font-medium">서버 포트: {selectedProblem.port}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>

                    {/* 플래그 제출 폼 */}
                    {canSubmitFlag(contest) &&
                      selectedProblem &&
                      !selectedProblem.solvedBy?.includes(user?.uid || "") && (
                        <div className="p-6 border-t border-gray-700/50">
                          <form onSubmit={handleSubmitFlag} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">플래그 제출</label>
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="FLAG{...}"
                                  value={flagInput}
                                  onChange={(e) => setFlagInput(e.target.value)}
                                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                                  disabled={isSubmitting}
                                />
                                <Button
                                  type="submit"
                                  disabled={isSubmitting || !flagInput.trim()}
                                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}
                  </Card>
                ) : (
                  <div className="p-8 text-center h-full flex flex-col justify-center">
                    <div className="p-4 rounded-full bg-gray-800/50 mx-auto mb-4 w-fit">
                      <Flag className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400">문제를 선택해주세요.</p>
                  </div>
                )}

                {/* 실시간 차트 */}
                {user && myParticipant && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 점수 히스토리 차트 */}
                    <Card className="border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                          <TrendingUp className="h-5 w-5 text-green-400" />내 점수 추이
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {scoreHistory.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={scoreHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                              <YAxis stroke="#9CA3AF" fontSize={12} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1F2937",
                                  border: "1px solid #374151",
                                  borderRadius: "8px",
                                  color: "#F3F4F6",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#10B981"
                                strokeWidth={3}
                                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[200px] flex items-center justify-center text-gray-500">
                            아직 해결한 문제가 없습니다
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 카테고리별 해결 현황 */}
                    <Card className="border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                          <PieChartIcon className="h-5 w-5 text-blue-400" />
                          카테고리별 해결 현황
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {categoryStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={categoryStats}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {categoryStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1F2937",
                                  border: "1px solid #374151",
                                  borderRadius: "8px",
                                  color: "#F3F4F6",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[200px] flex items-center justify-center text-gray-500">
                            아직 해결한 문제가 없습니다
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* 오른쪽: 순위표 및 활동 (3/12) */}
              <div className="lg:col-span-3 space-y-6">
                {/* 실시간 순위표 */}
                <Card className="border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-white">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                      </div>
                      실시간 순위
                      {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
                    </CardTitle>
                    <CardDescription className="text-gray-400">대회 참가자들의 실시간 순위입니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      {" "}
                      {/* Increased height to show more */}
                      <div className="p-4 space-y-3">
                        {participants.map(
                          (
                            participant, // Removed slice(0, 10)
                          ) => (
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
                                <AvatarImage
                                  src={participant.photoURL || "/placeholder.svg"}
                                  alt={participant.username}
                                />
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
                                {participant.affiliation && (
                                  <p className="text-xs text-gray-500 mb-1">{participant.affiliation}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-3 w-3 text-amber-500" />
                                  <span className="text-sm font-bold text-amber-400">
                                    {participant.score.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-500">점</span>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* 실시간 활동 */}
                <Card className="border-0 shadow-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-white">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                        <Activity className="h-4 w-4 text-green-400" />
                      </div>
                      실시간 활동
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2 py-0.5">
                        <Zap className="h-2.5 w-2.5 mr-1" />
                        Live
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-400">최근 문제 해결 활동을 확인하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      {" "}
                      {/* Increased height to show more */}
                      <div className="p-4 space-y-3">
                        {recentActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-all duration-300"
                          >
                            <Avatar className="h-8 w-8 border-2 border-gray-600 shadow-md">
                              <AvatarImage src={activity.photoURL || "/placeholder.svg"} alt={activity.username} />
                              <AvatarFallback className="bg-gray-700 text-gray-300 font-bold">
                                {activity.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white truncate">{activity.username}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1.5 py-0.5 ${getCategoryStyle(activity.category)}`}
                                >
                                  {activity.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400 truncate mb-1">{activity.problemTitle}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3 text-amber-500" />
                                  <span className="text-xs font-bold text-amber-400">+{activity.points}</span>
                                </div>
                                <span className="text-xs text-gray-500">{formatRelativeTime(activity.solvedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {recentActivities.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">아직 활동이 없습니다</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center h-full flex flex-col justify-center">
              <div className="p-6 rounded-full bg-gray-800/50 mx-auto mb-6 w-fit">
                <Lock className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">접근 권한이 필요합니다</h3>
              <p className="text-gray-400 mb-6">
                이 대회에 참가하려면 {contest?.isPasswordProtected ? "비밀번호 인증이" : "로그인이"} 필요합니다.
              </p>
              {!user ? (
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 mx-auto"
                >
                  로그인하기
                </Button>
              ) : contest?.isPasswordProtected ? (
                <Button
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 mx-auto"
                >
                  비밀번호 입력
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
