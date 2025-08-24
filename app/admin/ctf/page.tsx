"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trophy, Users, Clock, CheckCircle, AlertCircle, Settings, FileText, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  collection,
  getDocs,
  query,
  orderBy,
  type Timestamp,
  doc,
  where,
  writeBatch,
  increment,
  getDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// CTF 대회 타입 정의
type CTFContest = {
  id: string
  title: string
  description: string
  startTime: Timestamp
  endTime: Timestamp
  problemCount: number
  participants: string[]
  author: string
  authorId: string
  createdAt: Timestamp
  status: "upcoming" | "active" | "ended"
  isFinalized?: boolean
  tags?: string[]
}

export default function AdminCTFPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [contests, setContests] = useState<CTFContest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contestToDelete, setContestToDelete] = useState<CTFContest | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<string>("")

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // CTF 대회 목록 불러오기
  useEffect(() => {
    const fetchContests = async () => {
      try {
        if (!user) {
          router.push("/login")
          return
        }

        if (!isAdmin) {
          router.push("/ctf")
          return
        }

        const contestsRef = collection(db, "ctf_contests")
        const q = query(contestsRef, orderBy("startTime", "desc"))
        const querySnapshot = await getDocs(q)

        const contestsData: CTFContest[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const now = new Date()
          const startTime = data.startTime?.toDate() || new Date()
          const endTime = data.endTime?.toDate() || new Date()

          let status: "upcoming" | "active" | "ended" = "upcoming"
          if (now < startTime) {
            status = "upcoming"
          } else if (now >= startTime && now <= endTime) {
            status = "active"
          } else {
            status = "ended"
          }

          contestsData.push({
            id: doc.id,
            ...data,
            status,
          } as CTFContest)
        })

        setContests(contestsData)
      } catch (error) {
        console.error("Error fetching contests:", error)
        toast({
          title: "오류 발생",
          description: "대회 목록을 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchContests()
  }, [user, router, toast, isAdmin])

  const handleDeleteContest = async () => {
    if (!contestToDelete) return

    try {
      setIsDeleting(true)
      setDeleteProgress("삭제 준비 중...")

      // 1. 대회에 관련된 문제 찾기
      setDeleteProgress("관련 문제 찾는 중...")
      const problemsRef = collection(db, "ctf_problems")
      const problemsQuery = query(problemsRef, where("contestId", "==", contestToDelete.id))
      const problemsSnapshot = await getDocs(problemsQuery)

      const problemIds: string[] = []
      problemsSnapshot.forEach((doc) => {
        problemIds.push(doc.id)
      })

      // 2. 해결 로그 찾기
      setDeleteProgress("해결 기록 찾는 중...")
      const solveLogsRef = collection(db, "ctf_solve_logs")
      const solveLogsQuery = query(solveLogsRef, where("contestId", "==", contestToDelete.id))
      const solveLogsSnapshot = await getDocs(solveLogsQuery)

      // 사용자별 점수 감소량 계산
      const userPointsToDeduct: Record<string, number> = {}
      solveLogsSnapshot.forEach((doc) => {
        const data = doc.data()
        const userId = data.userId
        const points = data.points || 0

        if (!userPointsToDeduct[userId]) {
          userPointsToDeduct[userId] = 0
        }
        userPointsToDeduct[userId] += points
      })

      // 3. 참가자 정보 찾기
      setDeleteProgress("참가자 정보 찾는 중...")
      const participantsRef = collection(db, "ctf_participants")
      const participantsQuery = query(participantsRef, where("contestId", "==", contestToDelete.id))
      const participantsSnapshot = await getDocs(participantsQuery)

      // 4. 배치 작업으로 모든 데이터 삭제
      setDeleteProgress("데이터 삭제 중...")
      const batch = writeBatch(db)

      // 4.1. 문제 삭제
      problemsSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // 4.2. 해결 로그 삭제
      solveLogsSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // 4.3. 참가자 정보 삭제
      participantsSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // 4.4. 사용자 점수 업데이트
      setDeleteProgress("사용자 점수 업데이트 중...")
      for (const [userId, pointsToDeduct] of Object.entries(userPointsToDeduct)) {
        if (pointsToDeduct > 0) {
          const userRef = doc(db, "users", userId)

          // 사용자 문서 가져오기
          const userDoc = await getDoc(userRef)
          if (userDoc.exists()) {
            // 총 점수와 CTF 점수 감소
            batch.update(userRef, {
              points: increment(-pointsToDeduct),
              ctfPoints: increment(-pointsToDeduct),
            })

            // solvedChallenges 배열에서 해당 문제 ID 제거
            const userData = userDoc.data()
            const solvedChallenges = userData.solvedChallenges || []
            const updatedSolvedChallenges = solvedChallenges.filter((id: string) => !problemIds.includes(id))

            if (updatedSolvedChallenges.length !== solvedChallenges.length) {
              batch.update(userRef, { solvedChallenges: updatedSolvedChallenges })
            }
          }
        }
      }

      // 4.5. 대회 자체 삭제
      batch.delete(doc(db, "ctf_contests", contestToDelete.id))

      // 배치 커밋
      setDeleteProgress("변경사항 저장 중...")
      await batch.commit()

      // UI에서 삭제된 대회 제거
      setContests(contests.filter((contest) => contest.id !== contestToDelete.id))

      toast({
        title: "대회 삭제 완료",
        description: "CTF 대회와 관련된 모든 데이터가 성공적으로 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error deleting contest:", error)
      toast({
        title: "오류 발생",
        description: "대회를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setContestToDelete(null)
      setDeleteProgress("")
    }
  }

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

  const deleteDialog = (
    <Dialog open={!!contestToDelete} onOpenChange={(open) => !open && setContestToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CTF 대회 삭제</DialogTitle>
          <DialogDescription>
            정말로 <span className="font-bold">{contestToDelete?.title}</span> 대회를 삭제하시겠습니까? 이 작업은 되돌릴
            수 없으며, 다음 데이터가 모두 삭제됩니다:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>대회 정보 및 설정</li>
              <li>모든 문제 및 파일</li>
              <li>참가자 정보 및 제출 기록</li>
              <li>사용자들의 해결 기록 및 획득 점수</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        {isDeleting && deleteProgress && (
          <div className="py-2">
            <p className="text-sm text-muted-foreground animate-pulse">{deleteProgress}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setContestToDelete(null)} disabled={isDeleting}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDeleteContest} disabled={isDeleting}>
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold">접근 권한이 없습니다</h3>
              <p className="text-muted-foreground mt-2">관리자만 접근할 수 있는 페이지입니다.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/ctf")}>
                CTF 페이지로 돌아가기
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {deleteDialog}
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">CTF 대회 관리</h1>
              <p className="text-muted-foreground">CTF 대회를 생성하고 관리합니다.</p>
            </div>
            <Link href="/admin/ctf/create">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />새 대회 생성
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold">대회가 없습니다</h3>
              <p className="text-muted-foreground mt-2">아직 등록된 CTF 대회가 없습니다.</p>
              <Link href="/admin/ctf/create" className="mt-4">
                <Button>새 대회 생성</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contests.map((contest) => (
                <Card key={contest.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          contest.status === "active"
                            ? "default"
                            : contest.status === "upcoming"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          contest.status === "active"
                            ? "bg-green-500 text-white"
                            : contest.status === "upcoming"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {contest.status === "active" ? "진행 중" : contest.status === "upcoming" ? "예정됨" : "종료됨"}
                      </Badge>
                      {contest.isFinalized && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          종료 처리 완료
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-1">{contest.title}</CardTitle>
                    <CardDescription>
                      {formatDate(contest.startTime.toDate())} ~ {formatDate(contest.endTime.toDate())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span>{contest.problemCount || 0}문제</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4" />
                          <span>{contest.participants?.length || 0}명 참가</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(contest.createdAt.toDate())}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/ctf/edit/${contest.id}`}>
                          <Button variant="outline" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            수정
                          </Button>
                        </Link>
                        <Link href={`/admin/ctf/problems/${contest.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="mr-2 h-4 w-4" />
                            문제 관리
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:border-red-800 dark:hover:border-red-700"
                          onClick={(e) => {
                            e.preventDefault()
                            setContestToDelete(contest)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </Button>
                        {contest.status === "ended" && (
                          <Link href={`/admin/ctf/finalize/${contest.id}`}>
                            <Button
                              variant={contest.isFinalized ? "outline" : "default"}
                              size="sm"
                              className={
                                contest.isFinalized ? "bg-green-500/10 text-green-500 border-green-500/20" : ""
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {contest.isFinalized ? "종료 처리 완료" : "종료 처리"}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
