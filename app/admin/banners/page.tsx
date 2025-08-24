"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Edit, Loader2, Plus, Save, Settings, Trash2, GripVertical, ImageIcon } from "lucide-react"
import Link from "next/link"
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import type { Banner } from "@/lib/banner-types"

export default function AdminBannersPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null)

  // 폼 상태
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    backgroundColor: "#3B82F6",
    textColor: "#FFFFFF",
    buttonText: "",
    buttonColor: "#FFFFFF",
    isActive: true,
  })

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 배너 목록 가져오기
  const fetchBanners = async () => {
    try {
      setIsLoading(true)
      setError("")

      const bannersRef = collection(db, "banners")
      const bannersQuery = query(bannersRef, orderBy("order", "asc"))
      const bannersSnapshot = await getDocs(bannersQuery)

      const bannersData: Banner[] = []
      bannersSnapshot.forEach((doc) => {
        const data = doc.data()
        bannersData.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          linkUrl: data.linkUrl,
          isActive: data.isActive || false,
          order: data.order || 0,
          backgroundColor: data.backgroundColor || "#3B82F6",
          textColor: data.textColor || "#FFFFFF",
          buttonText: data.buttonText,
          buttonColor: data.buttonColor,
          createdAt: data.createdAt || { toDate: () => new Date() },
          updatedAt: data.updatedAt || { toDate: () => new Date() },
          createdBy: data.createdBy || "",
          startDate: data.startDate,
          endDate: data.endDate,
        })
      })
      setBanners(bannersData)
    } catch (error: any) {
      console.error("Error fetching banners:", error)
      setError("배너를 불러오는 중 오류가 발생했습니다.")
      toast({
        title: "데이터 로딩 오류",
        description: `배너를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    fetchBanners()
  }, [isAdmin, router])

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      backgroundColor: "#3B82F6",
      textColor: "#FFFFFF",
      buttonText: "",
      buttonColor: "#FFFFFF",
      isActive: true,
    })
    setEditingBanner(null)
  }

  // 배너 저장
  const saveBanner = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "입력 오류",
        description: "제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const bannerData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
        linkUrl: formData.linkUrl.trim(),
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        buttonText: formData.buttonText.trim(),
        buttonColor: formData.buttonColor,
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      }

      if (editingBanner) {
        // 수정
        await updateDoc(doc(db, "banners", editingBanner.id), bannerData)
        toast({
          title: "수정 완료",
          description: "배너가 성공적으로 수정되었습니다.",
        })
      } else {
        // 새로 생성
        await addDoc(collection(db, "banners"), {
          ...bannerData,
          order: banners.length,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "",
        })
        toast({
          title: "생성 완료",
          description: "배너가 성공적으로 생성되었습니다.",
        })
      }

      setShowCreateDialog(false)
      resetForm()
      fetchBanners()
    } catch (error: any) {
      console.error("Error saving banner:", error)
      toast({
        title: "저장 오류",
        description: `배너를 저장하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 배너 삭제
  const deleteBanner = async () => {
    if (!bannerToDelete) return

    try {
      await deleteDoc(doc(db, "banners", bannerToDelete))
      setBanners(banners.filter((b) => b.id !== bannerToDelete))
      toast({
        title: "삭제 완료",
        description: "배너가 삭제되었습니다.",
      })
    } catch (error: any) {
      console.error("Error deleting banner:", error)
      toast({
        title: "삭제 오류",
        description: `배너를 삭제하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setBannerToDelete(null)
    }
  }

  // 활성 상태 토글
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "banners", id), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      })

      setBanners(banners.map((b) => (b.id === id ? { ...b, isActive: !currentStatus } : b)))

      toast({
        title: `${!currentStatus ? "활성화" : "비활성화"} 완료`,
        description: `배너가 ${!currentStatus ? "활성화" : "비활성화"}되었습니다.`,
      })
    } catch (error: any) {
      console.error("Error toggling banner status:", error)
      toast({
        title: "상태 변경 오류",
        description: `상태를 변경하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    }
  }

  // 순서 변경
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(banners)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // 순서 업데이트
    const updatedBanners = items.map((banner, index) => ({
      ...banner,
      order: index,
    }))

    setBanners(updatedBanners)

    // Firestore에 순서 업데이트
    try {
      const updatePromises = updatedBanners.map((banner) =>
        updateDoc(doc(db, "banners", banner.id), { order: banner.order }),
      )
      await Promise.all(updatePromises)
    } catch (error) {
      console.error("Error updating banner order:", error)
      toast({
        title: "순서 변경 오류",
        description: "배너 순서를 변경하지 못했습니다.",
        variant: "destructive",
      })
    }
  }

  // 편집 시작
  const startEdit = (banner: Banner) => {
    setFormData({
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      buttonText: banner.buttonText || "",
      buttonColor: banner.buttonColor || "#FFFFFF",
      isActive: banner.isActive,
    })
    setEditingBanner(banner)
    setShowCreateDialog(true)
  }

  // 날짜 포맷 함수
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 정보 없음"
    try {
      const date = timestamp.toDate()
      return format(date, "yyyy.MM.dd HH:mm", { locale: ko })
    } catch (error) {
      return "날짜 정보 오류"
    }
  }

  if (!isAdmin) {
    return null
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
                <p className="text-muted-foreground">배너를 불러오는 중입니다...</p>
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
                <h1 className="text-3xl font-bold">배너 관리</h1>
                <p className="text-muted-foreground mt-1">메인 페이지와 커리큘럼 페이지의 배너를 관리합니다.</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />새 배너 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingBanner ? "배너 수정" : "새 배너 추가"}</DialogTitle>
                  <DialogDescription>배너 정보를 입력하세요.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">제목 *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="배너 제목을 입력하세요"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="배너 설명을 입력하세요"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imageUrl">이미지 URL</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="linkUrl">링크 URL</Label>
                    <Input
                      id="linkUrl"
                      type="url"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="backgroundColor">배경색</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="textColor">텍스트 색상</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buttonText">버튼 텍스트</Label>
                    <Input
                      id="buttonText"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      placeholder="자세히 보기"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buttonColor">버튼 색상</Label>
                    <Input
                      id="buttonColor"
                      type="color"
                      value={formData.buttonColor}
                      onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">활성화</Label>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label>배너 미리보기</Label>
                    <div
                      className="h-24 rounded-md flex items-center justify-center p-4 relative overflow-hidden"
                      style={{
                        backgroundColor: formData.backgroundColor,
                        color: formData.textColor,
                      }}
                    >
                      {formData.imageUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-20"
                          style={{ backgroundImage: `url(${formData.imageUrl})` }}
                        />
                      )}
                      <div className="relative z-10 text-center">
                        <h3 className="font-bold">{formData.title || "배너 제목"}</h3>
                        <p className="text-sm">{formData.description || "배너 설명"}</p>
                        {formData.buttonText && (
                          <button
                            className="mt-2 px-3 py-1 text-sm rounded"
                            style={{
                              backgroundColor: formData.buttonColor || "#FFFFFF",
                              color: formData.backgroundColor,
                            }}
                          >
                            {formData.buttonText}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    취소
                  </Button>
                  <Button onClick={saveBanner} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingBanner ? "수정" : "생성"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardContent className="py-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-2" onClick={fetchBanners}>
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 배너 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>배너 목록</CardTitle>
              <CardDescription>
                총 {banners.length}개의 배너가 있습니다. 드래그하여 순서를 변경할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {banners.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="banners">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>제목</TableHead>
                              <TableHead>상태</TableHead>
                              <TableHead>생성일</TableHead>
                              <TableHead>작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {banners.map((banner, index) => (
                              <Draggable key={banner.id} draggableId={banner.id} index={index}>
                                {(provided) => (
                                  <TableRow
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="hover:bg-gray-50"
                                  >
                                    <TableCell {...provided.dragHandleProps}>
                                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="w-8 h-8 rounded flex items-center justify-center"
                                          style={{ backgroundColor: banner.backgroundColor }}
                                        >
                                          {banner.imageUrl ? (
                                            <img
                                              src={banner.imageUrl || "/placeholder.svg"}
                                              alt=""
                                              className="w-6 h-6 object-cover rounded"
                                            />
                                          ) : (
                                            <ImageIcon className="h-4 w-4 text-white" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium">{banner.title}</div>
                                          <div className="text-sm text-gray-500">{banner.description}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={banner.isActive}
                                          onCheckedChange={() => toggleActive(banner.id, banner.isActive)}
                                        />
                                        <Badge variant={banner.isActive ? "default" : "secondary"}>
                                          {banner.isActive ? "활성" : "비활성"}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatDate(banner.createdAt)}</TableCell>
                                    <TableCell>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <Settings className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>배너 관리</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => startEdit(banner)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            수정
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => {
                                              setBannerToDelete(banner.id)
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
                                )}
                              </Draggable>
                            ))}
                          </TableBody>
                        </Table>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">배너가 없습니다</h3>
                  <p className="text-gray-500 mt-2">새 배너를 추가해보세요.</p>
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
            <DialogTitle>배너 삭제</DialogTitle>
            <DialogDescription>이 작업은 되돌릴 수 없습니다. 정말로 이 배너를 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={deleteBanner}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
