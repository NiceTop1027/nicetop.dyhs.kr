"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  ArrowUpDown,
  Clock,
  LogIn,
  LogOut,
  Shield,
  Award,
  FileText,
  MessageSquare,
  Flag,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

// 활동 타입
type ActivityType =
  | "login"
  | "logout"
  | "challenge_solved"
  | "ctf_participation"
  | "post_created"
  | "comment_created"
  | "title_earned"
  | "sanction_received"
  | "sanction_expired"
  | "profile_updated"

// 활동 로그 타입
interface ActivityLog {
  id: string
  userId: string
  type: ActivityType
  timestamp: Date
  details: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

interface User {
  id: string
  username: string
  displayName: string
}

interface UserActivityLogProps {
  user: User
}

// 샘플 활동 로그 데이터
const generateSampleActivityLogs = (userId: string): ActivityLog[] => {
  const now = new Date()

  return [
    {
      id: "a1",
      userId,
      type: "login",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2시간 전
      details: "로그인 성공",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      id: "a2",
      userId,
      type: "challenge_solved",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 1.5), // 1.5시간 전
      details: '워게임 문제 "버퍼 오버플로우 기초" 해결',
      metadata: {
        challengeId: "c123",
        points: 100,
        category: "pwn",
      },
    },
    {
      id: "a3",
      userId,
      type: "post_created",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60), // 1시간 전
      details: '게시글 "버퍼 오버플로우 문제 풀이 방법" 작성',
      metadata: {
        postId: "p456",
        category: "writeups",
      },
    },
    {
      id: "a4",
      userId,
      type: "ctf_participation",
      timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30분 전
      details: 'CTF 대회 "해킹 마스터즈 2023" 참가 등록',
      metadata: {
        ctfId: "ctf789",
        teamName: "Security Ninjas",
      },
    },
    {
      id: "a5",
      userId,
      type: "title_earned",
      timestamp: new Date(now.getTime() - 1000 * 60 * 15), // 15분 전
      details: '칭호 "문제 해결사" 획득',
      metadata: {
        titleId: "t3",
        condition: "50개 이상의 문제 해결",
      },
    },
    {
      id: "a6",
      userId,
      type: "logout",
      timestamp: new Date(now.getTime() - 1000 * 60 * 5), // 5분 전
      details: "로그아웃",
      ipAddress: "192.168.1.1",
    },
    {
      id: "a7",
      userId,
      type: "login",
      timestamp: new Date(), // 현재
      details: "로그인 성공",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  ]
}

export function UserActivityLog({ user }: UserActivityLogProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // 샘플 데이터 로드
  useEffect(() => {
    const logs = generateSampleActivityLogs(user.id)
    setActivityLogs(logs)
    setFilteredLogs(logs)
  }, [user.id])

  // 필터링 및 정렬 로직
  useEffect(() => {
    let result = [...activityLogs]

    // 타입 필터링
    if (typeFilter !== "all") {
      result = result.filter((log) => log.type === typeFilter)
    }

    // 정렬
    result.sort((a, b) => {
      const comparison = a.timestamp.getTime() - b.timestamp.getTime()
      return sortDirection === "asc" ? comparison : -comparison
    })

    setFilteredLogs(result)
  }, [activityLogs, typeFilter, sortDirection])

  // 정렬 방향 토글
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  // 활동 타입에 따른 아이콘 렌더링
  const renderActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4 text-green-500" />
      case "logout":
        return <LogOut className="h-4 w-4 text-muted-foreground" />
      case "challenge_solved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "ctf_participation":
        return <Flag className="h-4 w-4 text-purple-500" />
      case "post_created":
        return <FileText className="h-4 w-4 text-amber-500" />
      case "comment_created":
        return <MessageSquare className="h-4 w-4 text-teal-500" />
      case "title_earned":
        return <Award className="h-4 w-4 text-yellow-500" />
      case "sanction_received":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "sanction_expired":
        return <Shield className="h-4 w-4 text-green-500" />
      case "profile_updated":
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // 활동 타입에 따른 배지 렌더링
  const renderActivityBadge = (type: ActivityType) => {
    switch (type) {
      case "login":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            로그인
          </Badge>
        )
      case "logout":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            로그아웃
          </Badge>
        )
      case "challenge_solved":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            문제 해결
          </Badge>
        )
      case "ctf_participation":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            CTF 참가
          </Badge>
        )
      case "post_created":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            게시글 작성
          </Badge>
        )
      case "comment_created":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
            댓글 작성
          </Badge>
        )
      case "title_earned":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            칭호 획득
          </Badge>
        )
      case "sanction_received":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            제재 적용
          </Badge>
        )
      case "sanction_expired":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            제재 만료
          </Badge>
        )
      case "profile_updated":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            프로필 수정
          </Badge>
        )
    }
  }

  // 상대적 시간 표시
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) {
      return `${diffSec}초 전`
    } else if (diffMin < 60) {
      return `${diffMin}분 전`
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`
    } else {
      return `${diffDay}일 전`
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="활동 유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 활동</SelectItem>
            <SelectItem value="login">로그인</SelectItem>
            <SelectItem value="logout">로그아웃</SelectItem>
            <SelectItem value="challenge_solved">문제 해결</SelectItem>
            <SelectItem value="ctf_participation">CTF 참가</SelectItem>
            <SelectItem value="post_created">게시글 작성</SelectItem>
            <SelectItem value="comment_created">댓글 작성</SelectItem>
            <SelectItem value="title_earned">칭호 획득</SelectItem>
            <SelectItem value="sanction_received">제재 적용</SelectItem>
            <SelectItem value="sanction_expired">제재 만료</SelectItem>
            <SelectItem value="profile_updated">프로필 수정</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" onClick={toggleSortDirection} className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>시간순</span>
          <ArrowUpDown className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">유형</TableHead>
              <TableHead>세부 내용</TableHead>
              <TableHead className="text-right">시간</TableHead>
              <TableHead className="text-right">IP 주소</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  활동 기록이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderActivityIcon(log.type)}
                      {renderActivityBadge(log.type)}
                    </div>
                  </TableCell>
                  <TableCell>{log.details}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm">{formatRelativeTime(log.timestamp)}</span>
                      <span className="text-xs text-muted-foreground">{log.timestamp.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{log.ipAddress || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
