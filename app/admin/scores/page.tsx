"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Award,
  TrendingUp,
  Users,
  Trophy,
  ArrowLeft,
  Search,
  Edit,
  Download,
  Upload,
  Loader2,
  RefreshCw,
  Eye,
  Settings,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  limit,
  getFirestore,
  Timestamp,
} from "firebase/firestore"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { isAdmin } from "@/lib/admin-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"

// 사용자 점수 타입 정의
interface UserScore {
  id: string
  userId: string
  userName: string
  userEmail: string
  photoURL?: string
  totalScore: number
  wargameScore: number
  ctfScore: number
  curriculumScore: number
  rank: number
  lastUpdated: any
  achievements: string[]
  tier: string
  seasonId?: string
  level: number
  exp: number
  streak: number
  isActive: boolean
  joinDate: any
  lastLogin: any
  role: string
}

// 점수 히스토리 타입
interface ScoreHistory {
  id: string
  userId: string
  userName: string
  scoreType: string
  points: number
  reason: string
  challengeId?: string
  challengeName?: string
  timestamp: any
  adminId?: string
  adminName?: string
  seasonId?: string
}

// 점수 조정 타입
interface ScoreAdjustment {
  userId: string
  userName: string
  scoreType: string
  adjustment: number
  reason: string
}

export default function AdminScoresPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [userScores, setUserScores] = useState<UserScore[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserScore | null>(null)
  const [adjustment, setAdjustment] = useState<ScoreAdjustment>({
    userId: "",
    userName: "",
    scoreType: "total",
    adjustment: 0,
    reason: "",
  })
  const [filterTier, setFilterTier] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [sortBy, setSortBy] = useState("totalScore")
  const [sortOrder, setSortOrder] = useState("desc")

  // Firebase 인스턴스
  const db = getFirestore()

  // 관리자 권한 확인
  useEffect(() => {
    if (!isAdmin(userProfile)) {
      router.push("/")
      return
    }
    fetchData()
  }, [userProfile, router])

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      console.log("Fetching user data from Firebase...")

      // users 컬렉션에서 모든 사용자 데이터 가져오기
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, orderBy("createdAt", "desc"))
      const usersSnapshot = await getDocs(usersQuery)

      console.log("Users snapshot size:", usersSnapshot.size)

      const scoresData: UserScore[] = []

      usersSnapshot.forEach((docSnapshot, index) => {
        const userData = docSnapshot.data()
        console.log("User data:", userData)

        // 사용자 점수 데이터 구성
        const userScore: UserScore = {
          id: docSnapshot.id,
          userId: docSnapshot.id,
          userName: userData.username || userData.displayName || userData.name || "이름 없음",
          userEmail: userData.email || "이메일 없음",
          photoURL: userData.photoURL || "",
          totalScore: userData.points || userData.totalScore || 0,
          wargameScore: userData.wargamePoints || userData.wargameScore || 0,
          ctfScore: userData.ctfPoints || userData.ctfScore || 0,
          curriculumScore: userData.curriculumScore || 0,
          rank: 0, // 나중에 계산
          lastUpdated: userData.updatedAt || userData.lastLogin || userData.createdAt,
          achievements: userData.achievements || [],
          tier: userData.tier || "Bronze",
          seasonId: userData.seasonId,
          level: userData.level || 1,
          exp: userData.exp || 0,
          streak: userData.streak || 0,
          isActive: userData.status !== "banned" && userData.status !== "suspended",
          joinDate: userData.createdAt,
          lastLogin: userData.lastLogin,
          role: userData.role || "user",
        }

        scoresData.push(userScore)
      })

      // 총점 기준으로 정렬
      scoresData.sort((a, b) => b.totalScore - a.totalScore)

      // 순위 계산
      scoresData.forEach((user, index) => {
        user.rank = index + 1
      })

      setUserScores(scoresData)
      console.log("Loaded users:", scoresData.length)

      // 점수 히스토리 가져오기
      try {
        const historyRef = collection(db, "score_history")
        const historyQuery = query(historyRef, orderBy("timestamp", "desc"), limit(100))
        const historySnapshot = await getDocs(historyQuery)

        const historyData: ScoreHistory[] = []
        historySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          historyData.push({
            id: docSnapshot.id,
            userId: data.userId || "",
            userName: data.userName || "",
            scoreType: data.scoreType || "manual",
            points: data.points || 0,
            reason: data.reason || "",
            challengeId: data.challengeId,
            challengeName: data.challengeName,
            timestamp: data.timestamp,
            adminId: data.adminId,
            adminName: data.adminName,
            seasonId: data.seasonId,
          })
        })
        setScoreHistory(historyData)
      } catch (historyError) {
        console.log("Score history collection not found, creating empty array")
        setScoreHistory([])
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "데이터 로딩 오류",
        description: `데이터를 불러오지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 점수 조정
  const handleScoreAdjustment = async () => {
    if (!selectedUser || !adjustment.reason.trim()) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 올바르게 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      // 점수 히스토리 추가
      await addDoc(collection(db, "score_history"), {
        userId: selectedUser.userId,
        userName: selectedUser.userName,
        scoreType: adjustment.scoreType,
        points: adjustment.adjustment,
        reason: adjustment.reason,
        timestamp: Timestamp.now(),
        adminId: user?.uid,
        adminName: userProfile?.username || "관리자",
      })

      // 사용자 문서 업데이트
      const userRef = doc(db, "users", selectedUser.userId)
      const updateData: any = {
        updatedAt: Timestamp.now(),
      }

      // 점수 타입에 따른 업데이트
      if (adjustment.scoreType === "total") {
        updateData.points = selectedUser.totalScore + adjustment.adjustment
      } else if (adjustment.scoreType === "wargame") {
        updateData.wargamePoints = selectedUser.wargameScore + adjustment.adjustment
        updateData.points = selectedUser.totalScore + adjustment.adjustment
      } else if (adjustment.scoreType === "ctf") {
        updateData.ctfPoints = selectedUser.ctfScore + adjustment.adjustment
        updateData.points = selectedUser.totalScore + adjustment.adjustment
      } else if (adjustment.scoreType === "curriculum") {
        updateData.curriculumScore = selectedUser.curriculumScore + adjustment.adjustment
        updateData.points = selectedUser.totalScore + adjustment.adjustment
      }

      await updateDoc(userRef, updateData)

      toast({
        title: "점수 조정 완료",
        description: `${selectedUser.userName}님의 점수가 ${adjustment.adjustment > 0 ? "+" : ""}${adjustment.adjustment}점 조정되었습니다.`,
      })

      // 데이터 새로고침
      fetchData()
      setAdjustmentDialogOpen(false)
      setSelectedUser(null)
      setAdjustment({
        userId: "",
        userName: "",
        scoreType: "total",
        adjustment: 0,
        reason: "",
      })
    } catch (error: any) {
      console.error("Error adjusting score:", error)
      toast({
        title: "점수 조정 오류",
        description: `점수를 조정하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 사용자 상태 토글
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        status: currentStatus ? "suspended" : "active",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "사용자 상태 변경",
        description: `사용자 상태가 ${currentStatus ? "비활성화" : "활성화"}되었습니다.`,
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "상태 변경 실패",
        description: `사용자 상태를 변경하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 검색 및 필터링
  const filteredUsers = userScores.filter((user) => {
    const matchesSearch =
      user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.userEmail.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTier = filterTier === "all" || user.tier.toLowerCase() === filterTier.toLowerCase()
    const matchesRole = filterRole === "all" || user.role === filterRole

    return matchesSearch && matchesTier && matchesRole
  })

  // 정렬
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortBy as keyof UserScore]
    let bValue = b[sortBy as keyof UserScore]

    if (typeof aValue === "string") aValue = aValue.toLowerCase()
    if (typeof bValue === "string") bValue = bValue.toLowerCase()

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // 날짜 포맷
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 정보 없음"
    try {
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else {
        date = new Date(timestamp)
      }
      return format(date, "yyyy.MM.dd HH:mm", { locale: ko })
    } catch (error) {
      return "날짜 정보 오류"
    }
  }

  // 티어 색상
  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "diamond":
        return "bg-blue-500 text-white"
      case "platinum":
        return "bg-gray-400 text-white"
      case "gold":
        return "bg-yellow-500 text-white"
      case "silver":
        return "bg-gray-300 text-black"
      case "bronze":
        return "bg-orange-600 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  // 레벨 진행률 계산
  const getLevelProgress = (exp: number, level: number) => {
    const expForNextLevel = level * 100
    const currentLevelExp = exp % 100
    return (currentLevelExp / 100) * 100
  }

  if (!isAdmin(userProfile)) {
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
                <p className="text-muted-foreground">점수 데이터를 불러오는 중입니다...</p>
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
                <h1 className="text-3xl font-bold">점수 관리</h1>
                <p className="text-muted-foreground mt-1">사용자 점수 및 랭킹을 관리합니다.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                내보내기
              </Button>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                가져오기
              </Button>
            </div>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="rankings">랭킹</TabsTrigger>
              <TabsTrigger value="history">히스토리</TabsTrigger>
              <TabsTrigger value="analytics">분석</TabsTrigger>
              <TabsTrigger value="bulk">일괄 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* 통계 카드 */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userScores.length}</div>
                    <p className="text-xs text-muted-foreground">활성: {userScores.filter((u) => u.isActive).length}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {userScores.length > 0
                        ? Math.round(userScores.reduce((sum, user) => sum + user.totalScore, 0) / userScores.length)
                        : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">전체 평균</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">최고 점수</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {userScores.length > 0 ? Math.max(...userScores.map((user) => user.totalScore)) : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">개인 최고</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">최근 활동</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{scoreHistory.length}</div>
                    <p className="text-xs text-muted-foreground">최근 기록</p>
                  </CardContent>
                </Card>
              </div>

              {/* 상위 사용자 */}
              <Card>
                <CardHeader>
                  <CardTitle>상위 사용자</CardTitle>
                  <CardDescription>점수 기준 상위 10명</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순위</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>총점</TableHead>
                        <TableHead>워게임</TableHead>
                        <TableHead>CTF</TableHead>
                        <TableHead>커리큘럼</TableHead>
                        <TableHead>티어</TableHead>
                        <TableHead>레벨</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userScores.slice(0, 10).map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.userName} />
                                <AvatarFallback>{user.userName.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.userName}</div>
                                <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">{user.totalScore}</TableCell>
                          <TableCell>{user.wargameScore}</TableCell>
                          <TableCell>{user.ctfScore}</TableCell>
                          <TableCell>{user.curriculumScore}</TableCell>
                          <TableCell>
                            <Badge className={getTierColor(user.tier)}>{user.tier}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Lv.{user.level}</span>
                              <Progress value={getLevelProgress(user.exp, user.level)} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setAdjustment({
                                  userId: user.userId,
                                  userName: user.userName,
                                  scoreType: "total",
                                  adjustment: 0,
                                  reason: "",
                                })
                                setAdjustmentDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rankings" className="space-y-4">
              {/* 검색 및 필터 */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="사용자 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="티어" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 티어</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="역할" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 역할</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="user">일반 사용자</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalScore">총점</SelectItem>
                    <SelectItem value="wargameScore">워게임</SelectItem>
                    <SelectItem value="ctfScore">CTF</SelectItem>
                    <SelectItem value="level">레벨</SelectItem>
                    <SelectItem value="userName">이름</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 전체 랭킹 */}
              <Card>
                <CardHeader>
                  <CardTitle>전체 랭킹 ({sortedUsers.length}명)</CardTitle>
                  <CardDescription>모든 사용자의 점수 랭킹</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순위</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>총점</TableHead>
                        <TableHead>워게임</TableHead>
                        <TableHead>CTF</TableHead>
                        <TableHead>커리큘럼</TableHead>
                        <TableHead>티어</TableHead>
                        <TableHead>레벨</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>최근 로그인</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">#{user.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.userName} />
                                <AvatarFallback>{user.userName.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.userName}</div>
                                <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                                {user.role === "admin" && (
                                  <Badge variant="outline" className="text-xs">
                                    관리자
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">{user.totalScore}</TableCell>
                          <TableCell>{user.wargameScore}</TableCell>
                          <TableCell>{user.ctfScore}</TableCell>
                          <TableCell>{user.curriculumScore}</TableCell>
                          <TableCell>
                            <Badge className={getTierColor(user.tier)}>{user.tier}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Lv.{user.level}</span>
                              <Progress value={getLevelProgress(user.exp, user.level)} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.isActive}
                                onCheckedChange={() => toggleUserStatus(user.userId, user.isActive)}
                                size="sm"
                              />
                              <span className="text-xs">{user.isActive ? "활성" : "비활성"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.lastLogin)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setAdjustment({
                                    userId: user.userId,
                                    userName: user.userName,
                                    scoreType: "total",
                                    adjustment: 0,
                                    reason: "",
                                  })
                                  setAdjustmentDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => router.push(`/user/${user.userId}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>점수 변경 히스토리</CardTitle>
                  <CardDescription>최근 점수 변경 내역</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>관리자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoreHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>{formatDate(history.timestamp)}</TableCell>
                          <TableCell className="font-medium">{history.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {history.scoreType === "wargame" && "워게임"}
                              {history.scoreType === "ctf" && "CTF"}
                              {history.scoreType === "curriculum" && "커리큘럼"}
                              {history.scoreType === "manual" && "수동"}
                              {history.scoreType === "total" && "총점"}
                            </Badge>
                          </TableCell>
                          <TableCell className={history.points > 0 ? "text-green-600" : "text-red-600"}>
                            {history.points > 0 ? "+" : ""}
                            {history.points}
                          </TableCell>
                          <TableCell>{history.reason}</TableCell>
                          <TableCell>{history.adminName || "시스템"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>티어 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {["Diamond", "Platinum", "Gold", "Silver", "Bronze"].map((tier) => {
                        const count = userScores.filter((u) => u.tier === tier).length
                        const percentage = userScores.length > 0 ? (count / userScores.length) * 100 : 0
                        return (
                          <div key={tier} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getTierColor(tier)}>{tier}</Badge>
                              <span className="text-sm">{count}명</span>
                            </div>
                            <Progress value={percentage} className="w-24 h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>활동 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>활성 사용자</span>
                        <span className="font-bold">{userScores.filter((u) => u.isActive).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>비활성 사용자</span>
                        <span className="font-bold">{userScores.filter((u) => !u.isActive).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>관리자</span>
                        <span className="font-bold">{userScores.filter((u) => u.role === "admin").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>평균 레벨</span>
                        <span className="font-bold">
                          {userScores.length > 0
                            ? (userScores.reduce((sum, u) => sum + u.level, 0) / userScores.length).toFixed(1)
                            : 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>일괄 점수 관리</CardTitle>
                  <CardDescription>여러 사용자의 점수를 한번에 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">일괄 관리 기능</h3>
                    <p className="text-muted-foreground mt-2">
                      CSV 파일 업로드, 일괄 점수 조정, 티어 재계산 등의 기능이 곧 추가될 예정입니다.
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        CSV 업로드
                      </Button>
                      <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        티어 재계산
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* 점수 조정 다이얼로그 */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>점수 조정</DialogTitle>
            <DialogDescription>{selectedUser?.userName}님의 점수를 조정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scoreType">점수 유형</Label>
              <Select
                value={adjustment.scoreType}
                onValueChange={(value: any) => setAdjustment({ ...adjustment, scoreType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">총점</SelectItem>
                  <SelectItem value="wargame">워게임</SelectItem>
                  <SelectItem value="ctf">CTF</SelectItem>
                  <SelectItem value="curriculum">커리큘럼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjustment">조정 점수</Label>
              <Input
                id="adjustment"
                type="number"
                value={adjustment.adjustment}
                onChange={(e) => setAdjustment({ ...adjustment, adjustment: Number.parseInt(e.target.value) || 0 })}
                placeholder="양수는 증가, 음수는 감소"
              />
            </div>
            <div>
              <Label htmlFor="reason">조정 사유</Label>
              <Textarea
                id="reason"
                value={adjustment.reason}
                onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                placeholder="점수 조정 사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleScoreAdjustment}>조정 적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
