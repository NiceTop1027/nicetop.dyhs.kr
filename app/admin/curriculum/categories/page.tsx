"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import Link from "next/link"
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { CurriculumCategory } from "@/lib/curriculum-types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function AdminCurriculumCategoriesPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<CurriculumCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  // 새 카테고리 관련 상태
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 카테고리 가져오기
  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError("")

      const categoriesRef = collection(db, "curriculum_categories")
      const categoriesQuery = query(categoriesRef, orderBy("order", "asc"))
      const categoriesSnapshot = await getDocs(categoriesQuery)

      const categoriesData: CurriculumCategory[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data() as Omit<CurriculumCategory, "id">
        categoriesData.push({
          id: doc.id,
          ...data,
        })
      })
      setCategories(categoriesData)
    } catch (error: any) {
      console.error("Error fetching categories:", error)
      setError("카테고리를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      toast({
        title: "데이터 로딩 오류",
        description: `카테고리를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
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

    fetchCategories()
  }, [isAdmin, router])

  // 카테고리 삭제
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      await deleteDoc(doc(db, "curriculum_categories", categoryToDelete))

      // 상태 업데이트
      setCategories(categories.filter((c) => c.id !== categoryToDelete))

      toast({
        title: "삭제 완료",
        description: "카테고리가 삭제되었습니다.",
      })
    } catch (error: any) {
      console.error("Error deleting category:", error)
      toast({
        title: "삭제 오류",
        description: `카테고리를 삭제하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  // 카테고리 순서 변경
  const moveCategory = async (id: string, direction: "up" | "down") => {
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) return

    if (direction === "up" && index === 0) return
    if (direction === "down" && index === categories.length - 1) return

    const newIndex = direction === "up" ? index - 1 : index + 1

    try {
      // 순서 변경
      const newCategories = [...categories]
      const temp = newCategories[index]
      newCategories[index] = newCategories[newIndex]
      newCategories[newIndex] = temp

      // 순서 재조정
      const reorderedCategories = newCategories.map((category, idx) => ({
        ...category,
        order: idx,
      }))

      // Firestore 업데이트
      const batch = db.batch()
      reorderedCategories.forEach((category) => {
        const categoryRef = doc(db, "curriculum_categories", category.id)
        batch.update(categoryRef, { order: category.order })
      })

      await batch.commit()

      // 상태 업데이트
      setCategories(reorderedCategories)

      toast({
        title: "순서 변경 완료",
        description: "카테고리 순서가 변경되었습니다.",
      })
    } catch (error: any) {
      console.error("Error moving category:", error)
      toast({
        title: "순서 변경 오류",
        description: `카테고리 순서를 변경하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    }
  }

  // 새 카테고리 추가
  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "입력 오류",
        description: "카테고리 이름을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const newCategory = {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        order: categories.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || "",
      }

      const docRef = await addDoc(collection(db, "curriculum_categories"), newCategory)

      // 상태 업데이트
      setCategories([
        ...categories,
        {
          id: docRef.id,
          ...newCategory,
          createdAt: { toDate: () => new Date() } as any,
          updatedAt: { toDate: () => new Date() } as any,
        },
      ])

      // 입력 필드 초기화
      setNewCategoryName("")
      setNewCategoryDescription("")
      setIsAddingCategory(false)

      toast({
        title: "카테고리 추가 완료",
        description: "새 카테고리가 추가되었습니다.",
      })
    } catch (error: any) {
      console.error("Error adding category:", error)
      toast({
        title: "카테고리 추가 오류",
        description: `카테고리를 추가하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    }
  }

  // 카테고리 이름 수정
  const updateCategoryName = async (id: string, name: string) => {
    if (!name.trim()) return

    try {
      await updateDoc(doc(db, "curriculum_categories", id), {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      })

      // 상태 업데이트
      setCategories(categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)))
    } catch (error: any) {
      console.error("Error updating category name:", error)
      toast({
        title: "카테고리 수정 오류",
        description: `카테고리 이름을 수정하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    }
  }

  // 카테고리 설명 수정
  const updateCategoryDescription = async (id: string, description: string) => {
    try {
      await updateDoc(doc(db, "curriculum_categories", id), {
        description: description.trim(),
        updatedAt: serverTimestamp(),
      })

      // 상태 업데이트
      setCategories(categories.map((c) => (c.id === id ? { ...c, description: description.trim() } : c)))
    } catch (error: any) {
      console.error("Error updating category description:", error)
      toast({
        title: "카테고리 수정 오류",
        description: `카테고리 설명을 수정하지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
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
                <p className="text-muted-foreground">카테고리를 불러오는 중입니다...</p>
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
              <Link href="/admin/curriculum">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">카테고리 관리</h1>
                <p className="text-muted-foreground mt-1">커리큘럼 카테고리를 생성, 수정, 삭제할 수 있습니다.</p>
              </div>
            </div>
            <Button onClick={() => setIsAddingCategory(true)}>
              <Plus className="mr-2 h-4 w-4" />새 카테고리 추가
            </Button>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardContent className="py-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-2" onClick={fetchCategories}>
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 새 카테고리 추가 폼 */}
          {isAddingCategory && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>새 카테고리 추가</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsAddingCategory(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category-name">카테고리 이름</Label>
                    <Input
                      id="category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="예: 암호학, 시스템 해킹, 웹 보안 등"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category-description">카테고리 설명</Label>
                    <Textarea
                      id="category-description"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="카테고리에 대한 간략한 설명을 입력하세요."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={addCategory}>
                      <Save className="mr-2 h-4 w-4" />
                      저장
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 카테고리 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>카테고리 목록</CardTitle>
              <CardDescription>총 {categories.length}개의 카테고리가 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">순서</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead className="w-[150px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category, index) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{index + 1}</span>
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveCategory(category.id, "up")}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveCategory(category.id, "down")}
                                disabled={index === categories.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={category.name}
                            onChange={(e) => updateCategoryName(category.id, e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={category.description}
                            onChange={(e) => updateCategoryDescription(category.id, e.target.value)}
                            className="min-h-[60px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setCategoryToDelete(category.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-lg font-medium">카테고리가 없습니다</h3>
                  <p className="text-muted-foreground mt-2">
                    아직 등록된 카테고리가 없습니다. 새 카테고리를 추가해주세요.
                  </p>
                  <Button className="mt-4" onClick={() => setIsAddingCategory(true)}>
                    <Plus className="mr-2 h-4 w-4" />새 카테고리 추가
                  </Button>
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
            <DialogTitle>카테고리 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 이 카테고리를 사용하는 커리큘럼이 있다면 문제가 발생할 수 있습니다. 정말로
              이 카테고리를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
