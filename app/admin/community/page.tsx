"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MessageSquare,
  ArrowLeft,
  Trash2,
  Edit,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  ThumbsUp,
  MessageCircle,
} from "lucide-react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"

// 페이지당 게시물 수
const POSTS_PER_PAGE = 10

export default function AdminCommunityPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [posts, setPosts] = useState<any[]>([])
  const [reportedPosts, setReportedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => void
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: () => {},
  })

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [previousFirstVisible, setPreviousFirstVisible] = useState<QueryDocumentSnapshot[]>([])

  // 관리자 여부 확인
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
      if (activeTab === "reported") {
        fetchReportedPosts()
      } else {
        fetchPosts()
      }
    }
  }, [isAdmin, router, toast, activeTab, currentPage])

  // 게시물 목록 가져오기
  const fetchPosts = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      const postsRef = collection(db, "community_posts")

      let q = query(postsRef, orderBy("createdAt", "desc"), limit(POSTS_PER_PAGE))

      // 페이지네이션
      if (lastVisible && currentPage > 1) {
        q = query(postsRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(POSTS_PER_PAGE))
      }

      const querySnapshot = await getDocs(q)

      // 페이지네이션을 위한 첫 번째와 마지막 문서 저장
      if (!querySnapshot.empty) {
        setFirstVisible(querySnapshot.docs[0])
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1])
      }

      // 총 페이지 수 계산
      const totalPostsQuery = query(postsRef)
      const totalPostsSnapshot = await getDocs(totalPostsQuery)
      setTotalPages(Math.ceil(totalPostsSnapshot.size / POSTS_PER_PAGE))

      const fetchedPosts: any[] = []

      // 게시물 데이터와 작성자 정보 함께 가져오기
      for (const postDoc of querySnapshot.docs) {
        const postData = postDoc.data()
        let authorData = { username: "알 수 없음", email: "" }

        try {
          const authorDoc = await getDoc(doc(db, "users", postData.authorId))
          if (authorDoc.exists()) {
            authorData = authorDoc.data()
          }
        } catch (error) {
          console.error("Error fetching author data:", error)
        }

        fetchedPosts.push({
          id: postDoc.id,
          ...postData,
          author: authorData,
        })
      }

      setPosts(fetchedPosts)
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast({
        title: "오류 발생",
        description: "게시물 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 신고된 게시물 목록 가져오기
  const fetchReportedPosts = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      const postsRef = collection(db, "community_posts")
      const q = query(postsRef, where("reportCount", ">", 0), orderBy("reportCount", "desc"))
      const querySnapshot = await getDocs(q)

      const fetchedPosts: any[] = []

      // 게시물 데이터와 작성자 정보 함께 가져오기
      for (const postDoc of querySnapshot.docs) {
        const postData = postDoc.data()
        let authorData = { username: "알 수 없음", email: "" }

        try {
          const authorDoc = await getDoc(doc(db, "users", postData.authorId))
          if (authorDoc.exists()) {
            authorData = authorDoc.data()
          }
        } catch (error) {
          console.error("Error fetching author data:", error)
        }

        fetchedPosts.push({
          id: postDoc.id,
          ...postData,
          author: authorData,
        })
      }

      setReportedPosts(fetchedPosts)
    } catch (error) {
      console.error("Error fetching reported posts:", error)
      toast({
        title: "오류 발생",
        description: "신고된 게시물 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 이전 페이지로 이동
  const goToPreviousPage = async () => {
    if (currentPage > 1) {
      try {
        const postsRef = collection(db, "community_posts")

        // 이전 페이지의 첫 번째 문서 가져오기
        const prevFirst = previousFirstVisible[previousFirstVisible.length - 1]
        setPreviousFirstVisible(previousFirstVisible.slice(0, -1))

        const q = query(postsRef, orderBy("createdAt", "desc"), endBefore(prevFirst), limitToLast(POSTS_PER_PAGE))

        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          setFirstVisible(querySnapshot.docs[0])
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1])

          const fetchedPosts: any[] = []

          // 게시물 데이터와 작성자 정보 함께 가져오기
          for (const postDoc of querySnapshot.docs) {
            const postData = postDoc.data()
            let authorData = { username: "알 수 없음", email: "" }

            try {
              const authorDoc = await getDoc(doc(db, "users", postData.authorId))
              if (authorDoc.exists()) {
                authorData = authorDoc.data()
              }
            } catch (error) {
              console.error("Error fetching author data:", error)
            }

            fetchedPosts.push({
              id: postDoc.id,
              ...postData,
              author: authorData,
            })
          }

          setPosts(fetchedPosts)
          setCurrentPage(currentPage - 1)
        }
      } catch (error) {
        console.error("Error navigating to previous page:", error)
      }
    }
  }

  // 다음 페이지로 이동
  const goToNextPage = async () => {
    if (currentPage < totalPages) {
      try {
        // 현재 첫 번째 문서 저장
        if (firstVisible) {
          setPreviousFirstVisible([...previousFirstVisible, firstVisible])
        }

        setCurrentPage(currentPage + 1)
      } catch (error) {
        console.error("Error navigating to next page:", error)
      }
    }
  }

  // 게시물 검색
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchPosts()
      return
    }

    setLoading(true)
    try {
      const postsRef = collection(db, "community_posts")
      const postsSnapshot = await getDocs(postsRef)

      // 클라이언트 측에서 필터링 (Firestore의 제한된 검색 기능 대신)
      const searchResults = postsSnapshot.docs.filter((doc) => {
        const data = doc.data()
        const title = data.title?.toLowerCase() || ""
        const content = data.content?.toLowerCase() || ""
        const searchTermLower = searchTerm.toLowerCase()

        return title.includes(searchTermLower) || content.includes(searchTermLower)
      })

      const fetchedPosts: any[] = []

      // 게시물 데이터와 작성자 정보 함께 가져오기
      for (const postDoc of searchResults) {
        const postData = postDoc.data()
        let authorData = { username: "알 수 없음", email: "" }

        try {
          const authorDoc = await getDoc(doc(db, "users", postData.authorId))
          if (authorDoc.exists()) {
            authorData = authorDoc.data()
          }
        } catch (error) {
          console.error("Error fetching author data:", error)
        }

        fetchedPosts.push({
          id: postDoc.id,
          ...postData,
          author: authorData,
        })
      }

      setPosts(fetchedPosts)
      setTotalPages(1) // 검색 결과는 페이지네이션 없음
    } catch (error) {
      console.error("Error searching posts:", error)
      toast({
        title: "검색 오류",
        description: "게시물 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 게시물 삭제
  const deletePost = async (postId: string) => {
    try {
      const postRef = doc(db, "community_posts", postId)
      await deleteDoc(postRef)

      toast({
        title: "게시물 삭제 완료",
        description: "게시물이 삭제되었습니다.",
        variant: "default",
      })

      // 게시물 목록 새로고침
      if (activeTab === "reported") {
        fetchReportedPosts()
      } else {
        fetchPosts()
      }
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "게시물 삭제 오류",
        description: "게시물을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 신고 처리 (승인)
  const approveReport = async (postId: string) => {
    try {
      const postRef = doc(db, "community_posts", postId)
      const postDoc = await getDoc(postRef)

      if (!postDoc.exists()) {
        toast({
          title: "게시물 없음",
          description: "해당 게시물을 찾을 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      await updateDoc(postRef, {
        isHidden: true,
        reportStatus: "approved",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "신고 승인 완료",
        description: "게시물이 숨김 처리되었습니다.",
        variant: "default",
      })

      // 게시물 목록 새로고침
      fetchReportedPosts()
    } catch (error) {
      console.error("Error approving report:", error)
      toast({
        title: "신고 처리 오류",
        description: "신고를 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 신고 처리 (거부)
  const rejectReport = async (postId: string) => {
    try {
      const postRef = doc(db, "community_posts", postId)
      const postDoc = await getDoc(postRef)

      if (!postDoc.exists()) {
        toast({
          title: "게시물 없음",
          description: "해당 게시물을 찾을 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      await updateDoc(postRef, {
        reportCount: 0,
        reportReasons: [],
        reportedBy: [],
        reportStatus: "rejected",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "신고 거부 완료",
        description: "신고가 거부되었습니다.",
        variant: "default",
      })

      // 게시물 목록 새로고침
      fetchReportedPosts()
    } catch (error) {
      console.error("Error rejecting report:", error)
      toast({
        title: "신고 처리 오류",
        description: "신고를 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 확인 다이얼로그 열기
  const openConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      description,
      action,
    })
  }

  // 날짜 포맷팅
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "날짜 없음"

    return timestamp.toDate().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
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
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              대시보드로 돌아가기
            </Button>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">커뮤니티 관리</h1>
              <p className="text-muted-foreground mt-1">게시물을 관리하고 신고를 처리합니다.</p>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                <MessageSquare className="mr-2 h-4 w-4" />
                전체 게시물
              </TabsTrigger>
              <TabsTrigger value="reported">
                <AlertTriangle className="mr-2 h-4 w-4" />
                신고된 게시물
                {reportedPosts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {reportedPosts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div>
                      <CardTitle>전체 게시물</CardTitle>
                      <CardDescription>커뮤니티에 등록된 모든 게시물을 관리합니다.</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="제목 또는 내용 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64"
                      />
                      <Button onClick={handleSearch} size="icon" variant="outline">
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => router.push("/admin/community/create")} variant="default">
                        게시물 작성
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
                        <p>게시물 목록을 불러오는 중...</p>
                      </div>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">게시물이 없습니다</p>
                        <p className="text-muted-foreground">아직 등록된 게시물이 없습니다.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>제목</TableHead>
                              <TableHead>작성자</TableHead>
                              <TableHead>작성일</TableHead>
                              <TableHead>조회수</TableHead>
                              <TableHead>좋아요</TableHead>
                              <TableHead>댓글</TableHead>
                              <TableHead>상태</TableHead>
                              <TableHead className="text-right">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {posts.map((post) => (
                              <TableRow key={post.id} className={post.isHidden ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">
                                  <div className="max-w-xs truncate">{post.title}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {post.author?.username || "알 수 없음"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-1 h-3 w-3" />
                                    {formatDate(post.createdAt)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Eye className="mr-1 h-4 w-4 text-muted-foreground" />
                                    {post.viewCount || 0}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <ThumbsUp className="mr-1 h-4 w-4 text-muted-foreground" />
                                    {post.likes?.length || 0}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <MessageCircle className="mr-1 h-4 w-4 text-muted-foreground" />
                                    {post.commentCount || 0}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {post.isHidden ? (
                                    <Badge variant="outline" className="bg-red-50 text-red-700">
                                      숨김
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      공개
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => router.push(`/community/${post.id}`)}
                                      title="게시물 보기"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => router.push(`/admin/community/edit/${post.id}`)}
                                      title="게시물 수정"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        openConfirmDialog(
                                          "게시물 삭제",
                                          "이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
                                          () => deletePost(post.id),
                                        )
                                      }
                                      title="게시물 삭제"
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

                      {/* 페이지네이션 */}
                      {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1 || loading}
                          >
                            이전
                          </Button>
                          <span className="text-sm">
                            {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages || loading}
                          >
                            다음
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reported">
              <Card>
                <CardHeader>
                  <CardTitle>신고된 게시물</CardTitle>
                  <CardDescription>사용자로부터 신고된 게시물을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
                        <p>신고된 게시물을 불러오는 중...</p>
                      </div>
                    </div>
                  ) : reportedPosts.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">신고된 게시물이 없습니다</p>
                        <p className="text-muted-foreground">현재 신고된 게시물이 없습니다.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>제목</TableHead>
                            <TableHead>작성자</TableHead>
                            <TableHead>신고 수</TableHead>
                            <TableHead>신고 사유</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportedPosts.map((post) => (
                            <TableRow key={post.id} className={post.isHidden ? "bg-muted/50" : ""}>
                              <TableCell className="font-medium">
                                <div className="max-w-xs truncate">{post.title}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {post.author?.username || "알 수 없음"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{post.reportCount || 0}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs truncate">{post.reportReasons?.join(", ") || "사유 없음"}</div>
                              </TableCell>
                              <TableCell>
                                {post.isHidden ? (
                                  <Badge variant="outline" className="bg-red-50 text-red-700">
                                    숨김
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                    신고됨
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/community/${post.id}`)}
                                    title="게시물 보기"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() =>
                                      openConfirmDialog("신고 거부", "이 게시물에 대한 신고를 거부하시겠습니까?", () =>
                                        rejectReport(post.id),
                                      )
                                    }
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    거부
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() =>
                                      openConfirmDialog(
                                        "신고 승인",
                                        "이 게시물에 대한 신고를 승인하고 게시물을 숨기시겠습니까?",
                                        () => approveReport(post.id),
                                      )
                                    }
                                  >
                                    <XCircle className="mr-1 h-4 w-4" />
                                    승인
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      openConfirmDialog(
                                        "게시물 삭제",
                                        "이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
                                        () => deletePost(post.id),
                                      )
                                    }
                                    title="게시물 삭제"
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
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 확인 다이얼로그 */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmDialog.action()
                setConfirmDialog({ ...confirmDialog, isOpen: false })
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
