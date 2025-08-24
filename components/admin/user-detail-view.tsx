"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserProfile, Affiliation, Sanction } from "@/lib/user-types"
import { formatDate } from "@/lib/utils"
import { User, Shield, School, Clock } from "lucide-react"

interface UserDetailViewProps {
  user: UserProfile
  onClose: () => void
}

export function UserDetailView({ user, onClose }: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState("profile")

  // 사용자 상태에 따른 배지 렌더링
  const renderStatusBadge = (status?: string) => {
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
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            활성
          </Badge>
        )
    }
  }

  // 제재 타입에 따른 배지 렌더링
  const renderSanctionBadge = (type: string) => {
    switch (type) {
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            경고
          </Badge>
        )
      case "restriction":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            제한
          </Badge>
        )
      case "suspension":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            일시 정지
          </Badge>
        )
      case "ban":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            영구 정지
          </Badge>
        )
      default:
        return <Badge variant="outline">알 수 없음</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || ""} alt={user.username} />
              <AvatarFallback>
                {user.username ? user.username.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.username}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex items-center gap-2 mt-1">
                {renderStatusBadge(user.status)}
                {user.role === "admin" && <Badge className="bg-blue-500 text-white">관리자</Badge>}
                {user.title && <Badge variant="outline">{user.title}</Badge>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">프로필</TabsTrigger>
            <TabsTrigger value="affiliations">소속</TabsTrigger>
            <TabsTrigger value="sanctions">제재 기록</TabsTrigger>
            <TabsTrigger value="activity">활동 내역</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">사용자 ID</Label>
                <p className="font-medium">{user.uid}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">가입일</Label>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">마지막 로그인</Label>
                <p className="font-medium">{formatDate(user.lastLogin)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">포인트</Label>
                <p className="font-medium">{user.points} 점</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">레벨</Label>
                <p className="font-medium">Lv. {user.level || 1}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">티어</Label>
                <p className="font-medium">{user.tier || "Bronze"}</p>
              </div>
            </div>

            {user.bio && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground">자기소개</Label>
                <p className="mt-1 whitespace-pre-wrap">{user.bio}</p>
              </div>
            )}

            <div className="mt-4">
              <Label className="text-sm text-muted-foreground">해결한 문제</Label>
              <p className="font-medium">{user.solvedChallenges?.length || 0} 문제</p>
            </div>
          </TabsContent>

          <TabsContent value="affiliations" className="space-y-4 py-4">
            {user.affiliations && user.affiliations.length > 0 ? (
              <div className="space-y-4">
                {user.affiliations.map((aff: Affiliation) => (
                  <Card key={aff.id}>
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{aff.name}</CardTitle>
                          {aff.department && <CardDescription>{aff.department}</CardDescription>}
                        </div>
                        {aff.isVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            인증됨
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            인증 대기중
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardFooter className="py-3">
                      <div className="text-xs text-muted-foreground">
                        {aff.isVerified ? (
                          <>인증일: {formatDate(aff.verifiedAt)}</>
                        ) : (
                          <>요청일: {formatDate(aff.verificationRequestDate)}</>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <School className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>소속 정보가 없습니다.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sanctions" className="space-y-4 py-4">
            {user.sanctions && user.sanctions.length > 0 ? (
              <div className="space-y-4">
                {user.sanctions.map((sanction: Sanction) => (
                  <Card key={sanction.id} className={!sanction.isActive ? "opacity-70" : ""}>
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {renderSanctionBadge(sanction.type)}
                          <CardTitle className="text-base">{sanction.reason}</CardTitle>
                          {!sanction.isActive && <Badge variant="secondary">취소됨</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">적용일: {formatDate(sanction.appliedAt)}</div>
                      </div>
                    </CardHeader>
                    {sanction.details && (
                      <CardContent className="py-0">
                        <p className="text-sm">{sanction.details}</p>
                      </CardContent>
                    )}
                    <CardFooter className="py-3">
                      <div className="text-xs text-muted-foreground">
                        {sanction.expiresAt ? (
                          <span>만료일: {formatDate(sanction.expiresAt)}</span>
                        ) : (
                          <span className="text-red-500">영구적</span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>제재 기록이 없습니다.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 py-4">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>활동 내역 데이터가 준비 중입니다.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
