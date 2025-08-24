"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Edit, Eye, Loader2, Plus, Search, Trash2, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { Curriculum, CurriculumCategory } from "@/lib/curriculum-types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function AdminCurriculumPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [categories, setCategories] = useState<CurriculumCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [curriculumToDelete, setCurriculumToDelete] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"
  const isSuperAdmin = userProfile?.role === "superadmin"

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      // 카테고리 가져오기
      const categoriesRef = collection(db, "curriculum_categories")
      const categoriesQuery = query(categoriesRef, orderBy("order", "asc"))
      const categoriesSnapshot = await getDocs(categoriesQuery)

      const categoriesData: CurriculumCategory[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        categoriesData.push({
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          order: data.order || 0,
          createdAt: data.createdAt || { toDate: () => new Date() },
          updatedAt: data.updatedAt || { toDate: () => new Date() },
          createdBy: data.createdBy || "",
        })
      })
      setCategories(categoriesData)

      // 커리큘럼 가져오기
      const curriculumsRef = collection(db, "curriculums")
      const curriculumsQuery = query(curriculumsRef, orderBy("createdAt", "desc"))
      const curriculumsSnapshot = await getDocs(curriculumsQuery)

      const curriculumsData: Curriculum[] = []
      curriculumsSnapshot.forEach((doc) => {
        const data = doc.data()
        curriculumsData.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          thumbnailUrl: data.thumbnailUrl,
          createdAt: data.createdAt || { toDate: () => new Date() },
          updatedAt: data.updatedAt || { toDate: () => new Date() },
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          slides: data.slides || [],
          isPublished: data.isPublished || false,
          viewCount: data.viewCount || 0,
          tags: data.tags || [],
          difficulty: data.difficulty || "Easy",
        })
      })
      setCurriculums(curriculumsData)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      toast({
        title: "데이터 로딩 오류",
        description: `데이터를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }

    fetchData()
  }, [isAdmin, router])

  // 커리큘럼 삭제
  const handleDeleteCurriculum = async () => {
    if (!curriculumToDelete) return

    try {
      await deleteDoc(doc(db, "curriculums", curriculumToDelete))

      // 상태 업데이트
      setCurriculums(curriculums.filter((c) => c.id !== curriculumToDelete))

      toast({
        title: "삭제 완료",
        description: "커리큘럼이 삭제되었습니다.",
      })
    } catch (error: any) {
      console.error("Error deleting curriculum:", error)
      toast({
        title: "삭제 오류",
        description: `커리큘럼을 삭제하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setCurriculumToDelete(null)
    }
  }

  // 공개 상태 토글
  const togglePublishStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "curriculums", id), {
        isPublished: !currentStatus,
      })

      // 상태 업데이트
      setCurriculums(curriculums.map((c) => (c.id === id ? { ...c, isPublished: !currentStatus } : c)))

      toast({
        title: `${!currentStatus ? "공개" : "비공개"} 설정 완료`,
        description: `커리큘럼이 ${!currentStatus ? "공개" : "비공개"}로 설정되었습니다.`,
      })
    } catch (error: any) {
      console.error("Error toggling publish status:", error)
      toast({
        title: "상태 변경 오류",
        description: `상태를 변경하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    }
  }

  // 날짜 포맷 함수
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 정보 없음"

    try {
      const date = timestamp.toDate()
      return format(date, "yyyy.MM.dd HH:mm", { locale: ko })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "날짜 정보 오류"
    }
  }

  // 검색 및 필터링된 커리큘럼
  const filteredCurriculums = curriculums.filter((curriculum) => {
    // 검색어 필터링
    const matchesSearch =
      searchQuery === "" ||
      curriculum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      curriculum.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (curriculum.tags && curriculum.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))

    // 탭 필터링
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "published" && curriculum.isPublished) ||
      (activeTab === "draft" && !curriculum.isPublished)

    // 카테고리 필터링
    const matchesCategory = activeCategory === "all" || curriculum.category === activeCategory

    return matchesSearch && matchesTab && matchesCategory
  })

  // 카테고리 이름 가져오기
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "카테고리 없음"
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-900/50 text-green-300 border-green-700"
      case "Medium":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700"
      case "Hard":
        return "bg-orange-900/50 text-orange-300 border-orange-700"
      case "Expert":
        return "bg-red-900/50 text-red-300 border-red-700"
      default:
        return "bg-gray-900/50 text-gray-300 border-gray-700"
    }
  }

  if (!isAdmin) {
    return null // 권한 없음 (useEffect에서 리다이렉트 처리)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">커리큘럼 관리</h1>
                <p className="text-muted-foreground mt-1">커리큘럼을 생성, 수정, 삭제할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/curriculum/categories">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  카테고리 관리
                </Button>
              </Link>
              <Link href="/admin/curriculum/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />새 커리큘럼 작성
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardContent className="py-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-2" onClick={fetchData}>
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 검색 및 필터링 */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="커리큘럼 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="published">공개</TabsTrigger>
                  <TabsTrigger value="draft">비공개</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full md:w-auto">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="all">전체 카테고리</TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* 커리큘럼 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>커리큘럼 목록</CardTitle>
              <CardDescription>총 {filteredCurriculums.length}개의 커리큘럼이 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCurriculums.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>난이도</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>조회수</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCurriculums.map((curriculum) => (
                      <TableRow key={curriculum.id}>
                        <TableCell className="font-medium">{curriculum.title}</TableCell>
                        <TableCell>{getCategoryName(curriculum.category)}</TableCell>
                        <TableCell>
                          <Badge className={getDifficultyColor(curriculum.difficulty || "Easy")}>
                            {curriculum.difficulty || "Easy"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={curriculum.isPublished}
                              onCheckedChange={() => togglePublishStatus(curriculum.id, curriculum.isPublished)}
                            />
                            <Label>
                              {curriculum.isPublished ? (
                                <Badge variant="default" className="bg-green-500">
                                  공개
                                </Badge>
                              ) : (
                                <Badge variant="outline">비공개</Badge>
                              )}
                            </Label>
                          </div>
                        </TableCell>
                        <TableCell>{curriculum.viewCount || 0}</TableCell>
                        <TableCell>{formatDate(curriculum.createdAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>커리큘럼 관리</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/curriculum/${curriculum.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/admin/curriculum/edit/${curriculum.id}`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setCurriculumToDelete(curriculum.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">커리큘럼이 없습니다</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery
                      ? "검색 조건에 맞는 커리큘럼이 없습니다. 다른 검색어로 시도해보세요."
                      : "아직 등록된 커리큘럼이 없습니다."}
                  </p>
                  <Link href="/admin/curriculum/create" className="mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />새 커리큘럼 작성
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
            <DialogTitle>커리큘럼 삭제</DialogTitle>
            <DialogDescription>이 작업은 되돌릴 수 없습니다. 정말로 이 커리큘럼을 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCurriculum}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
