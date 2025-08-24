"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Edit, Loader2, Plus, Trash } from "lucide-react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"

interface Problem {
  id: string
  title: string
  category: string
  difficulty: string
  points: number
  solvedCount: number
}

export default function CTFProblemsPage({ params }: { params: { contestId: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [contestTitle, setContestTitle] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 관리자 권한 확인
  useEffect(() => {
    if (user && userProfile) {
      const isAdmin = userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
      if (!isAdmin) {
        toast({
          title: "접근 권한이 없습니다",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        })
        router.push("/")
      }
    }
  }, [user, userProfile, router, toast])

  // 대회 정보 및 문제 목록 불러오기
  useEffect(() => {
    const fetchContestAndProblems = async () => {
      try {
        setLoading(true)
        setError("")

        // 대회 정보 불러오기
        const contestRef = doc(db, "ctf_contests", params.contestId)
        const contestSnap = await getDoc(contestRef)

        if (!contestSnap.exists()) {
          setError("대회를 찾을 수 없습니다.")
          setLoading(false)
          return
        }

        setContestTitle(contestSnap.data().title || "")

        // 문제 목록 불러오기 - 단순화된 방식
        const problemsRef = collection(db, "ctf_problems")
        const q = query(problemsRef, where("contestId", "==", params.contestId))
        const querySnapshot = await getDocs(q)

        const problemsList: Problem[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as any
          problemsList.push({
            id: doc.id,
            title: data.title || "",
            category: data.category || "",
            difficulty: data.difficulty || "",
            points: data.points || 0,
            solvedCount: data.solvedCount || 0,
          })
        })

        // 점수 기준으로 정렬
        problemsList.sort((a, b) => a.points - b.points)

        setProblems(problemsList)
      } catch (error) {
        console.error("Error fetching contest and problems:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchContestAndProblems()
  }, [params.contestId])

  // 문제 삭제 핸들러
  const handleDeleteProblem = async () => {
    if (!problemToDelete) return

    setIsDeleting(true)
    try {
      // 문제 삭제 - 단순화된 방식
      const problemRef = doc(db, "ctf_problems", problemToDelete.id)
      await deleteDoc(problemRef)

      // 대회 문서 업데이트 - 별도 작업으로 분리
      try {
        const contestRef = doc(db, "ctf_contests", params.contestId)
        const contestDoc = await getDoc(contestRef)

        if (contestDoc.exists()) {
          const currentCount = contestDoc.data().problemCount || 0
          await updateDoc(contestRef, {
            problemCount: Math.max(0, currentCount - 1),
            updatedAt: serverTimestamp(),
          })
        }
      } catch (updateError) {
        console.error("Error updating contest document:", updateError)
        // 문제 삭제는 성공했으므로 이 오류는 무시하고 계속 진행
      }

      toast({
        title: "문제가 삭제되었습니다",
        description: "CTF 문제가 성공적으로 삭제되었습니다.",
        variant: "default",
      })

      // 문제 목록에서 삭제된 문제 제거
      setProblems(problems.filter((p) => p.id !== problemToDelete.id))
    } catch (error) {
      console.error("Error deleting problem:", error)
      toast({
        title: "오류 발생",
        description: "문제를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setProblemToDelete(null)
    }
  }

  // 난이도에 따른 배지 색상
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "초급":
        return "bg-green-500/20 text-green-600 dark:bg-green-500/10 dark:text-green-400"
      case "중급":
        return "bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
      case "고급":
        return "bg-red-500/20 text-red-600 dark:bg-red-500/10 dark:text-red-400"
      default:
        return "bg-gray-500/20 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
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
              대회 목록으로
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">CTF 문제 관리</h1>
                <p className="text-muted-foreground mt-2">
                  {contestTitle ? `"${contestTitle}" 대회의 문제를 관리합니다.` : "CTF 문제를 관리합니다."}
                </p>
              </div>
              <Link href={`/admin/ctf/problems/${params.contestId}/create`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  문제 추가
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>문제 목록</CardTitle>
              <CardDescription>
                {problems.length > 0 ? `총 ${problems.length}개의 문제가 있습니다.` : "아직 등록된 문제가 없습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : problems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>난이도</TableHead>
                      <TableHead className="text-right">점수</TableHead>
                      <TableHead className="text-right">해결 수</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map((problem) => (
                      <TableRow key={problem.id}>
                        <TableCell className="font-medium">{problem.title}</TableCell>
                        <TableCell>{problem.category}</TableCell>
                        <TableCell>
                          <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{problem.points}</TableCell>
                        <TableCell className="text-right">{problem.solvedCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => router.push(`/admin/ctf/problems/${params.contestId}/edit/${problem.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">수정</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setProblemToDelete(problem)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">삭제</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="mb-4 text-muted-foreground">아직 등록된 문제가 없습니다.</p>
                  <Link href={`/admin/ctf/problems/${params.contestId}/create`}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />첫 문제 추가하기
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문제 삭제</DialogTitle>
            <DialogDescription>
              정말로 "{problemToDelete?.title}" 문제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteProblem} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
