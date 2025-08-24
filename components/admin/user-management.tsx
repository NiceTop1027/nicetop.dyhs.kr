"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Search, MoreHorizontal, Shield, Award, UserCog, Clock } from "lucide-react"
import { TitleEditor } from "./title-editor"
import { SanctionManager } from "./sanction-manager"
import { UserActivityLog } from "./user-activity-log"

// 사용자 상태 타입
type UserStatus = "active" | "suspended" | "banned" | "restricted"

// 칭호 타입
interface Title {
  id: string
  name: string
  description: string
  color: string
  backgroundColor?: string
  borderColor?: string
  icon?: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  unlockCondition?: string
}

// 제재 타입
interface Sanction {
  id: string
  type: "warning" | "restriction" | "suspension" | "ban"
  reason: string
  appliedBy: string
  appliedAt: Date
  expiresAt?: Date
  isActive: boolean
  details?: string
}

// 사용자 타입
interface User {
  id: string
  username: string
  email: string
  displayName: string
  role: "user" | "moderator" | "admin"
  status: UserStatus
  joinedAt: Date
  lastActive: Date
  titles: Title[]
  activeTitle?: Title
  sanctions: Sanction[]
  points: number
  level: number
  tier: string
  profileImage?: string
}

// 샘플 칭호 데이터
const sampleTitles: Title[] = [
  {
    id: "1",
    name: "해킹 마스터",
    description: "모든 워게임 문제를 해결한 사용자",
    color: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: "rgba(255, 215, 0, 0.5)",
    icon: "trophy",
    rarity: "legendary",
    unlockCondition: "모든 워게임 문제 해결",
  },
  {
    id: "2",
    name: "CTF 챔피언",
    description: "CTF 대회에서 1위를 차지한 사용자",
    color: "#FF4500",
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderColor: "rgba(255, 69, 0, 0.5)",
    icon: "award",
    rarity: "epic",
    unlockCondition: "CTF 대회 1위",
  },
  {
    id: "3",
    name: "문제 해결사",
    description: "50개 이상의 문제를 해결한 사용자",
    color: "#1E90FF",
    backgroundColor: "rgba(30, 144, 255, 0.1)",
    borderColor: "rgba(30, 144, 255, 0.5)",
    icon: "zap",
    rarity: "rare",
    unlockCondition: "50개 이상 문제 해결",
  },
  {
    id: "4",
    name: "신입 해커",
    description: "첫 문제를 해결한 사용자",
    color: "#32CD32",
    backgroundColor: "rgba(50, 205, 50, 0.1)",
    borderColor: "rgba(50, 205, 50, 0.5)",
    icon: "user",
    rarity: "common",
    unlockCondition: "첫 문제 해결",
  },
  {
    id: "5",
    name: "커뮤니티 기여자",
    description: "커뮤니티에 적극적으로 기여한 사용자",
    color: "#9370DB",
    backgroundColor: "rgba(147, 112, 219, 0.1)",
    borderColor: "rgba(147, 112, 219, 0.5)",
    icon: "users",
    rarity: "uncommon",
    unlockCondition: "커뮤니티 기여",
  },
]

// 샘플 사용자 데이터
const sampleUsers: User[] = [
  {
    id: "1",
    username: "hackmaster",
    email: "hackmaster@example.com",
    displayName: "해킹마스터",
    role: "user",
    status: "active",
    joinedAt: new Date("2023-01-15"),
    lastActive: new Date("2023-06-20"),
    titles: [sampleTitles[0], sampleTitles[2]],
    activeTitle: sampleTitles[0],
    sanctions: [],
    points: 1250,
    level: 25,
    tier: "Diamond",
    profileImage: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "2",
    username: "securityninja",
    email: "ninja@example.com",
    displayName: "보안닌자",
    role: "moderator",
    status: "active",
    joinedAt: new Date("2023-02-10"),
    lastActive: new Date("2023-06-19"),
    titles: [sampleTitles[1], sampleTitles[4]],
    activeTitle: sampleTitles[1],
    sanctions: [],
    points: 980,
    level: 20,
    tier: "Platinum",
    profileImage: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "3",
    username: "troublemaker",
    email: "trouble@example.com",
    displayName: "문제아",
    role: "user",
    status: "suspended",
    joinedAt: new Date("2023-03-05"),
    lastActive: new Date("2023-06-15"),
    titles: [sampleTitles[3]],
    activeTitle: sampleTitles[3],
    sanctions: [
      {
        id: "s1",
        type: "suspension",
        reason: "부적절한 언어 사용",
        appliedBy: "admin",
        appliedAt: new Date("2023-06-15"),
        expiresAt: new Date("2023-06-22"),
        isActive: true,
        details: "커뮤니티 가이드라인 위반",
      },
    ],
    points: 350,
    level: 8,
    tier: "Silver",
    profileImage: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "4",
    username: "newbie",
    email: "newbie@example.com",
    displayName: "뉴비해커",
    role: "user",
    status: "active",
    joinedAt: new Date("2023-05-20"),
    lastActive: new Date("2023-06-18"),
    titles: [sampleTitles[3]],
    activeTitle: sampleTitles[3],
    sanctions: [],
    points: 120,
    level: 3,
    tier: "Bronze",
    profileImage: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "5",
    username: "banneduser",
    email: "banned@example.com",
    displayName: "영구정지됨",
    role: "user",
    status: "banned",
    joinedAt: new Date("2023-01-05"),
    lastActive: new Date("2023-05-10"),
    titles: [],
    sanctions: [
      {
        id: "s2",
        type: "ban",
        reason: "계정 해킹 시도",
        appliedBy: "admin",
        appliedAt: new Date("2023-05-10"),
        isActive: true,
        details: "다른 사용자의 계정 해킹 시도",
      },
    ],
    points: 450,
    level: 10,
    tier: "Gold",
    profileImage: "/placeholder.svg?height=40&width=40",
  },
]

export function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(sampleUsers)
  const [filteredUsers, setFilteredUsers] = useState<User[]>(sampleUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false)
  const [isSanctionDialogOpen, setIsSanctionDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)

  // 편집 상태
  const [editName, setEditName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editEmail, setEditEmail] = useState("")

  // 필터링 로직
  useEffect(() => {
    let result = users

    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.displayName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      )
    }

    // 상태 필터링
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(result)
  }, [users, searchQuery, statusFilter])

  // 사용자 선택 핸들러
  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setEditName(user.displayName)
    setEditUsername(user.username)
    setEditEmail(user.email)
  }

  // 사용자 정보 업데이트 핸들러
  const handleUpdateUser = () => {
    if (!selectedUser) return

    const updatedUsers = users.map((user) => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          displayName: editName,
          username: editUsername,
          email: editEmail,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setIsEditDialogOpen(false)
    toast({
      title: "사용자 정보 업데이트됨",
      description: `${editName}(${editUsername})의 정보가 성공적으로 업데이트되었습니다.`,
    })
  }

  // 칭호 관리 핸들러
  const handleManageTitles = (user: User) => {
    setSelectedUser(user)
    setIsTitleDialogOpen(true)
  }

  // 제재 관리 핸들러
  const handleManageSanctions = (user: User) => {
    setSelectedUser(user)
    setIsSanctionDialogOpen(true)
  }

  // 활동 로그 보기 핸들러
  const handleViewActivity = (user: User) => {
    setSelectedUser(user)
    setIsActivityDialogOpen(true)
  }

  // 칭호 업데이트 핸들러
  const handleUpdateTitles = (userId: string, titles: Title[], activeTitle?: Title) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        return {
          ...user,
          titles,
          activeTitle,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setIsTitleDialogOpen(false)
    toast({
      title: "칭호 업데이트됨",
      description: `사용자의 칭호가 성공적으로 업데이트되었습니다.`,
    })
  }

  // 제재 업데이트 핸들러
  const handleUpdateSanctions = (userId: string, sanctions: Sanction[], newStatus: UserStatus) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        return {
          ...user,
          sanctions,
          status: newStatus,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setIsSanctionDialogOpen(false)
    toast({
      title: "제재 업데이트됨",
      description: `사용자의 제재 정보가 성공적으로 업데이트되었습니다.`,
    })
  }

  // 상태에 따른 배지 렌더링
  const renderStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            활성
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            일시 정지
          </Badge>
        )
      case "banned":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            영구 정지
          </Badge>
        )
      case "restricted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            제한됨
          </Badge>
        )
      default:
        return <Badge variant="outline">알 수 없음</Badge>
    }
  }

  // 칭호 렌더링
  const renderTitle = (title?: Title) => {
    if (!title) return null

    const rarityColors = {
      common: "bg-slate-100 text-slate-800 border-slate-200",
      uncommon: "bg-green-50 text-green-700 border-green-200",
      rare: "bg-blue-50 text-blue-700 border-blue-200",
      epic: "bg-purple-50 text-purple-700 border-purple-200",
      legendary: "bg-amber-50 text-amber-700 border-amber-200",
    }

    return (
      <Badge
        variant="outline"
        className={`${rarityColors[title.rarity]} px-2 py-0.5`}
        style={{
          color: title.color,
          backgroundColor: title.backgroundColor,
          borderColor: title.borderColor,
        }}
      >
        {title.name}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 bg-background text-foreground min-h-screen p-6">
      {/* 필터 및 검색 */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사용자명, 이메일 또는 닉네임으로 검색..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="suspended">일시 정지</SelectItem>
              <SelectItem value="banned">영구 정지</SelectItem>
              <SelectItem value="restricted">제한됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 사용자 테이블 */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>칭호</TableHead>
              <TableHead>레벨/티어</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>마지막 활동</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.status !== "active" ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.profileImage && (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img
                            src={user.profileImage || "/placeholder.svg"}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div>{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="default" className="bg-red-500">
                        관리자
                      </Badge>
                    ) : user.role === "moderator" ? (
                      <Badge variant="default" className="bg-blue-500">
                        모더레이터
                      </Badge>
                    ) : (
                      <Badge variant="outline">사용자</Badge>
                    )}
                  </TableCell>
                  <TableCell>{renderStatusBadge(user.status)}</TableCell>
                  <TableCell>{renderTitle(user.activeTitle)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>Lv. {user.level}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.tier} ({user.points}점)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.joinedAt.toLocaleDateString()}</TableCell>
                  <TableCell>{user.lastActive.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">메뉴 열기</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>사용자 관리</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            handleSelectUser(user)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          정보 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageTitles(user)}>
                          <Award className="mr-2 h-4 w-4" />
                          칭호 관리
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleManageSanctions(user)}>
                          <Shield className="mr-2 h-4 w-4" />
                          제재 관리
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewActivity(user)}>
                          <Clock className="mr-2 h-4 w-4" />
                          활동 로그
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 사용자 정보 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
            <DialogDescription>사용자의 기본 정보를 수정합니다. 변경 사항은 즉시 적용됩니다.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right">
                  닉네임
                </Label>
                <Input
                  id="displayName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  사용자명
                </Label>
                <Input
                  id="username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateUser}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 칭호 관리 다이얼로그 */}
      <Dialog open={isTitleDialogOpen} onOpenChange={setIsTitleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>칭호 관리</DialogTitle>
            <DialogDescription>사용자에게 칭호를 부여하거나 활성 칭호를 변경합니다.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <TitleEditor
              user={selectedUser}
              availableTitles={sampleTitles}
              onSave={(titles, activeTitle) => handleUpdateTitles(selectedUser.id, titles, activeTitle)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 제재 관리 다이얼로그 */}
      <Dialog open={isSanctionDialogOpen} onOpenChange={setIsSanctionDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>제재 관리</DialogTitle>
            <DialogDescription>사용자에게 경고, 제한, 정지 등의 제재를 적용합니다.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <SanctionManager
              user={selectedUser}
              onSave={(sanctions, newStatus) => handleUpdateSanctions(selectedUser.id, sanctions, newStatus)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 활동 로그 다이얼로그 */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>사용자 활동 로그</DialogTitle>
            <DialogDescription>사용자의 최근 활동 및 로그인 기록을 확인합니다.</DialogDescription>
          </DialogHeader>
          {selectedUser && <UserActivityLog user={selectedUser} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
