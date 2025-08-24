"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { isAdmin } from "@/lib/admin-utils"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Edit, AlertCircle, Loader2 } from "lucide-react"
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  where,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminWargamePage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentTab, setCurrentTab] = useState("all")

  // 관리자 권한 확인 - 수정된 부분
  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // isAdmin 유틸리티 함수 사용
    if (!isAdmin(userProfile)) {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    fetchChallenges()
  }, [user, userProfile, router, toast])

  // 나머지 코드는 그대로 유지...
  // 여기서는 예시로 관리자 권한 체크 로직만 수정했습니다.

  // 문제 목록 불러오기
  const fetchChallenges = async (searchTerm = "") => {
    try {
      setIsLoading(true)

      const challengesRef = collection(db, "wargame_challenges")
      let challengesQuery

      if (searchTerm) {
        // 검색어가 있는 경우
        challengesQuery = query(
          challengesRef,
          where("title", ">=", searchTerm),
          where("title", "<=", searchTerm + "\uf8ff"),
          limit(20),
        )
      } else if (currentTab !== "all") {
        // 카테고리별 필터링
        challengesQuery = query(
          challengesRef,
          where("category", "==", currentTab),
          orderBy("createdAt", "desc"),
          limit(20),
        )
      } else {
        // 기본 정렬
        challengesQuery = query(challengesRef, orderBy("createdAt", "desc"), limit(20))
      }

      const challengesSnapshot = await getDocs(challengesQuery)
      const challengesList: any[] = []

      challengesSnapshot.forEach((doc) => {
        challengesList.push({ id: doc.id, ...doc.data() })
      })

      setChallenges(challengesList)
      setLastVisible(challengesSnapshot.docs[challengesSnapshot.docs.length - 1] || null)
      setHasMore(challengesSnapshot.docs.length === 20)
    } catch (error) {
      console.error("Error fetching challenges:", error)
      toast({
        title: "문제 목록 로딩 실패",
        description: "문제 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  // 더 많은 문제 불러오기
  const loadMoreChallenges = async () => {
    if (!lastVisible || isLoadingMore) return

    try {
      setIsLoadingMore(true)

      const challengesRef = collection(db, "wargame_challenges")
      let challengesQuery

      if (currentTab !== "all") {
        // 카테고리별 필터링
        challengesQuery = query(
          challengesRef,
          where("category", "==", currentTab),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(20),
        )
      } else {
        // 기본 정렬
        challengesQuery = query(challengesRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(20))
      }

      const challengesSnapshot = await getDocs(challengesQuery)
      const newChallenges: any[] = []

      challengesSnapshot.forEach((doc) => {
        newChallenges.push({ id: doc.id, ...doc.data() })
      })

      setChallenges([...challenges, ...newChallenges])
      setLastVisible(challengesSnapshot.docs[challengesSnapshot.docs.length - 1] || null)
      setHasMore(challengesSnapshot.docs.length === 20)
    } catch (error) {
      console.error("Error loading more challenges:", error)
      toast({
        title: "추가 문제 로딩 실패",
        description: "더 많은 문제를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    fetchChallenges(searchQuery)
  }

  // 탭 변경 처리
  const handleTabChange = (value: string) => {
    setCurrentTab(value)
    setSearchQuery("")
    fetchChallenges("")
  }

  // 문제 삭제 다이얼로그 열기
  const openDeleteDialog = (challenge: any) => {
    setSelectedChallenge(challenge)
    setShowDeleteDialog(true)
  }

  // 문제 삭제 처리
  const handleDeleteChallenge = async () => {
    if (!selectedChallenge) return

    setIsDeleting(true)

    try {
      await deleteDoc(doc(db, "wargame_challenges", selectedChallenge.id))

      toast({
        title: "문제 삭제 완료",
        description: "문제가 성공적으로 삭제되었습니다.",
        variant: "default",
      })

      // 문제 목록 업데이트
      setChallenges(challenges.filter((challenge) => challenge.id !== selectedChallenge.id))
    } catch (error) {
      console.error("Error deleting challenge:", error)
      toast({
        title: "문제 삭제 실패",
        description: "문제를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setSelectedChallenge(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 대시보드로 돌아가기
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">워게임 문제 관리</h1>
                <p className="text-muted-foreground mt-2">워게임 문제를 추가, 수정, 삭제할 수 있습니다.</p>
              </div>
              <Link href="/admin/wargame/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  문제 추가
                </Button>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>문제 목록</CardTitle>
              <CardDescription>등록된 워게임 문제 목록입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1">
                  <Input
                    placeholder="문제 제목으로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "검색"}
                  </Button>
                </form>

                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full md:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="웹 해킹">웹 해킹</TabsTrigger>
                    <TabsTrigger value="시스템 해킹">시스템 해킹</TabsTrigger>
                    <TabsTrigger value="리버싱">리버싱</TabsTrigger>
                    <TabsTrigger value="암호학">암호학</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : challenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold">문제를 찾을 수 없습니다</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery ? "검색 조건에 맞는 문제가 없습니다." : "등록된 문제가 없습니다."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>제목</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>난이도</TableHead>
                          <TableHead>점수</TableHead>
                          <TableHead>해결 수</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {challenges.map((challenge) => (
                          <TableRow key={challenge.id}>
                            <TableCell className="font-medium">{challenge.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{challenge.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  challenge.difficulty === "초급"
                                    ? "bg-green-500/10 text-green-500"
                                    : challenge.difficulty === "중급"
                                      ? "bg-yellow-500/10 text-yellow-500"
                                      : "bg-red-500/10 text-red-500"
                                }
                              >
                                {challenge.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell>{challenge.points || 100} 점</TableCell>
                            <TableCell>{challenge.solvedCount || 0} 명</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/admin/wargame/edit/${challenge.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(challenge)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {hasMore && (
                    <div className="mt-4 flex justify-center">
                      <Button variant="outline" onClick={loadMoreChallenges} disabled={isLoadingMore}>
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            로딩 중...
                          </>
                        ) : (
                          "더 보기"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* 문제 삭제 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문제 삭제</DialogTitle>
            <DialogDescription>이 문제를 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>

          {selectedChallenge && (
            <div className="py-4">
              <p className="font-medium">{selectedChallenge.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{selectedChallenge.category}</Badge>
                <Badge
                  variant="secondary"
                  className={
                    selectedChallenge.difficulty === "초급"
                      ? "bg-green-500/10 text-green-500"
                      : selectedChallenge.difficulty === "중급"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                  }
                >
                  {selectedChallenge.difficulty}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteChallenge} disabled={isDeleting}>
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
