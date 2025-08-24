"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, type Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Loader2, CheckCircle, XCircle, Flag, ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"

type ProblemSuggestion = {
  id: string
  title: string
  description: string
  status: "pending" | "approved" | "rejected"
  createdAt: Timestamp
}

export default function AdminProblemSuggestionsPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState<ProblemSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    } else {
      fetchSuggestions()
    }
  }, [isAdmin, router, toast])

  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const suggestionsRef = collection(db, "problem_suggestions")
      const q = query(suggestionsRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)

      const fetchedSuggestions: ProblemSuggestion[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ProblemSuggestion, "id">),
      })) as ProblemSuggestion[]

      setSuggestions(fetchedSuggestions)
    } catch (error) {
      console.error("Error fetching problem suggestions:", error)
      toast({
        title: "오류 발생",
        description: "문제 제안 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (suggestionId: string) => {
    try {
      const suggestionRef = doc(db, "problem_suggestions", suggestionId)
      await updateDoc(suggestionRef, { status: "approved" })
      toast({
        title: "제안 승인 완료",
        description: "문제 제안이 승인되었습니다.",
      })
      fetchSuggestions()
    } catch (error) {
      console.error("Error approving suggestion:", error)
      toast({
        title: "승인 오류",
        description: "문제 제안 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (suggestionId: string) => {
    try {
      const suggestionRef = doc(db, "problem_suggestions", suggestionId)
      await updateDoc(suggestionRef, { status: "rejected" })
      toast({
        title: "제안 거절 완료",
        description: "문제 제안이 거절되었습니다.",
      })
      fetchSuggestions()
    } catch (error) {
      console.error("Error rejecting suggestion:", error)
      toast({
        title: "거절 오류",
        description: "문제 제안 거절 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (suggestionId: string) => {
    try {
      const suggestionRef = doc(db, "problem_suggestions", suggestionId)
      await deleteDoc(suggestionRef)
      toast({
        title: "제안 삭제 완료",
        description: "문제 제안이 삭제되었습니다.",
      })
      fetchSuggestions()
    } catch (error) {
      console.error("Error deleting suggestion:", error)
      toast({
        title: "삭제 오류",
        description: "문제 제안 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6 flex items-center">
            <Link href="/admin">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                대시보드로 돌아가기
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">문제 제안 관리</h1>
              <p className="text-muted-foreground mt-1">사용자들이 제안한 문제 아이디어를 검토하고 관리합니다.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>문제 제안 목록</CardTitle>
              <CardDescription>
                사용자들이 제안한 문제 아이디어를 확인하고 승인 또는 거절할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-1">제안된 문제가 없습니다</p>
                    <p className="text-muted-foreground">새로운 문제 아이디어를 기다리고 있습니다.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제목</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>제안일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((suggestion) => (
                        <TableRow key={suggestion.id}>
                          <TableCell className="font-medium">{suggestion.title}</TableCell>
                          <TableCell>{suggestion.description}</TableCell>
                          <TableCell>
                            {suggestion.status === "pending" && <Badge>대기 중</Badge>}
                            {suggestion.status === "approved" && (
                              <Badge variant="success">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                승인됨
                              </Badge>
                            )}
                            {suggestion.status === "rejected" && (
                              <Badge variant="destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                거절됨
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {suggestion.createdAt &&
                              suggestion.createdAt.toDate().toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {suggestion.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleApprove(suggestion.id)}
                                    title="승인"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReject(suggestion.id)}
                                    title="거절"
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(suggestion.id)}
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
      </main>
      <Footer />
    </div>
  )
}
