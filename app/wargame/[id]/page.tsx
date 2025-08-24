"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  Flag,
  Trophy,
  User,
  CheckCircle,
  Server,
  Globe,
  Lock,
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  LogIn,
  UserPlus,
  Crown,
  Medal,
  Award,
  Shield,
  Code,
  Brain,
  Star,
  Calendar,
  Target,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  MessageCircle,
  Send,
  Edit,
  TrendingUp,
  Clock,
  Eye,
  FileText,
  Flame,
  Timer,
} from "lucide-react"
import {
  doc,
  getDoc,
  arrayUnion,
  increment,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  Timestamp,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayRemove,
  getDocs,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { WargameChallenge } from "@/lib/wargame-types"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"
import { UserProfileHover } from "@/components/user-profile-hover"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

// 기존 import에서 calculatePointsByLevel을 제거하고 직접 정의
const calculatePointsByLevel = (level: number): number => {
  const basePoints = 100
  const weights: Record<number, number> = {
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
  const weight = weights[level] || 1
  return Math.round(basePoints * weight)
}

// 카테고리 아이콘 및 색상 매핑
const categoryConfig: Record<string, { icon: React.ReactNode; colors: string; bgColor: string }> = {
  "웹 해킹": {
    icon: <Globe className="h-4 w-4" />,
    colors: "text-blue-400 border-blue-500/30",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
  },
  "시스템 해킹": {
    icon: <Server className="h-4 w-4" />,
    colors: "text-purple-400 border-purple-500/30",
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
  },
  리버싱: {
    icon: <Brain className="h-4 w-4" />,
    colors: "text-pink-400 border-pink-500/30",
    bgColor: "bg-pink-500/10 hover:bg-pink-500/20",
  },
  암호학: {
    icon: <Lock className="h-4 w-4" />,
    colors: "text-cyan-400 border-cyan-500/30",
    bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20",
  },
  포렌식: {
    icon: <Shield className="h-4 w-4" />,
    colors: "text-emerald-400 border-emerald-500/30",
    bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  기타: {
    icon: <Code className="h-4 w-4" />,
    colors: "text-gray-400 border-gray-500/30",
    bgColor: "bg-gray-500/10 hover:bg-gray-500/20",
  },
}

// 난이도 색상 매핑
const getDifficultyConfig = (level: number) => {
  if (level <= 3) {
    return {
      colors: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      gradient: "from-emerald-500/20 to-teal-500/20",
      name: "쉬움",
    }
  } else if (level <= 6) {
    return {
      colors: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      gradient: "from-amber-500/20 to-orange-500/20",
      name: "보통",
    }
  } else if (level <= 8) {
    return {
      colors: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      gradient: "from-orange-500/20 to-red-500/20",
      name: "어려움",
    }
  } else {
    return {
      colors: "bg-red-500/20 text-red-400 border-red-500/30",
      gradient: "from-red-500/20 to-pink-500/20",
      name: "매우 어려움",
    }
  }
}

// 타입 정의
type Solver = {
  uid: string
  username: string
  photoURL?: string
  solvedAt: Timestamp
  rank: number
  isFirstBlood: boolean
}

type WriteUpComment = {
  id: string
  userId: string
  username: string
  photoURL?: string
  content: string
  createdAt: Timestamp
  likes: string[]
}

type WriteUp = {
  id: string
  userId: string
  username: string
  photoURL?: string
  challengeId: string
  title: string
  content: string
  createdAt: Timestamp
  updatedAt: Timestamp
  likes: string[]
  dislikes: string[]
  bookmarks: string[]
  isFirstBlood: boolean
  comments: WriteUpComment[]
}

type DifficultyVote = {
  userId: string
  vote: number
  createdAt: Timestamp
}

export default function ChallengePage({ params }: { params: { id: string } }) {
  const { user, userProfile, updateUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [challenge, setChallenge] = useState<WargameChallenge | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flagInput, setFlagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSolved, setHasSolved] = useState(false)
  const [solvers, setSolvers] = useState<Solver[]>([])
  const [firstBloodSolver, setFirstBloodSolver] = useState<Solver | null>(null)
  const [challengeCreatedAt, setChallengeCreatedAt] = useState<Timestamp | null>(null)
  const [writeUps, setWriteUps] = useState<WriteUp[]>([])
  const [difficultyVotes, setDifficultyVotes] = useState<DifficultyVote[]>([])
  const [userDifficultyVote, setUserDifficultyVote] = useState<number | null>(null)

  // 풀이 작성 관련 상태
  const [isWritingUp, setIsWritingUp] = useState(false)
  const [writeUpTitle, setWriteUpTitle] = useState("")
  const [writeUpContent, setWriteUpContent] = useState("")
  const [isSubmittingWriteUp, setIsSubmittingWriteUp] = useState(false)

  // 댓글 관련 상태
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({})

  // 네트워크 상태 관리
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState<string | null>(null)

  // 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (pendingSubmission) {
        handleRetrySubmission(pendingSubmission)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [pendingSubmission])

  // 재시도 메커니즘
  const handleRetrySubmission = useCallback(
    async (flag: string) => {
      if (!isOnline) {
        setPendingSubmission(flag)
        toast({
          title: "오프라인 상태",
          description: "네트워크 연결을 확인한 후 다시 시도해주세요. 온라인 복구 시 자동으로 재시도됩니다.",
          variant: "destructive",
        })
        return
      }

      setIsRetrying(true)
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        try {
          await submitFlagWithRetry(flag)
          setPendingSubmission(null)
          setIsRetrying(false)
          return
        } catch (error) {
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      setIsRetrying(false)
      toast({
        title: "제출 실패",
        description: "네트워크 문제로 제출에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    },
    [isOnline],
  )

  const submitFlagWithRetry = async (flag: string) => {
    if (!navigator.onLine) {
      throw new Error("네트워크 연결이 없습니다")
    }

    // 타임아웃 처리를 위한 AbortController 사용
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const challengeRef = doc(db, "wargame_challenges", challenge!.id)
      const challengeSnap = await getDoc(challengeRef)

      if (!challengeSnap.exists()) {
        throw new Error("문제를 찾을 수 없습니다")
      }

      const freshChallengeData = challengeSnap.data()
      const correctFlag = freshChallengeData.flag

      if (flag.trim().toLowerCase() !== correctFlag.trim().toLowerCase()) {
        throw new Error("오답입니다")
      }

      if (freshChallengeData.solvedBy && freshChallengeData.solvedBy.includes(user!.uid)) {
        throw new Error("이미 해결한 문제입니다")
      }

      const points = calculatePointsByLevel(challenge!.level)

      const batch = writeBatch(db)

      // 챌린지 업데이트
      batch.update(challengeRef, {
        solvedCount: increment(1),
        solvedBy: arrayUnion(user!.uid),
      })

      // 사용자 정보 업데이트
      const userRef = doc(db, "users", user!.uid)
      batch.set(
        userRef,
        {
          points: increment(points),
          wargameScore: increment(points),
          solvedWargameProblems: arrayUnion(challenge!.id),
        },
        { merge: true },
      )

      // 해결 로그 추가
      const solveLogRef = doc(collection(db, "wargame_solve_logs"))
      batch.set(solveLogRef, {
        userId: user!.uid,
        username: userProfile?.username || user!.displayName || "사용자",
        photoURL: user!.photoURL,
        challengeId: challenge!.id,
        challengeTitle: challenge!.title,
        category: challenge!.category,
        level: challenge!.level,
        points: points,
        solvedAt: serverTimestamp(),
      })

      // 사용자별 해결 로그 추가
      const userSolveLogRef = doc(db, "user_solve_logs", `${user!.uid}_${challenge!.id}`)
      batch.set(userSolveLogRef, {
        userId: user!.uid,
        username: userProfile?.username || user!.displayName || "사용자",
        challengeId: challenge!.id,
        challengeTitle: challenge!.title,
        type: "wargame",
        category: challenge!.category,
        level: challenge!.level,
        points: points,
        solvedAt: serverTimestamp(),
      })

      await batch.commit()
      clearTimeout(timeoutId)

      return { success: true, points }
    } catch (error: any) {
      clearTimeout(timeoutId)
      console.error("제출 오류:", error)

      if (controller.signal.aborted) {
        throw new Error("요청 시간 초과")
      }

      if (error.code === "permission-denied") {
        throw new Error("권한이 없습니다. 로그인 상태를 확인해주세요.")
      }

      if (error.code === "unavailable") {
        throw new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.")
      }

      if (error.code === "not-found") {
        throw new Error("문제를 찾을 수 없습니다.")
      }

      throw error
    }
  }

  // 문제 정보 가져오기
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const challengeRef = doc(db, "wargame_challenges", params.id)
        const challengeSnap = await getDoc(challengeRef)

        if (challengeSnap.exists()) {
          const challengeData = challengeSnap.data() as WargameChallenge
          setChallenge({
            id: challengeSnap.id,
            ...challengeData,
            solvedBy: challengeData.solvedBy || [],
            solvedCount: challengeData.solvedCount || 0,
            // additionalResources가 배열인지 확인하고 아니면 빈 배열로 설정
            additionalResources: Array.isArray(challengeData.additionalResources)
              ? challengeData.additionalResources
              : [],
          })

          // 문제 생성 시간 저장
          setChallengeCreatedAt(challengeData.createdAt || null)

          if (user && challengeData.solvedBy && Array.isArray(challengeData.solvedBy)) {
            if (challengeData.solvedBy.includes(user.uid)) {
              setHasSolved(true)
            }
          }
        } else {
          toast({
            title: "문제를 찾을 수 없습니다",
            description: "요청하신 문제가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/wargame")
        }
      } catch (error) {
        console.error("Error fetching challenge:", error)
        toast({
          title: "오류 발생",
          description: "문제 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchChallenge()
    }
  }, [params.id, router, toast, user])

  // 해결자 목록 가져오기 (시간순 정렬로 First Blood 정확히 찾기)
  useEffect(() => {
    if (!params.id) return

    const fetchSolvers = async () => {
      try {
        const solveLogsRef = collection(db, "wargame_solve_logs")
        const q = query(
          solveLogsRef,
          where("challengeId", "==", params.id),
          orderBy("solvedAt", "asc"), // 오래된 순으로 정렬 (First Blood 찾기 위해)
        )

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const solversData: Solver[] = []
            let firstBlood: Solver | null = null

            snapshot.forEach((doc, index) => {
              const data = doc.data()
              const isFirst = index === 0 // 첫 번째가 First Blood

              const solver: Solver = {
                uid: data.userId,
                username: data.username || "익명",
                photoURL: data.photoURL,
                solvedAt: data.solvedAt || Timestamp.now(),
                rank: index + 1,
                isFirstBlood: isFirst,
              }

              solversData.push(solver)

              if (isFirst) {
                firstBlood = solver
              }
            })

            // 최신순으로 다시 정렬 (표시용)
            const sortedSolvers = [...solversData].sort((a, b) => b.solvedAt.toMillis() - a.solvedAt.toMillis())

            setSolvers(sortedSolvers)
            setFirstBloodSolver(firstBlood)
          },
          (error) => {
            console.error("Error getting solvers:", error)
            // Fallback to direct query if real-time fails
            fetchSolversDirectly()
          },
        )

        return unsubscribe
      } catch (error) {
        console.error("Error setting up solvers listener:", error)
        fetchSolversDirectly()
      }
    }

    const fetchSolversDirectly = async () => {
      try {
        const solveLogsRef = collection(db, "wargame_solve_logs")
        const q = query(
          solveLogsRef,
          where("challengeId", "==", params.id),
          orderBy("solvedAt", "asc"), // 오래된 순으로 정렬
        )
        const querySnapshot = await getDocs(q)

        const solversData: Solver[] = []
        let firstBlood: Solver | null = null

        querySnapshot.forEach((doc, index) => {
          const data = doc.data()
          const isFirst = index === 0

          const solver: Solver = {
            uid: data.userId,
            username: data.username || "익명",
            photoURL: data.photoURL,
            solvedAt: data.solvedAt || Timestamp.now(),
            rank: index + 1,
            isFirstBlood: isFirst,
          }

          solversData.push(solver)

          if (isFirst) {
            firstBlood = solver
          }
        })

        // 최신순으로 다시 정렬 (표시용)
        const sortedSolvers = [...solversData].sort((a, b) => b.solvedAt.toMillis() - a.solvedAt.toMillis())

        setSolvers(sortedSolvers)
        setFirstBloodSolver(firstBlood)
      } catch (error) {
        console.error("Error fetching solvers directly:", error)
      }
    }

    fetchSolvers()
  }, [params.id])

  // 풀이 목록 가져오기
  useEffect(() => {
    if (!params.id) return

    const fetchWriteUps = async () => {
      try {
        const writeUpsRef = collection(db, "wargame_writeups")
        const q = query(writeUpsRef, where("challengeId", "==", params.id), orderBy("createdAt", "desc"))

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const writeUpsData: WriteUp[] = []
            snapshot.forEach((doc) => {
              const data = doc.data()
              writeUpsData.push({
                id: doc.id,
                userId: data.userId || "",
                username: data.username || "익명",
                photoURL: data.photoURL,
                challengeId: data.challengeId || "",
                title: data.title || "",
                content: data.content || "",
                createdAt: data.createdAt || Timestamp.now(),
                updatedAt: data.updatedAt || Timestamp.now(),
                likes: data.likes || [],
                dislikes: data.dislikes || [],
                bookmarks: data.bookmarks || [],
                isFirstBlood: data.isFirstBlood || false,
                comments: data.comments || [],
              })
            })
            setWriteUps(writeUpsData)
          },
          (error) => {
            console.error("Error fetching writeups:", error)
          },
        )

        return unsubscribe
      } catch (error) {
        console.error("Error setting up writeups listener:", error)
      }
    }

    fetchWriteUps()
  }, [params.id])

  // 난이도 투표 가져오기
  useEffect(() => {
    if (!params.id) return

    const fetchDifficultyVotes = async () => {
      try {
        const votesRef = collection(db, "wargame_difficulty_votes")
        const q = query(votesRef, where("challengeId", "==", params.id))

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const votesData: DifficultyVote[] = []
            snapshot.forEach((doc) => {
              const data = doc.data()
              votesData.push({
                userId: data.userId,
                vote: data.vote,
                createdAt: data.createdAt || Timestamp.now(),
              })

              if (user && data.userId === user.uid) {
                setUserDifficultyVote(data.vote)
              }
            })
            setDifficultyVotes(votesData)

            // 평균 난이도 계산 및 문제 레벨 업데이트
            if (votesData.length >= 5 && challenge) {
              const averageVote = votesData.reduce((sum, vote) => sum + vote.vote, 0) / votesData.length
              const newLevel = Math.round(averageVote)

              if (newLevel !== challenge.level) {
                updateChallengeLevel(newLevel)
              }
            }
          },
          (error) => {
            console.error("Error fetching difficulty votes:", error)
          },
        )

        return unsubscribe
      } catch (error) {
        console.error("Error setting up difficulty votes listener:", error)
      }
    }

    fetchDifficultyVotes()
  }, [params.id, user, challenge])

  // 문제 레벨 업데이트
  const updateChallengeLevel = async (newLevel: number) => {
    try {
      const challengeRef = doc(db, "wargame_challenges", params.id)
      const newPoints = calculatePointsByLevel(newLevel)

      await updateDoc(challengeRef, {
        level: newLevel,
        points: newPoints,
      })

      if (challenge) {
        setChallenge({ ...challenge, level: newLevel, points: newPoints })
      }

      toast({
        title: "난이도 업데이트",
        description: `문제 난이도가 레벨 ${newLevel}로 업데이트되었습니다! (${newPoints}점)`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating challenge level:", error)
    }
  }

  // 플래그 제출 처리
  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "문제를 풀려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!challenge) {
      toast({
        title: "문제 정보 오류",
        description: "문제 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.",
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

    if (hasSolved) {
      toast({
        title: "이미 해결한 문제입니다",
        description: "이 문제는 이미 해결하셨습니다.",
        variant: "default",
      })
      return
    }

    if (!isOnline) {
      setPendingSubmission(flagInput.trim())
      toast({
        title: "오프라인 상태",
        description: "네트워크 연결을 확인해주세요. 온라인 복구 시 자동으로 제출됩니다.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitFlagWithRetry(flagInput.trim())

      if (result.success) {
        setHasSolved(true)

        const updatedChallenge = {
          ...challenge,
          solvedCount: challenge.solvedCount + 1,
          solvedBy: Array.isArray(challenge.solvedBy) ? [...challenge.solvedBy, user.uid] : [user.uid],
        }
        setChallenge(updatedChallenge)

        const isFirstBlood = solvers.length === 0

        toast({
          title: isFirstBlood ? "🩸 First Blood! 🩸" : "정답입니다! 🎉",
          description: isFirstBlood
            ? `축하합니다! 첫 번째 해결자가 되었습니다! ${result.points}점을 획득했습니다!`
            : `축하합니다! ${result.points}점을 획득했습니다!`,
          variant: "default",
        })

        setFlagInput("")

        if (userProfile && typeof updateUserProfile === "function") {
          try {
            const updatedProfile = {
              ...userProfile,
              points: (userProfile.points || 0) + result.points,
              wargamePoints: (userProfile.wargamePoints || 0) + result.points,
            }
            updateUserProfile(updatedProfile)
          } catch (profileError) {
            console.error("프로필 업데이트 오류:", profileError)
          }
        }
      }
    } catch (error: any) {
      console.error("플래그 제출 중 오류:", error)

      if (error.message === "오답입니다") {
        toast({
          title: "오답입니다",
          description: "제출한 플래그가 정확하지 않습니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      } else if (error.message === "이미 해결한 문제입니다") {
        setHasSolved(true)
        toast({
          title: "이미 해결한 문제입니다",
          description: "이 문제는 이미 해결하셨습니다.",
          variant: "default",
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

  // 풀이 작성 제출
  const handleSubmitWriteUp = async () => {
    if (!user || !challenge) return

    if (!hasSolved) {
      toast({
        title: "문제를 먼저 해결해주세요",
        description: "문제를 해결한 후에 풀이를 작성할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    if (!writeUpTitle.trim() || !writeUpContent.trim()) {
      toast({
        title: "제목과 내용을 입력해주세요",
        description: "풀이 제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingWriteUp(true)

    try {
      const writeUpRef = collection(db, "wargame_writeups")
      await addDoc(writeUpRef, {
        userId: user.uid,
        username: userProfile?.username || user.displayName || "사용자",
        photoURL: user.photoURL,
        challengeId: challenge.id,
        title: writeUpTitle.trim(),
        content: writeUpContent.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: [],
        dislikes: [],
        bookmarks: [],
        isFirstBlood: firstBloodSolver?.uid === user.uid,
        comments: [],
      })

      toast({
        title: "풀이가 작성되었습니다",
        description: "풀이가 성공적으로 작성되었습니다.",
        variant: "default",
      })

      setWriteUpTitle("")
      setWriteUpContent("")
      setIsWritingUp(false)
    } catch (error) {
      console.error("Error submitting writeup:", error)
      toast({
        title: "풀이 작성 실패",
        description: "풀이 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingWriteUp(false)
    }
  }

  // 난이도 투표
  const handleDifficultyVote = async (vote: number) => {
    if (!user || !challenge) return

    if (!hasSolved) {
      toast({
        title: "문제를 먼저 해결해주세요",
        description: "문제를 해결한 후에 난이도를 평가할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    try {
      const voteRef = doc(db, "wargame_difficulty_votes", `${challenge.id}_${user.uid}`)
      await setDoc(voteRef, {
        challengeId: challenge.id,
        userId: user.uid,
        vote: vote,
        createdAt: serverTimestamp(),
      })

      setUserDifficultyVote(vote)

      toast({
        title: "난이도 투표 완료",
        description: `난이도 ${vote}점으로 투표했습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error voting difficulty:", error)
      toast({
        title: "투표 실패",
        description: "난이도 투표 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 풀이 좋아요/싫어요
  const handleWriteUpReaction = async (writeUpId: string, type: "like" | "dislike") => {
    if (!user) return

    try {
      const writeUpRef = doc(db, "wargame_writeups", writeUpId)
      const writeUp = writeUps.find((w) => w.id === writeUpId)
      if (!writeUp) return

      const isLiked = writeUp.likes.includes(user.uid)
      const isDisliked = writeUp.dislikes.includes(user.uid)

      if (type === "like") {
        if (isLiked) {
          await updateDoc(writeUpRef, {
            likes: arrayRemove(user.uid),
          })
        } else {
          await updateDoc(writeUpRef, {
            likes: arrayUnion(user.uid),
            ...(isDisliked && { dislikes: arrayRemove(user.uid) }),
          })
        }
      } else {
        if (isDisliked) {
          await updateDoc(writeUpRef, {
            dislikes: arrayRemove(user.uid),
          })
        } else {
          await updateDoc(writeUpRef, {
            dislikes: arrayUnion(user.uid),
            ...(isLiked && { likes: arrayRemove(user.uid) }),
          })
        }
      }
    } catch (error) {
      console.error("Error updating reaction:", error)
    }
  }

  // 풀이 북마크
  const handleWriteUpBookmark = async (writeUpId: string) => {
    if (!user) return

    try {
      const writeUpRef = doc(db, "wargame_writeups", writeUpId)
      const writeUp = writeUps.find((w) => w.id === writeUpId)
      if (!writeUp) return

      const isBookmarked = writeUp.bookmarks.includes(user.uid)

      if (isBookmarked) {
        await updateDoc(writeUpRef, {
          bookmarks: arrayRemove(user.uid),
        })
      } else {
        await updateDoc(writeUpRef, {
          bookmarks: arrayUnion(user.uid),
        })
      }
    } catch (error) {
      console.error("Error updating bookmark:", error)
    }
  }

  // 댓글 작성
  const handleSubmitComment = async (writeUpId: string) => {
    if (!user) return

    const content = commentInputs[writeUpId]?.trim()
    if (!content) return

    setIsSubmittingComment({ ...isSubmittingComment, [writeUpId]: true })

    try {
      const writeUpRef = doc(db, "wargame_writeups", writeUpId)
      const newComment = {
        id: Date.now().toString(),
        userId: user.uid,
        username: userProfile?.username || user.displayName || "사용자",
        photoURL: user.photoURL,
        content: content,
        createdAt: Timestamp.now(),
        likes: [],
      }

      await updateDoc(writeUpRef, {
        comments: arrayUnion(newComment),
      })

      setCommentInputs({ ...commentInputs, [writeUpId]: "" })
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setIsSubmittingComment({ ...isSubmittingComment, [writeUpId]: false })
    }
  }

  // 헬퍼 함수들
  const getCategoryConfig = (category: string) => {
    return categoryConfig[category] || categoryConfig["기타"]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ko })
  }

  // First Blood 해결 시간 계산
  const getFirstBloodTime = () => {
    if (!firstBloodSolver || !challengeCreatedAt) return null

    const challengeTime = challengeCreatedAt.toDate()
    const solveTime = firstBloodSolver.solvedAt.toDate()
    const diff = solveTime.getTime() - challengeTime.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return `${days}일 ${hours % 24}시간 만에 풀이 완료!`
    } else if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 만에 풀이 완료!`
    } else {
      return `${minutes}분 만에 풀이 완료!`
    }
  }

  const getRankIcon = (rank: number, isFirstBlood: boolean) => {
    if (isFirstBlood) {
      return <Crown className="h-4 w-4 text-red-500" />
    } else if (rank === 2) {
      return <Medal className="h-4 w-4 text-gray-400" />
    } else if (rank === 3) {
      return <Award className="h-4 w-4 text-amber-600" />
    }
    return null
  }

  const getAverageDifficulty = () => {
    if (difficultyVotes.length === 0) return challenge?.level || 5
    return Math.round((difficultyVotes.reduce((sum, vote) => sum + vote.vote, 0) / difficultyVotes.length) * 10) / 10
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 고급 배경 효과 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-purple-900/10" />

        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
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
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
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

      <Navbar />

      <main className="py-8 relative">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Button
              variant="ghost"
              onClick={() => router.push("/wargame")}
              className="mb-6 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              워게임 목록으로
            </Button>
          </motion.div>

          {/* 로그인 유도 메시지 */}
          <AnimatePresence>
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5 }}
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
          </AnimatePresence>

          {isLoading ? (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <Skeleton className="h-12 w-3/4 bg-gray-800/50" />
                <Skeleton className="h-6 w-1/2 bg-gray-800/50" />
                <Skeleton className="h-64 w-full bg-gray-800/50" />
              </motion.div>
            </div>
          ) : challenge ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="grid gap-8 lg:grid-cols-4"
            >
              <div className="lg:col-span-3 space-y-8">
                {/* 문제 정보 카드 */}
                <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-2 px-3 py-1 ${getDifficultyConfig(challenge.level).colors} border transition-all duration-300`}
                          >
                            <span className="font-bold">LEVEL {challenge.level}</span>
                          </Badge>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-2 px-3 py-1 ${getCategoryConfig(challenge.category).colors} ${getCategoryConfig(challenge.category).bgColor} border transition-all duration-300`}
                          >
                            {getCategoryConfig(challenge.category).icon}
                            <span className="font-medium">{challenge.category}</span>
                          </Badge>
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>{challenge.solvedCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {challenge.createdAt ? formatDate(challenge.createdAt.toDate()) : "날짜 정보 없음"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
                        {challenge.title}
                      </CardTitle>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <CardDescription className="text-gray-400">
                        {challenge.description.length > 100
                          ? `${challenge.description.substring(0, 100)}...`
                          : challenge.description}
                      </CardDescription>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="prose dark:prose-invert max-w-none notion-content"
                    >
                      <div
                        className="prose prose-invert max-w-none
                        prose-headings:text-white prose-headings:font-bold
                        prose-p:text-gray-100 prose-p:leading-relaxed
                        prose-strong:text-white prose-strong:font-bold prose-strong:bg-gradient-to-r prose-strong:from-blue-400 prose-strong:to-purple-400 prose-strong:bg-clip-text prose-strong:text-transparent
                        prose-em:text-yellow-300 prose-em:italic
                        prose-code:text-green-400 prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded
                        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700
                        prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-300
                        prose-ul:text-gray-100 prose-ol:text-gray-100
                        prose-li:text-gray-100 prose-li:marker:text-blue-400
                        prose-a:text-blue-400 prose-a:hover:text-blue-300
                        prose-table:text-gray-100
                        prose-th:text-white prose-th:bg-gray-800
                        prose-td:border-gray-700
                        [&_*]:text-base [&_strong]:!text-white [&_b]:!text-white
                        [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_h5]:!text-white [&_h6]:!text-white"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(challenge.description) }}
                      />
                    </motion.div>

                    {/* 첨부 파일 */}
                    {challenge.files && challenge.files.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="space-y-3"
                      >
                        <div className="space-y-2">
                          {challenge.files.map((file, index) => {
                            const fileName = typeof file === "string" ? file.split("/").pop() || "file" : file.name
                            const fileUrl = typeof file === "string" ? file : file.url
                            const isWebFile = fileName
                              .toLowerCase()
                              .match(/\.(html|htm|css|js|jsx|ts|tsx|json|xml|svg|php)$/)

                            return (
                              <motion.a
                                key={index}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.02, x: 5 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 text-gray-300 transition-all duration-300 hover:bg-gray-700/30 hover:border-gray-600 hover:text-white group"
                              >
                                {isWebFile ? (
                                  <Code className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                                ) : (
                                  <Download className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                                )}
                                <span className="flex-1 truncate font-medium">
                                  {isWebFile ? `${fileName} 코드 보기` : `${fileName} 다운로드`}
                                </span>
                                <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-400 transition-colors duration-300" />
                              </motion.a>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* 추가 리소스 섹션 - 배열 체크 추가 */}
                    {challenge.additionalResources &&
                      Array.isArray(challenge.additionalResources) &&
                      challenge.additionalResources.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.5 }}
                          className="space-y-3"
                        >
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ExternalLink className="h-5 w-5 text-purple-400" />
                            추가 리소스
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {challenge.additionalResources.map((resource, index) => (
                              <motion.a
                                key={index}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.02, y: -2 }}
                                transition={{ duration: 0.2 }}
                                className={`flex items-center gap-3 rounded-lg border p-4 transition-all duration-300 group ${
                                  resource.type === "code"
                                    ? "border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 hover:border-cyan-400"
                                    : "border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-400"
                                }`}
                              >
                                {resource.type === "code" ? (
                                  <Code className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                                ) : (
                                  <ExternalLink className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
                                )}
                                <div className="flex-1">
                                  <span className="font-medium text-white group-hover:text-gray-100 transition-colors duration-300">
                                    {resource.title}
                                  </span>
                                  <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300 truncate">
                                    {resource.type === "code" ? "코드 보기" : "링크 열기"}
                                  </p>
                                </div>
                                <div className="text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
                                  <ExternalLink className="h-4 w-4" />
                                </div>
                              </motion.a>
                            ))}
                          </div>
                        </motion.div>
                      )}

                    {/* 서버 정보 */}
                    {challenge.port && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="space-y-3"
                      >
                        <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                          <div className="flex items-center gap-3">
                            <Server className="h-5 w-5 text-purple-400" />
                            <span className="font-mono text-cyan-400 font-medium">
                              {challenge.category === "웹 해킹"
                                ? `nicetop-pwn-server.dyhs.kr:${challenge.port}`
                                : `nc nicetop-pwn-server.dyhs.kr ${challenge.port}`}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>

                {/* 플래그 제출 카드 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-cyan-400" />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          Flag 입력
                        </span>
                        {user && (
                          <div className="ml-auto flex items-center gap-2">
                            {isOnline ? (
                              <motion.div
                                className="flex items-center gap-1 text-emerald-400"
                                animate={{ opacity: [1, 0.7, 1] }}
                                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                              >
                                <Wifi className="h-4 w-4" />
                                <span className="text-xs font-medium">온라인</span>
                              </motion.div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-400">
                                <WifiOff className="h-4 w-4" />
                                <span className="text-xs font-medium">오프라인</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        플래그를 찾았다면 정답을 입력해주세요
                        {pendingSubmission && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 flex items-center gap-2 text-amber-400"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">제출 대기 중... 온라인 복구 시 자동 처리됩니다.</span>
                          </motion.div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!user ? (
                        <Alert className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/30 backdrop-blur-sm">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-blue-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <span>문제를 풀려면 먼저 로그인해주세요. 지금 가입하고 보안 전문가가 되어보세요! 🚀</span>
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
                        </Alert>
                      ) : hasSolved ? (
                        <Alert className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription className="flex items-center gap-2">
                            <span>축하합니다! 이 문제를 성공적으로 해결했습니다.</span>
                            <Star className="h-4 w-4 text-yellow-400" />
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <form onSubmit={handleSubmitFlag}>
                          <div className="flex gap-3">
                            <Input
                              placeholder="플래그를 찾았다면 정답을 입력해주세요"
                              value={flagInput}
                              onChange={(e) => setFlagInput(e.target.value)}
                              disabled={isSubmitting || isRetrying || !isOnline}
                              className="bg-gray-800/50 border-gray-600 focus:border-cyan-500 text-white placeholder-gray-500 transition-all duration-300 focus:shadow-lg focus:shadow-cyan-500/25"
                            />
                            <Button
                              type="submit"
                              disabled={isSubmitting || isRetrying || !isOnline}
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50"
                            >
                              {isSubmitting || isRetrying ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  {isRetrying ? "재시도 중..." : "제출 중..."}
                                </>
                              ) : !isOnline ? (
                                <>
                                  <WifiOff className="mr-2 h-4 w-4" />
                                  오프라인
                                </>
                              ) : (
                                "제출하기"
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* 풀이 섹션 */}
                {hasSolved && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                  >
                    <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-400" />
                            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                              풀이 {writeUps.length}
                            </span>
                          </CardTitle>
                          {!isWritingUp && (
                            <Button
                              onClick={() => setIsWritingUp(true)}
                              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              풀이 작성
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* 풀이 작성 폼 */}
                        <AnimatePresence>
                          {isWritingUp && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-6 space-y-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50"
                            >
                              <Input
                                placeholder="풀이 제목을 입력하세요"
                                value={writeUpTitle}
                                onChange={(e) => setWriteUpTitle(e.target.value)}
                                className="bg-gray-700/50 border-gray-600 focus:border-purple-500 text-white"
                              />
                              <Textarea
                                placeholder="풀이 내용을 작성하세요..."
                                value={writeUpContent}
                                onChange={(e) => setWriteUpContent(e.target.value)}
                                rows={8}
                                className="bg-gray-700/50 border-gray-600 focus:border-purple-500 text-white resize-none"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleSubmitWriteUp}
                                  disabled={isSubmittingWriteUp}
                                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                                >
                                  {isSubmittingWriteUp ? (
                                    <>
                                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                      작성 중...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-2 h-4 w-4" />
                                      풀이 등록
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsWritingUp(false)
                                    setWriteUpTitle("")
                                    setWriteUpContent("")
                                  }}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  취소
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* 풀이 목록 */}
                        <div className="space-y-6">
                          {writeUps.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                              <p className="text-lg font-medium mb-2">아직 작성된 풀이가 없습니다</p>
                              <p className="text-sm">첫 번째 풀이를 작성해보세요!</p>
                            </div>
                          ) : (
                            writeUps.map((writeUp, index) => (
                              <motion.div
                                key={writeUp.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.3 }}
                                className="border border-gray-700/50 rounded-lg bg-gray-800/20 p-6"
                              >
                                <div className="flex items-start gap-4">
                                  <UserProfileHover userId={writeUp.userId} username={writeUp.username}>
                                    <Avatar className="h-10 w-10 border-2 border-gray-600 cursor-pointer">
                                      <AvatarImage
                                        src={writeUp.photoURL || "/placeholder.svg"}
                                        alt={writeUp.username}
                                      />
                                      <AvatarFallback className="bg-gray-700 text-white">
                                        {writeUp.username?.charAt(0)?.toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  </UserProfileHover>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <UserProfileHover userId={writeUp.userId} username={writeUp.username}>
                                        <span className="font-semibold text-white cursor-pointer hover:text-cyan-400 transition-colors">
                                          {writeUp.username}
                                        </span>
                                      </UserProfileHover>
                                      {writeUp.isFirstBlood && (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                          <Flame className="h-3 w-3 mr-1" />
                                          First Blood!
                                        </Badge>
                                      )}
                                      <span className="text-sm text-gray-400">
                                        {formatRelativeTime(writeUp.createdAt.toDate())}
                                      </span>
                                    </div>
                                    <h4 className="text-lg font-semibold text-white mb-3">{writeUp.title}</h4>
                                    <div className="prose dark:prose-invert max-w-none text-gray-300 mb-4">
                                      <div className="whitespace-pre-wrap">{writeUp.content}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWriteUpReaction(writeUp.id, "like")}
                                        className={`text-gray-400 hover:text-green-400 ${
                                          user && writeUp.likes.includes(user.uid) ? "text-green-400" : ""
                                        }`}
                                      >
                                        <ThumbsUp className="h-4 w-4 mr-1" />
                                        {writeUp.likes.length}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWriteUpReaction(writeUp.id, "dislike")}
                                        className={`text-gray-400 hover:text-red-400 ${
                                          user && writeUp.dislikes.includes(user.uid) ? "text-red-400" : ""
                                        }`}
                                      >
                                        <ThumbsDown className="h-4 w-4 mr-1" />
                                        {writeUp.dislikes.length}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWriteUpBookmark(writeUp.id)}
                                        className={`text-gray-400 hover:text-yellow-400 ${
                                          user && writeUp.bookmarks.includes(user.uid) ? "text-yellow-400" : ""
                                        }`}
                                      >
                                        <Bookmark className="h-4 w-4 mr-1" />
                                        북마크
                                      </Button>
                                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-blue-400">
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        {writeUp.comments.length}
                                      </Button>
                                    </div>

                                    {/* 댓글 섹션 */}
                                    {writeUp.comments.length > 0 && (
                                      <div className="mt-4 space-y-3 border-t border-gray-700/50 pt-4">
                                        {writeUp.comments.map((comment) => (
                                          <div key={comment.id} className="flex items-start gap-3">
                                            <UserProfileHover userId={comment.userId} username={comment.username}>
                                              <Avatar className="h-6 w-6 cursor-pointer">
                                                <AvatarImage
                                                  src={comment.photoURL || "/placeholder.svg"}
                                                  alt={comment.username}
                                                />
                                                <AvatarFallback className="bg-gray-700 text-white text-xs">
                                                  {comment.username?.charAt(0)?.toUpperCase() || "U"}
                                                </AvatarFallback>
                                              </Avatar>
                                            </UserProfileHover>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <UserProfileHover userId={comment.userId} username={comment.username}>
                                                  <span className="text-sm font-medium text-white cursor-pointer hover:text-cyan-400 transition-colors">
                                                    {comment.username}
                                                  </span>
                                                </UserProfileHover>
                                                <span className="text-xs text-gray-500">
                                                  {formatRelativeTime(comment.createdAt.toDate())}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-300">{comment.content}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* 댓글 작성 */}
                                    {user && (
                                      <div className="mt-4 flex gap-2">
                                        <Input
                                          placeholder="댓글을 작성하세요..."
                                          value={commentInputs[writeUp.id] || ""}
                                          onChange={(e) =>
                                            setCommentInputs({ ...commentInputs, [writeUp.id]: e.target.value })
                                          }
                                          className="bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white text-sm"
                                          onKeyPress={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault()
                                              handleSubmitComment(writeUp.id)
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSubmitComment(writeUp.id)}
                                          disabled={isSubmittingComment[writeUp.id]}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          {isSubmittingComment[writeUp.id] ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Send className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* 사이드바 */}
              <div className="space-y-6">
                {/* 출제자 정보 카드 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                >
                  <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-cyan-400" />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          출제자 정보
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-cyan-500/30">
                          <AvatarImage src={`/avatars/${challenge.authorId}.png`} alt={challenge.author} />
                          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold">
                            {challenge.author?.charAt(0)?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-white">{challenge.author || "관리자"}</p>
                          <p className="text-sm text-gray-400">대표 업적 없음</p>
                          <p className="text-xs text-cyan-400">Knowledge Hunter.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* First Blood 카드 */}
                {firstBloodSolver && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-red-900/30 via-red-800/20 to-orange-900/30 border-red-500/40 backdrop-blur-md shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5" />
                      <CardHeader className="relative">
                        <CardTitle className="flex items-center gap-2">
                          <motion.div
                            animate={{
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            }}
                          >
                            <Flame className="h-5 w-5 text-red-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent font-bold">
                            🩸 First Blood!
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="flex items-center gap-3 mb-3">
                          <UserProfileHover userId={firstBloodSolver.uid} username={firstBloodSolver.username}>
                            <Avatar className="h-12 w-12 border-2 border-red-500/50 cursor-pointer ring-2 ring-red-500/20">
                              <AvatarImage
                                src={firstBloodSolver.photoURL || "/placeholder.svg"}
                                alt={firstBloodSolver.username}
                              />
                              <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold">
                                {firstBloodSolver.username?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          </UserProfileHover>
                          <div className="flex-1">
                            <UserProfileHover userId={firstBloodSolver.uid} username={firstBloodSolver.username}>
                              <p className="font-bold text-red-400 cursor-pointer hover:text-red-300 transition-colors text-lg">
                                {firstBloodSolver.username}
                              </p>
                            </UserProfileHover>
                            <p className="text-sm text-orange-400 font-medium">첫 번째 해결자</p>
                          </div>
                        </div>

                        {/* 해결 시간 정보 */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-red-300">
                            <Timer className="h-4 w-4" />
                            <span className="text-sm font-medium">{getFirstBloodTime() || "해결 시간 정보 없음"}</span>
                          </div>
                        </div>

                        <div className="text-xs text-red-500/80">
                          {formatRelativeTime(firstBloodSolver.solvedAt.toDate())}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 최근 풀이자 카드 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1, duration: 0.5 }}
                >
                  <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-400" />
                        <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                          최근 풀이자 {solvers.length > 0 ? solvers.length : ""}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {solvers.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                          <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm">아직 해결자가 없습니다</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-64">
                          <div className="space-y-3 pr-4">
                            {solvers.map((solver, index) => (
                              <motion.div
                                key={solver.uid}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors"
                              >
                                <div className="flex items-center gap-1">
                                  {solver.isFirstBlood && (
                                    <motion.div
                                      animate={{
                                        scale: [1, 1.2, 1],
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Number.POSITIVE_INFINITY,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <Flame className="h-4 w-4 text-red-500" />
                                    </motion.div>
                                  )}
                                  <UserProfileHover userId={solver.uid} username={solver.username}>
                                    <Avatar className="h-8 w-8 border border-gray-600 cursor-pointer">
                                      <AvatarImage src={solver.photoURL || "/placeholder.svg"} alt={solver.username} />
                                      <AvatarFallback className="bg-gray-700 text-white text-xs">
                                        {solver.username?.charAt(0)?.toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  </UserProfileHover>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <UserProfileHover userId={solver.uid} username={solver.username}>
                                      <span
                                        className={`text-sm font-medium cursor-pointer transition-colors ${
                                          solver.isFirstBlood
                                            ? "text-red-400 hover:text-red-300"
                                            : "text-white hover:text-cyan-400"
                                        }`}
                                      >
                                        {solver.username}
                                      </span>
                                    </UserProfileHover>
                                    {solver.isFirstBlood && (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1 py-0">
                                        First Blood!
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {formatRelativeTime(solver.solvedAt.toDate())}
                                  </p>
                                </div>
                                <div className="text-xs text-gray-500">#{solver.rank}</div>
                              </motion.div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* 난이도 투표 카드 */}
                {user && hasSolved && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-orange-400" />
                          <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                            난이도 투표
                          </span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          이 문제의 난이도를 평가해주세요 (현재: {getAverageDifficulty().toFixed(1)}/10)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                            <Button
                              key={level}
                              variant={userDifficultyVote === level ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleDifficultyVote(level)}
                              className={`${
                                userDifficultyVote === level
                                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
                              }`}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                        {difficultyVotes.length > 0 && (
                          <div className="mt-3 text-xs text-gray-400">{difficultyVotes.length}명이 투표했습니다</div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 문제 통계 카드 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3, duration: 0.5 }}
                >
                  <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                          문제 통계
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            해결한 사용자
                          </span>
                          <span className="font-bold text-cyan-400 text-lg">{challenge.solvedCount}명</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                          <span className="text-gray-400">카테고리</span>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 ${getCategoryConfig(challenge.category).colors} ${getCategoryConfig(challenge.category).bgColor} border`}
                          >
                            {getCategoryConfig(challenge.category).icon}
                            <span>{challenge.category}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                          <span className="text-gray-400">난이도</span>
                          <Badge
                            variant="secondary"
                            className={`${getDifficultyConfig(challenge.level).colors} border font-semibold`}
                          >
                            {getDifficultyConfig(challenge.level).name}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            점수
                          </span>
                          <span className="font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-lg">
                            {calculatePointsByLevel(challenge.level)} 점
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-16 text-center"
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
                <AlertCircle className="h-16 w-16 text-gray-600 mb-6" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">문제를 찾을 수 없습니다</h3>
              <p className="text-gray-400 mb-6">요청하신 문제가 존재하지 않습니다.</p>
              <Button
                variant="outline"
                onClick={() => router.push("/wargame")}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                워게임 목록으로
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

      <script
        dangerouslySetInnerHTML={{
          __html: generateCopyScript(),
        }}
      />
    </div>
  )
}
