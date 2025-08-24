"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import type { UserProfile, Affiliation } from "@/lib/user-types"
import { User, Save, Plus, Trash2, School, Award, Loader2 } from "lucide-react"
import { getFirestore, doc, updateDoc, Timestamp } from "firebase/firestore"

interface UserEditModalProps {
  user: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: (user: UserProfile) => void
}

const AVAILABLE_TITLES = [
  "해킹 마스터",
  "CTF 챔피언",
  "문제 해결사",
  "신입 해커",
  "커뮤니티 기여자",
  "관리자",
  "모더레이터",
  "베테랑",
  "전문가",
  "초보자",
  "보안 전문가",
  "화이트 해커",
  "레드팀",
  "블루팀",
]

const TIER_OPTIONS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"]

export function UserEditModal({ user, open, onOpenChange, onUserUpdated }: UserEditModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("basic")
  const [isSaving, setIsSaving] = useState(false)

  // 기본 정보 상태
  const [username, setUsername] = useState(user.username || "")
  const [email, setEmail] = useState(user.email || "")
  const [bio, setBio] = useState(user.bio || "")
  const [location, setLocation] = useState(user.location || "")
  const [website, setWebsite] = useState(user.website || "")

  // 게임 정보 상태
  const [points, setPoints] = useState(user.points || 0)
  const [wargamePoints, setWargamePoints] = useState(user.wargamePoints || 0)
  const [ctfPoints, setCtfPoints] = useState(user.ctfPoints || 0)
  const [level, setLevel] = useState(user.level || 1)
  const [exp, setExp] = useState(user.exp || 0)
  const [tier, setTier] = useState(user.tier || "Bronze")
  const [title, setTitle] = useState(user.title || "No Title")

  // 소속 정보 상태
  const [affiliations, setAffiliations] = useState<Affiliation[]>(user.affiliations || [])
  const [newAffiliation, setNewAffiliation] = useState({
    name: "",
    department: "",
    isVerified: false,
  })

  // 기본 정보 저장
  const saveBasicInfo = async () => {
    setIsSaving(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      const updates = {
        username,
        email,
        bio,
        location,
        website,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(userRef, updates)

      const updatedUser = { ...user, ...updates }
      onUserUpdated(updatedUser)

      toast({
        title: "기본 정보 저장 완료",
        description: "사용자의 기본 정보가 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      console.error("Error updating basic info:", error)
      toast({
        title: "저장 실패",
        description: "기본 정보를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 게임 정보 저장
  const saveGameInfo = async () => {
    setIsSaving(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      const updates = {
        points,
        wargamePoints,
        ctfPoints,
        level,
        exp,
        tier,
        title: title || undefined,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(userRef, updates)

      const updatedUser = { ...user, ...updates }
      onUserUpdated(updatedUser)

      toast({
        title: "게임 정보 저장 완료",
        description: "사용자의 게임 정보가 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      console.error("Error updating game info:", error)
      toast({
        title: "저장 실패",
        description: "게임 정보를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 소속 추가
  const addAffiliation = () => {
    if (!newAffiliation.name) return

    const affiliation: Affiliation = {
      id: `aff_${Date.now()}`,
      name: newAffiliation.name,
      department: newAffiliation.department,
      isVerified: newAffiliation.isVerified,
      verificationRequestDate: Timestamp.now(),
    }

    setAffiliations([...affiliations, affiliation])
    setNewAffiliation({ name: "", department: "", isVerified: false })
  }

  // 소속 삭제
  const removeAffiliation = (id: string) => {
    setAffiliations(affiliations.filter((aff) => aff.id !== id))
  }

  // 소속 인증 토글
  const toggleAffiliationVerification = (id: string) => {
    setAffiliations(
      affiliations.map((aff) =>
        aff.id === id
          ? { ...aff, isVerified: !aff.isVerified, verifiedAt: !aff.isVerified ? Timestamp.now() : undefined }
          : aff,
      ),
    )
  }

  // 소속 정보 저장
  const saveAffiliations = async () => {
    setIsSaving(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      await updateDoc(userRef, {
        affiliations,
        updatedAt: Timestamp.now(),
      })

      const updatedUser = { ...user, affiliations }
      onUserUpdated(updatedUser)

      toast({
        title: "소속 정보 저장 완료",
        description: "사용자의 소속 정보가 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      console.error("Error updating affiliations:", error)
      toast({
        title: "저장 실패",
        description: "소속 정보를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL || ""} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                {user.username ? user.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">사용자 정보 수정</h2>
              <p className="text-sm text-gray-500">
                {user.username} ({user.email})
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="game">게임 정보</TabsTrigger>
            <TabsTrigger value="affiliations">소속 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  기본 정보
                </CardTitle>
                <CardDescription>사용자의 기본 프로필 정보를 수정합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">사용자명</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="사용자명을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일을 입력하세요"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">자기소개</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="자기소개를 입력하세요"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">위치</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="위치를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">웹사이트</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="웹사이트 URL을 입력하세요"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveBasicInfo} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="game" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  게임 정보
                </CardTitle>
                <CardDescription>사용자의 레벨, 포인트, 칭호 등을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 포인트 관리 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">포인트 관리</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">총 포인트</Label>
                      <Input
                        id="points"
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wargame-points">워게임 포인트</Label>
                      <Input
                        id="wargame-points"
                        type="number"
                        value={wargamePoints}
                        onChange={(e) => setWargamePoints(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctf-points">CTF 포인트</Label>
                      <Input
                        id="ctf-points"
                        type="number"
                        value={ctfPoints}
                        onChange={(e) => setCtfPoints(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* 레벨 및 경험치 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">레벨 & 경험치</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="level">레벨</Label>
                      <Input
                        id="level"
                        type="number"
                        value={level}
                        onChange={(e) => setLevel(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp">경험치</Label>
                      <Input
                        id="exp"
                        type="number"
                        value={exp}
                        onChange={(e) => setExp(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tier">티어</Label>
                      <Select value={tier} onValueChange={setTier}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_OPTIONS.map((tierOption) => (
                            <SelectItem key={tierOption} value={tierOption}>
                              {tierOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 칭호 관리 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">칭호</h4>
                  <div className="space-y-2">
                    <Label htmlFor="title">칭호 선택</Label>
                    <Select value={title} onValueChange={setTitle}>
                      <SelectTrigger>
                        <SelectValue placeholder="칭호를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No Title">칭호 없음</SelectItem>
                        {AVAILABLE_TITLES.map((titleOption) => (
                          <SelectItem key={titleOption} value={titleOption}>
                            {titleOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {title && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">미리보기:</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || ""} alt={user.username} />
                          <AvatarFallback className="text-xs">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{username}</div>
                          <Badge variant="outline" className="text-xs">
                            {title}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveGameInfo} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  소속 관리
                </CardTitle>
                <CardDescription>사용자의 소속 정보를 추가, 수정, 삭제할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 기존 소속 목록 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">현재 소속</h4>
                  {affiliations.length > 0 ? (
                    <div className="space-y-3">
                      {affiliations.map((aff) => (
                        <div key={aff.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{aff.name}</div>
                            {aff.department && <div className="text-sm text-gray-500">{aff.department}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={aff.isVerified}
                                onCheckedChange={() => toggleAffiliationVerification(aff.id)}
                              />
                              <span className="text-sm">{aff.isVerified ? "인증됨" : "미인증"}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAffiliation(aff.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <School className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>등록된 소속이 없습니다.</p>
                    </div>
                  )}
                </div>

                {/* 새 소속 추가 */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium mb-3">새 소속 추가</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-affiliation-name">소속명</Label>
                        <Input
                          id="new-affiliation-name"
                          value={newAffiliation.name}
                          onChange={(e) =>
                            setNewAffiliation({
                              ...newAffiliation,
                              name: e.target.value,
                            })
                          }
                          placeholder="소속 기관명을 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-affiliation-department">부서/학과</Label>
                        <Input
                          id="new-affiliation-department"
                          value={newAffiliation.department}
                          onChange={(e) =>
                            setNewAffiliation({
                              ...newAffiliation,
                              department: e.target.value,
                            })
                          }
                          placeholder="부서 또는 학과명 (선택사항)"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newAffiliation.isVerified}
                          onCheckedChange={(checked) =>
                            setNewAffiliation({
                              ...newAffiliation,
                              isVerified: checked,
                            })
                          }
                        />
                        <Label>즉시 인증</Label>
                      </div>

                      <Button onClick={addAffiliation} disabled={!newAffiliation.name} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        추가
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveAffiliations} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
