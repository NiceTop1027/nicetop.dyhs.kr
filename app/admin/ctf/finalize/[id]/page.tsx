"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Trophy, Users, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  writeBatch,
  increment,
  addDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateCtfExp, calculateLevelFromExp } from "@/lib/level-system"
import { sendCTFResultsNotification, sendNotificationToUser } from "@/lib/notification-utils"

export default function FinalizeCTFPage({ params }: { params: { id: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [contest, setContest] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)

  // 관리자 권한 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    const fetchContestData = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      if (!isAdmin) {
        toast({
          title: "접근 권한 없음",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      try {
        // 대회 정보 가져오기
        const contestRef = doc(db, "ctf_contests", params.id)
        const contestSnap = await getDoc(contestRef)

        if (!contestSnap.exists()) {
          toast({
            title: "대회를 찾을 수 없습니다",
            description: "요청하신 CTF 대회가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/admin/ctf")
          return
        }

        const contestData = { id: contestSnap.id, ...contestSnap.data() }
        setContest(contestData)

        // 이미 종료 처리된 대회인지 확인
        if (contestData.isFinalized) {
          setIsFinalized(true)
        }

        // 참가자 정보 가져오기
        const participantsRef = collection(db, "ctf_participants")
        const participantsQuery = query(
          participantsRef,
          where("contestId", "==", params.id),
          orderBy("score", "desc"),
          orderBy("lastSolveTime", "asc"),
        )

        const participantsSnap = await getDocs(participantsQuery)
        const participantsData: any[] = []

        participantsSnap.forEach((doc, index) => {
          participantsData.push({
            ...doc.data(),
            id: doc.id,
            rank: index + 1,
          })
        })

        setParticipants(participantsData)
      } catch (error) {
        console.error("Error fetching contest data:", error)
        toast({
          title: "데이터 로딩 오류",
          description: "대회 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchContestData()
  }, [user, router, toast, params.id, isAdmin])

  const handleFinalizeContest = async () => {
    if (!contest || !participants.length) return

    setIsFinalizing(true)

    try {
      // 대회 종료 처리
      const contestRef = doc(db, "ctf_contests", contest.id)

      // 이미 종료 처리된 대회인지 다시 확인
      const contestSnap = await getDoc(contestRef)
      if (contestSnap.exists() && contestSnap.data().isFinalized) {
        toast({
          title: "이미 종료 처리된 대회",
          description: "이 대회는 이미 종료 처리되었습니다.",
          variant: "destructive",
        })
        setIsFinalized(true)
        setIsFinalizing(false)
        return
      }

      // 배치 작업 시작
      const batch = writeBatch(db)

      // 대회 상태 업데이트
      batch.update(contestRef, {
        status: "ended",
        isFinalized: true,
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.uid,
      })

      // 참가자별 점수 및 경험치 부여
      const totalParticipants = participants.length

      for (const participant of participants) {
        // 사용자 문서 참조
        const userRef = doc(db, "users", participant.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()

          // CTF 점수 부여
          batch.update(userRef, {
            points: increment(participant.score),
            ctfPoints: increment(participant.score),
          })

          // 경험치 계산 및 부여
          const expAmount = calculateCtfExp(participant.rank, totalParticipants, participant.score)
          const currentExp = userData.exp || 0
          const newTotalExp = currentExp + expAmount

          // 레벨 계산
          const newLevelInfo = calculateLevelFromExp(newTotalExp)

          // 경험치 및 레벨 업데이트
          batch.update(userRef, {
            exp: newTotalExp,
            level: newLevelInfo.level,
          })

          // 대회 결과 로그 추가 (배치에 포함하지 않음)
          try {
            await addDoc(collection(db, "ctf_results"), {
              userId: participant.uid,
              username: participant.username,
              contestId: contest.id,
              contestTitle: contest.title,
              rank: participant.rank,
              score: participant.score,
              totalParticipants: totalParticipants,
              timestamp: serverTimestamp(),
              expGained: expAmount,
            })
          } catch (logError) {
            console.error("Error adding result log:", logError)
            // 로그 추가 실패해도 계속 진행
          }

          // 경험치 획득 로그 추가 (배치에 포함하지 않음)
          try {
            await addDoc(collection(db, "exp_events"), {
              userId: participant.uid,
              username: participant.username,
              amount: expAmount,
              reason: `CTF 대회 참가: ${contest.title} (${participant.rank}위/${totalParticipants}명)`,
              timestamp: serverTimestamp(),
              category: "ctf",
              contestId: contest.id,
              contestTitle: contest.title,
              rank: participant.rank,
            })
          } catch (logError) {
            console.error("Error adding exp event log:", logError)
            // 로그 추가 실패해도 계속 진행
          }
        }
      }

      // 배치 커밋
      await batch.commit()

      // 상위 3명 또는 전체 참가자 (3명 미만인 경우) 정보 추출
      const topRankers = participants.slice(0, Math.min(3, participants.length)).map((p) => ({
        rank: p.rank,
        username: p.username,
        score: p.score,
      }))

      // 대회 결과 알림 전송
      try {
        await sendCTFResultsNotification(contest.id, contest.title, topRankers)
        console.log("CTF 결과 알림 전송 완료")
      } catch (notificationError) {
        console.error("결과 알림 전송 오류:", notificationError)
      }

      // 참가자들에게 개별 알림 보내기
      try {
        // 각 참가자에게 개별 알림 보내기
        participants.forEach((participant) => {
          sendNotificationToUser(
            participant.uid,
            "ctf",
            `CTF 대회 '${contest.title}' 종료`,
            `CTF 대회 '${contest.title}'가 종료되었습니다. 당신의 최종 순위는 ${participant.rank}위입니다.`,
            `/ctf/${contest.id}`,
          )
        })
      } catch (notificationError) {
        console.error("알림 전송 오류:", notificationError)
      }

      // 성공 메시지
      toast({
        title: "대회 종료 처리 완료",
        description: "CTF 대회가 성공적으로 종료 처리되었습니다.",
        variant: "default",
      })

      setIsFinalized(true)
    } catch (error) {
      console.error("Error finalizing contest:", error)
      toast({
        title: "종료 처리 오류",
        description: "대회 종료 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin/ctf")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              CTF 관리로 돌아가기
            </Button>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ) : contest ? (
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{contest.title} - 대회 종료 처리</h1>
                <p className="text-muted-foreground">
                  이 페이지에서 CTF 대회를 종료 처리하고 최종 점수를 참가자들에게 부여할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">대회를 찾을 수 없습니다</h3>
                <p className="text-muted-foreground mt-2">요청하신 CTF 대회가 존재하지 않습니다.</p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : contest ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>대회 정보</CardTitle>
                  <CardDescription>종료 처리할 대회의 정보입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">대회 제목</h3>
                        <p className="text-lg font-medium">{contest.title}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">상태</h3>
                        <div>
                          {isFinalized ? (
                            <Badge className="bg-green-500 text-white">종료됨</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                              종료 대기 중
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">시작 시간</h3>
                        <p>
                          {contest.startTime?.toDate
                            ? new Date(contest.startTime.toDate()).toLocaleString()
                            : "날짜 없음"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">종료 시간</h3>
                        <p>
                          {contest.endTime?.toDate ? new Date(contest.endTime.toDate()).toLocaleString() : "날짜 없음"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">참가자 수</h3>
                        <p className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {participants.length}명
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">문제 수</h3>
                        <p>{contest.problemCount || 0}문제</p>
                      </div>
                    </div>

                    {isFinalized && contest.finalizedAt && (
                      <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          이 대회는 이미 종료 처리되었습니다. (
                          {contest.finalizedAt.toDate
                            ? new Date(contest.finalizedAt.toDate()).toLocaleString()
                            : "날짜 없음"}
                          )
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleFinalizeContest}
                    disabled={isFinalizing || isFinalized || participants.length === 0}
                    className="w-full"
                  >
                    {isFinalizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        종료 처리 중...
                      </>
                    ) : isFinalized ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        이미 종료 처리됨
                      </>
                    ) : (
                      <>
                        <Trophy className="mr-2 h-4 w-4" />
                        대회 종료 처리 및 점수 부여
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>참가자 순위</CardTitle>
                  <CardDescription>종료 처리 시 아래 순위에 따라 점수와 경험치가 부여됩니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-bold">참가자가 없습니다</h3>
                      <p className="text-muted-foreground mt-2">이 대회에 참가한 사용자가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 text-center">순위</TableHead>
                            <TableHead>참가자</TableHead>
                            <TableHead className="text-center">해결한 문제</TableHead>
                            <TableHead className="text-right">점수</TableHead>
                            <TableHead className="text-right">부여될 경험치</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participants.map((participant) => (
                            <TableRow key={participant.id}>
                              <TableCell className="text-center font-medium">{participant.rank}</TableCell>
                              <TableCell>
                                <div className="font-medium">{participant.username}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                {participant.solvedProblems?.length || 0} / {contest.problemCount || 0}
                              </TableCell>
                              <TableCell className="text-right font-bold">{participant.score} 점</TableCell>
                              <TableCell className="text-right">
                                {calculateCtfExp(participant.rank, participants.length, participant.score)} EXP
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}
