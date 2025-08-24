"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowLeft,
  Search,
  Shield,
  User,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  Crown,
  Settings,
} from "lucide-react"
import {
  getFirestore,
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserProfile } from "@/lib/user-types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isSuperAdmin } from "@/lib/admin-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { UserDetailModal } from "@/components/admin/user-detail-modal"
import { UserEditModal } from "@/components/admin/user-edit-modal"
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar"
import { isAdmin } from "@/lib/admin-utils"

// 최고 관리자 이메일
const SUPER_ADMIN_EMAIL = "mistarcodm@gmail.com"

// 필터 옵션
const ROLE_FILTERS = [
  { value: "all", label: "모든 역할" },
  { value: "user", label: "일반 사용자" },
  { value: "admin", label: "관리자" },
]

const STATUS_FILTERS = [
  { value: "all", label: "모든 상태" },
  { value: "active", label: "활성" },
  { value: "suspended", label: "일시 정지" },
  { value: "banned", label: "영구 정지" },
  { value: "restricted", label: "제한됨" },
]

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "최근 가입순" },
  { value: "createdAt_asc", label: "오래된 가입순" },
  { value: "lastLogin_desc", label: "최근 로그인순" },
  { value: "points_desc", label: "포인트 높은순" },
  { value: "username_asc", label: "이름순" },
]

export default function UserManagementPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 상태 관리
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt_desc")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // 모달 상태
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPromoteDialog, setShowPromoteDialog] = useState(false)
  const [showDemoteDialog, setShowDemoteDialog] = useState(false)

  // 로딩 상태
  const [isPromoting, setIsPromoting] = useState(false)
  const [isDemoting, setIsDemoting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const ITEMS_PER_PAGE = 20

  // 페이지 접근 권한 확인
  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!isAdmin(userProfile)) {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/admin")
      return
    }

    fetchUsers()
  }, [user, userProfile, router, toast])

  // 필터링 및 정렬
  useEffect(() => {
    let result = [...users]

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.uid.toLowerCase().includes(query),
      )
    }

    // 역할 필터
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // 상태 필터
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter)
    }

    // 정렬
    const [field, direction] = sortBy.split("_")
    result.sort((a, b) => {
      let aValue = a[field as keyof UserProfile]
      let bValue = b[field as keyof UserProfile]

      if (field === "createdAt" || field === "lastLogin") {
        aValue = aValue ? (aValue as any).toMillis() : 0
        bValue = bValue ? (bValue as any).toMillis() : 0
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    setFilteredUsers(result)
  }, [users, searchQuery, roleFilter, statusFilter, sortBy])

  // 사용자 목록 불러오기
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const db = getFirestore()
      const usersRef = collection(db, "users")

      const usersQuery = query(usersRef, orderBy("createdAt", "desc"), limit(ITEMS_PER_PAGE))

      const usersSnapshot = await getDocs(usersQuery)
      const usersList: UserProfile[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        usersList.push({
          ...userData,
          uid: doc.id,
        })
      })

      setUsers(usersList)
      setTotalUsers(usersList.length)

      if (usersSnapshot.docs.length > 0) {
        setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1])
        setHasMore(usersSnapshot.docs.length === ITEMS_PER_PAGE)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "사용자 목록 로딩 실패",
        description: "사용자 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 더 많은 사용자 불러오기
  const loadMoreUsers = async () => {
    if (!lastVisible || !hasMore) return

    try {
      const db = getFirestore()
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(ITEMS_PER_PAGE))

      const usersSnapshot = await getDocs(usersQuery)
      const newUsers: UserProfile[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        newUsers.push({
          ...userData,
          uid: doc.id,
        })
      })

      setUsers([...users, ...newUsers])

      if (usersSnapshot.docs.length > 0) {
        setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1])
        setHasMore(usersSnapshot.docs.length === ITEMS_PER_PAGE)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more users:", error)
      toast({
        title: "추가 사용자 로딩 실패",
        description: "더 많은 사용자를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 관리자 권한 부여
  const promoteToAdmin = async () => {
    if (!selectedUser) return

    setIsPromoting(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      await updateDoc(userRef, {
        role: "admin",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "관리자 권한 부여 완료",
        description: `${selectedUser.username} 사용자에게 관리자 권한을 부여했습니다.`,
      })

      // 사용자 목록 업데이트
      setUsers(users.map((user) => (user.uid === selectedUser.uid ? { ...user, role: "admin" } : user)))
    } catch (error) {
      console.error("Error promoting user:", error)
      toast({
        title: "권한 부여 실패",
        description: "관리자 권한을 부여하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsPromoting(false)
      setShowPromoteDialog(false)
      setSelectedUser(null)
    }
  }

  // 관리자 권한 해제
  const demoteFromAdmin = async () => {
    if (!selectedUser) return

    setIsDemoting(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      await updateDoc(userRef, {
        role: "user",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "관리자 권한 해제 완료",
        description: `${selectedUser.username} 사용자의 관리자 권한을 해제했습니다.`,
      })

      // 사용자 목록 업데이트
      setUsers(users.map((user) => (user.uid === selectedUser.uid ? { ...user, role: "user" } : user)))
    } catch (error) {
      console.error("Error demoting user:", error)
      toast({
        title: "권한 해제 실패",
        description: "관리자 권한을 해제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDemoting(false)
      setShowDemoteDialog(false)
      setSelectedUser(null)
    }
  }

  // 사용자 선택 토글
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.uid))
    }
  }

  // 데이터 내보내기
  const exportUsers = async () => {
    setIsExporting(true)
    try {
      const dataToExport = filteredUsers.map((user) => ({
        id: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        points: user.points,
        level: user.level,
        tier: user.tier,
        createdAt: user.createdAt?.toDate?.()?.toISOString() || "",
        lastLogin: user.lastLogin?.toDate?.()?.toISOString() || "",
      }))

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users_export_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "내보내기 완료",
        description: "사용자 데이터가 성공적으로 내보내졌습니다.",
      })
    } catch (error) {
      console.error("Error exporting users:", error)
      toast({
        title: "내보내기 실패",
        description: "데이터를 내보내는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 사용자 역할 배지 렌더링
  const renderRoleBadge = (role: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <Crown className="w-3 h-3 mr-1" />
          최고 관리자
        </Badge>
      )
    } else if (role === "admin") {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <Shield className="w-3 h-3 mr-1" />
          관리자
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-gray-600">
          <User className="w-3 h-3 mr-1" />
          일반 사용자
        </Badge>
      )
    }
  }

  // 사용자 상태 배지 렌더링
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">활성</Badge>
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">일시 정지</Badge>
      case "banned":
        return <Badge className="bg-red-100 text-red-800 border-red-200">영구 정지</Badge>
      case "restricted":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">제한됨</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800 border-green-200">활성</Badge>
    }
  }

  // 날짜 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "없음"
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (error) {
      return "형식 오류"
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6">
          {/* 헤더 */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4 hover:bg-gray-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 대시보드로 돌아가기
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">사용자 관리</h1>
                <p className="text-gray-600 mt-2">
                  전체 {totalUsers}명의 사용자를 관리할 수 있습니다.
                  {isSuperAdmin(userProfile) && " 최고 관리자는 권한 변경도 가능합니다."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={exportUsers} disabled={isExporting} className="bg-white">
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  내보내기
                </Button>

                <Button onClick={() => fetchUsers()} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  새로고침
                </Button>
              </div>
            </div>
          </div>

          {/* 필터 및 검색 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* 검색 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="사용자명, 이메일, ID로 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                {/* 필터 */}
                <div className="flex gap-3">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_FILTERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 선택된 사용자 수 표시 */}
              {selectedUsers.length > 0 && (
                <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <span className="text-sm text-blue-700">{selectedUsers.length}명의 사용자가 선택됨</span>
                  <BulkActionsBar
                    selectedUsers={selectedUsers}
                    onClearSelection={() => setSelectedUsers([])}
                    onRefresh={fetchUsers}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 사용자 테이블 */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">사용자를 찾을 수 없습니다</h3>
                  <p className="text-gray-500 mt-2">
                    {searchQuery ? "검색 조건에 맞는 사용자가 없습니다." : "사용자 목록을 불러올 수 없습니다."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUsers.length === filteredUsers.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>레벨/포인트</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>마지막 로그인</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow
                          key={user.uid}
                          className={`hover:bg-gray-50 ${user.status !== "active" ? "bg-red-50/30" : ""}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.uid)}
                              onCheckedChange={() => toggleUserSelection(user.uid)}
                            />
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL || ""} alt={user.username} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                  {user.username ? user.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{user.username}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                <p className="text-xs text-gray-400">ID: {user.uid.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>{renderRoleBadge(user.role || "user", user.email)}</TableCell>

                          <TableCell>{renderStatusBadge(user.status)}</TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Lv. {user.level || 1}</div>
                              <div className="text-xs text-gray-500">{user.points || 0} 포인트</div>
                              <div className="text-xs text-gray-400">{user.tier || "Bronze"}</div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-gray-600">{formatDate(user.createdAt)}</TableCell>

                          <TableCell className="text-sm text-gray-600">{formatDate(user.lastLogin)}</TableCell>

                          <TableCell className="text-right">
                            {user.email === SUPER_ADMIN_EMAIL ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
                                <Crown className="w-3 h-3 mr-1" />
                                시스템 관리자
                              </Badge>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>사용자 관리</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setShowDetailModal(true)
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    상세 정보
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setShowEditModal(true)
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    정보 수정
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* 최고 관리자만 권한 변경 가능 */}
                                  {isSuperAdmin(userProfile) && (
                                    <>
                                      {user.role === "admin" ? (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedUser(user)
                                            setShowDemoteDialog(true)
                                          }}
                                          className="text-orange-600"
                                        >
                                          <UserX className="mr-2 h-4 w-4" />
                                          관리자 해제
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedUser(user)
                                            setShowPromoteDialog(true)
                                          }}
                                          className="text-blue-600"
                                        >
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          관리자 지정
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}

                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      // 제재 관리 모달 열기
                                    }}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    제재 관리
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* 더 보기 버튼 */}
              {hasMore && !isLoading && (
                <div className="p-6 text-center border-t">
                  <Button variant="outline" onClick={loadMoreUsers} className="bg-white">
                    더 많은 사용자 보기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* 모달들 */}
      {selectedUser && (
        <>
          <UserDetailModal user={selectedUser} open={showDetailModal} onOpenChange={setShowDetailModal} />

          <UserEditModal
            user={selectedUser}
            open={showEditModal}
            onOpenChange={setShowEditModal}
            onUserUpdated={(updatedUser) => {
              setUsers(users.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)))
            }}
          />
        </>
      )}

      {/* 관리자 권한 부여 다이얼로그 */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              관리자 권한 부여
            </DialogTitle>
            <DialogDescription>
              이 사용자에게 관리자 권한을 부여하시겠습니까? 관리자는 시스템의 모든 기능에 접근할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-lg">
              <Avatar>
                <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                <AvatarFallback>
                  {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser.username}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)} disabled={isPromoting}>
              취소
            </Button>
            <Button onClick={promoteToAdmin} disabled={isPromoting} className="bg-blue-600 hover:bg-blue-700">
              {isPromoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  관리자 지정
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 관리자 권한 해제 다이얼로그 */}
      <Dialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-500" />
              관리자 권한 해제
            </DialogTitle>
            <DialogDescription>
              이 사용자의 관리자 권한을 해제하시겠습니까? 해제 후에는 일반 사용자 권한만 갖게 됩니다.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-lg">
              <Avatar>
                <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                <AvatarFallback>
                  {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser.username}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDemoteDialog(false)} disabled={isDemoting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={demoteFromAdmin}
              disabled={isDemoting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDemoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  권한 해제
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
