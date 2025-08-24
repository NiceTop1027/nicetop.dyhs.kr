"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import type { UserProfile, Affiliation, Sanction } from "@/lib/user-types"
import {
  User,
  Shield,
  School,
  Clock,
  Trophy,
  Calendar,
  Mail,
  MapPin,
  Globe,
  Award,
  Activity,
  TrendingUp,
  Users,
} from "lucide-react"

interface UserDetailModalProps {
  user: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailModal({ user, open, onOpenChange }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // 사용자 상태에 따른 배지 렌더링
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

  // 제재 타입에 따른 배지 렌더링
  const renderSanctionBadge = (type: string) => {
    switch (type) {
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">경고</Badge>
      case "restriction":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">제한</Badge>
      case "suspension":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">일시 정지</Badge>
      case "ban":
        return <Badge className="bg-red-100 text-red-800 border-red-200">영구 정지</Badge>
      default:
        return <Badge variant="outline">알 수 없음</Badge>
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

  // 레벨 진행률 계산
  const calculateLevelProgress = (level: number, exp: number) => {
    const currentLevelExp = (level - 1) * 100
    const nextLevelExp = level * 100
    const progress = ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100
    return Math.max(0, Math.min(100, progress))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.photoURL || ""} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                {user.username ? user.username.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="stats">통계</TabsTrigger>
            <TabsTrigger value="affiliations">소속</TabsTrigger>
            <TabsTrigger value="sanctions">제재</TabsTrigger>
            <TabsTrigger value="activity">활동</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">사용자 ID</Label>
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{user.uid}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">이메일</Label>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {user.email || "없음"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">상태</Label>
                      <div className="mt-1">{renderStatusBadge(user.status)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">가입일</Label>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">마지막 로그인</Label>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDate(user.lastLogin)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">역할</Label>
                      <div className="mt-1">
                        {user.role === "admin" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Shield className="w-3 h-3 mr-1" />
                            관리자
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <User className="w-3 h-3 mr-1" />
                            일반 사용자
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {user.bio && (
                  <div>
                    <Label className="text-sm text-gray-500">자기소개</Label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">{user.bio}</p>
                  </div>
                )}

                {(user.location || user.website) && (
                  <div className="grid grid-cols-2 gap-4">
                    {user.location && (
                      <div>
                        <Label className="text-sm text-gray-500">위치</Label>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {user.location}
                        </p>
                      </div>
                    )}
                    {user.website && (
                      <div>
                        <Label className="text-sm text-gray-500">웹사이트</Label>
                        <p className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a
                            href={user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {user.website}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 레벨 및 포인트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  레벨 & 포인트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{user.level || 1}</div>
                    <div className="text-sm text-gray-500">레벨</div>
                    <Progress value={calculateLevelProgress(user.level || 1, user.exp || 0)} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{user.points || 0}</div>
                    <div className="text-sm text-gray-500">총 포인트</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{user.tier || "Bronze"}</div>
                    <div className="text-sm text-gray-500">티어</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 팔로우 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  소셜 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{user.followersCount || 0}</div>
                    <div className="text-sm text-gray-500">팔로워</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{user.followingCount || 0}</div>
                    <div className="text-sm text-gray-500">팔로잉</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  문제 해결 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500">해결한 문제 수</Label>
                      <div className="text-2xl font-bold text-green-600">{user.solvedChallenges?.length || 0}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">워게임 포인트</Label>
                      <div className="text-xl font-semibold text-blue-600">{user.wargamePoints || 0}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">CTF 포인트</Label>
                      <div className="text-xl font-semibold text-purple-600">{user.ctfPoints || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500">연속 로그인</Label>
                      <div className="text-xl font-semibold text-orange-600">{user.streak || 0}일</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">경험치</Label>
                      <div className="text-xl font-semibold text-indigo-600">{user.exp || 0} XP</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">랭킹</Label>
                      <div className="text-xl font-semibold text-red-600">#{user.rank || "미정"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 업적 */}
            {user.achievements && user.achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    업적 ({user.achievements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {user.achievements.map((achievement, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                        <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <div className="text-sm font-medium">{achievement}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="affiliations" className="space-y-6 mt-6">
            {user.affiliations && user.affiliations.length > 0 ? (
              <div className="space-y-4">
                {user.affiliations.map((aff: Affiliation) => (
                  <Card key={aff.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{aff.name}</CardTitle>
                          {aff.department && <CardDescription>{aff.department}</CardDescription>}
                        </div>
                        {aff.isVerified ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Shield className="w-3 h-3 mr-1" />
                            인증됨
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock className="w-3 h-3 mr-1" />
                            인증 대기중
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-gray-500">
                        {aff.isVerified ? (
                          <>인증일: {formatDate(aff.verifiedAt)}</>
                        ) : (
                          <>요청일: {formatDate(aff.verificationRequestDate)}</>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <School className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>등록된 소속 정보가 없습니다.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sanctions" className="space-y-6 mt-6">
            {user.sanctions && user.sanctions.length > 0 ? (
              <div className="space-y-4">
                {user.sanctions.map((sanction: Sanction) => (
                  <Card key={sanction.id} className={!sanction.isActive ? "opacity-60" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {renderSanctionBadge(sanction.type)}
                          <CardTitle className="text-base">{sanction.reason}</CardTitle>
                          {!sanction.isActive && <Badge variant="secondary">해제됨</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">적용일: {formatDate(sanction.appliedAt)}</div>
                      </div>
                    </CardHeader>
                    {sanction.details && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600">{sanction.details}</p>
                      </CardContent>
                    )}
                    <CardContent className="pt-0">
                      <div className="text-xs text-gray-500">
                        {sanction.expiresAt ? (
                          <span>만료일: {formatDate(sanction.expiresAt)}</span>
                        ) : (
                          <span className="text-red-500">영구적</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>제재 기록이 없습니다.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-6">
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>활동 내역 데이터가 준비 중입니다.</p>
              <p className="text-sm mt-2">곧 사용자의 상세한 활동 로그를 확인할 수 있습니다.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
