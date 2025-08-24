"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Ban, Clock, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { applySanction, cancelSanction } from "@/lib/admin-utils"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// 타입 정의
type UserStatus = "active" | "suspended" | "banned" | "restricted"

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

interface User {
  id: string
  username: string
  displayName: string
  status: UserStatus
  sanctions: Sanction[]
}

interface SanctionManagerProps {
  user: User
  onSave: (sanctions: Sanction[], newStatus: UserStatus) => void
}

export function SanctionManager({ user, onSave }: SanctionManagerProps) {
  const [sanctions, setSanctions] = useState<Sanction[]>(user.sanctions)
  const [userStatus, setUserStatus] = useState<UserStatus>(user.status)
  const [activeTab, setActiveTab] = useState("current")

  // 새 제재 상태
  const [newSanctionType, setNewSanctionType] = useState<Sanction["type"]>("warning")
  const [newSanctionReason, setNewSanctionReason] = useState("")
  const [newSanctionDetails, setNewSanctionDetails] = useState("")
  const [newSanctionDuration, setNewSanctionDuration] = useState("7") // 일 단위
  const [newSanctionPermanent, setNewSanctionPermanent] = useState(false)

  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [isApplying, setIsApplying] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  // 제재 추가
  const addSanction = async () => {
    if (!newSanctionReason || !userProfile) return

    setIsApplying(true)
    try {
      const duration = newSanctionPermanent ? undefined : Number.parseInt(newSanctionDuration)

      const result = await applySanction(
        user.id,
        newSanctionType,
        newSanctionReason,
        userProfile.uid,
        duration,
        newSanctionDetails || undefined,
      )

      if (result.success) {
        toast({
          title: "제재 적용 완료",
          description: `${user.displayName}에게 ${newSanctionType} 제재가 적용되었습니다.`,
        })

        // 상태 업데이트는 부모 컴포넌트에서 처리
        window.location.reload() // 임시로 페이지 새로고침
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error applying sanction:", error)
      toast({
        title: "제재 적용 실패",
        description: "제재를 적용하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  // 제재 취소
  const cancelSanctionHandler = async (sanctionId: string) => {
    setIsCanceling(true)
    try {
      const result = await cancelSanction(user.id, sanctionId)

      if (result.success) {
        toast({
          title: "제재 취소 완료",
          description: "제재가 성공적으로 취소되었습니다.",
        })

        window.location.reload() // 임시로 페이지 새로고침
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error canceling sanction:", error)
      toast({
        title: "제재 취소 실패",
        description: "제재를 취소하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCanceling(false)
    }
  }

  // 사용자 상태 업데이트 (새 제재 추가 시)
  const updateUserStatus = (sanctionType: Sanction["type"]) => {
    switch (sanctionType) {
      case "ban":
        setUserStatus("banned")
        break
      case "suspension":
        setUserStatus("suspended")
        break
      case "restriction":
        setUserStatus("restricted")
        break
      case "warning":
        // 경고는 상태를 변경하지 않음
        break
    }
  }

  // 활성 제재 기반 사용자 상태 업데이트 (제재 취소 시)
  const updateUserStatusBasedOnActiveSanctions = (currentSanctions: Sanction[]) => {
    const activeSanctions = currentSanctions.filter((s) => s.isActive)

    if (activeSanctions.length === 0) {
      setUserStatus("active")
      return
    }

    // 가장 심각한 제재 찾기
    if (activeSanctions.some((s) => s.type === "ban")) {
      setUserStatus("banned")
    } else if (activeSanctions.some((s) => s.type === "suspension")) {
      setUserStatus("suspended")
    } else if (activeSanctions.some((s) => s.type === "restriction")) {
      setUserStatus("restricted")
    }
  }

  // 변경사항 저장
  const handleSave = () => {
    onSave(sanctions, userStatus)
  }

  // 제재 타입에 따른 배지 렌더링
  const renderSanctionBadge = (type: Sanction["type"]) => {
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
    }
  }

  // 활성 제재 필터링
  const activeSanctions = sanctions.filter((s) => s.isActive)

  // 비활성 제재 필터링
  const inactiveSanctions = sanctions.filter((s) => !s.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">현재 상태: </h3>
          <div className="flex items-center mt-1">
            {userStatus === "active" && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                활성
              </Badge>
            )}
            {userStatus === "suspended" && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                일시 정지
              </Badge>
            )}
            {userStatus === "banned" && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                영구 정지
              </Badge>
            )}
            {userStatus === "restricted" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                제한됨
              </Badge>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>
            사용자: {user.displayName} (@{user.username})
          </p>
          <p>총 제재 수: {sanctions.length}</p>
          <p>활성 제재 수: {activeSanctions.length}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">활성 제재</TabsTrigger>
          <TabsTrigger value="history">제재 기록</TabsTrigger>
          <TabsTrigger value="new">새 제재 추가</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {activeSanctions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">활성 상태인 제재가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {activeSanctions.map((sanction) => (
                <Card key={sanction.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {renderSanctionBadge(sanction.type)}
                        <span className="font-medium">{sanction.reason}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        적용일: {sanction.appliedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  {sanction.details && (
                    <CardContent className="pb-2 pt-0">
                      <p className="text-sm">{sanction.details}</p>
                    </CardContent>
                  )}
                  <CardFooter className="flex justify-between">
                    <div className="text-sm">
                      {sanction.expiresAt ? (
                        <span>만료일: {sanction.expiresAt.toLocaleDateString()}</span>
                      ) : (
                        <span className="text-red-500">영구적</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelSanctionHandler(sanction.id)}
                      disabled={isCanceling}
                    >
                      {isCanceling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          취소 중...
                        </>
                      ) : (
                        "제재 취소"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {inactiveSanctions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">제재 기록이 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {inactiveSanctions.map((sanction) => (
                <Card key={sanction.id} className="opacity-75">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {renderSanctionBadge(sanction.type)}
                        <span className="font-medium">{sanction.reason}</span>
                        <Badge variant="secondary">취소됨</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        적용일: {sanction.appliedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  {sanction.details && (
                    <CardContent className="pb-2 pt-0">
                      <p className="text-sm">{sanction.details}</p>
                    </CardContent>
                  )}
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {sanction.expiresAt ? (
                        <span>만료 예정일: {sanction.expiresAt.toLocaleDateString()}</span>
                      ) : (
                        <span>영구적 (취소됨)</span>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>새 제재 추가</CardTitle>
              <CardDescription>사용자에게 적용할 제재 유형과 세부 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sanction-type">제재 유형</Label>
                <RadioGroup
                  value={newSanctionType}
                  onValueChange={(value) => setNewSanctionType(value as Sanction["type"])}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="warning" id="warning" />
                    <Label htmlFor="warning" className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      경고 (계정 상태 변경 없음)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="restriction" id="restriction" />
                    <Label htmlFor="restriction" className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-blue-500" />
                      제한 (일부 기능 제한)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="suspension" id="suspension" />
                    <Label htmlFor="suspension" className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-500" />
                      일시 정지 (로그인 불가)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ban" id="ban" />
                    <Label htmlFor="ban" className="flex items-center">
                      <Ban className="h-4 w-4 mr-2 text-red-500" />
                      영구 정지 (계정 완전 차단)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">제재 사유</Label>
                <Input
                  id="reason"
                  value={newSanctionReason}
                  onChange={(e) => setNewSanctionReason(e.target.value)}
                  placeholder="제재 사유를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">세부 내용 (선택사항)</Label>
                <Textarea
                  id="details"
                  value={newSanctionDetails}
                  onChange={(e) => setNewSanctionDetails(e.target.value)}
                  placeholder="제재에 대한 세부 내용을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="permanent" checked={newSanctionPermanent} onCheckedChange={setNewSanctionPermanent} />
                  <Label htmlFor="permanent">영구적 제재</Label>
                </div>
              </div>

              {!newSanctionPermanent && (
                <div className="space-y-2">
                  <Label htmlFor="duration">제재 기간 (일)</Label>
                  <Select value={newSanctionDuration} onValueChange={setNewSanctionDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="제재 기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1일</SelectItem>
                      <SelectItem value="3">3일</SelectItem>
                      <SelectItem value="7">7일</SelectItem>
                      <SelectItem value="14">14일</SelectItem>
                      <SelectItem value="30">30일</SelectItem>
                      <SelectItem value="90">90일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={addSanction} disabled={!newSanctionReason || isApplying} className="w-full">
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    제재 적용 중...
                  </>
                ) : (
                  "제재 추가"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onSave(user.sanctions, user.status)}>
          취소
        </Button>
        <Button onClick={handleSave}>변경사항 저장</Button>
      </div>
    </div>
  )
}
