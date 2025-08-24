"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { isAdmin } from "@/lib/admin-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Trophy, Palette, Sparkles, Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { ProfileFrameDisplay } from "@/components/profile-frame-display"
import { AchievementDisplay } from "@/components/achievement-display"
import type { ProfileFrame, ProfileTheme, Achievement, Title } from "@/lib/user-types"

export default function ProfileSystemAdminPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [frames, setFrames] = useState<ProfileFrame[]>([])
  const [themes, setThemes] = useState<ProfileTheme[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [titles, setTitles] = useState<Title[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState("frames")

  // 새 아이템 생성 폼 상태
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createFormType, setCreateFormType] = useState<"frame" | "theme" | "achievement" | "title">("frame")

  const [newFrame, setNewFrame] = useState({
    name: "",
    description: "",
    imageUrl: "",
    rarity: "common" as const,
    color: "#6B7280",
    glowColor: "",
    animationType: "none" as const,
    isAdminOnly: false,
    unlockCondition: "",
    price: 0,
  })

  const [newTheme, setNewTheme] = useState({
    name: "",
    description: "",
    backgroundColor: "#FFFFFF",
    gradientColors: [""],
    textColor: "#000000",
    accentColor: "#3B82F6",
    rarity: "common" as const,
    isAdminOnly: false,
    unlockCondition: "",
  })

  const [newAchievement, setNewAchievement] = useState({
    name: "",
    description: "",
    iconUrl: "",
    rarity: "bronze" as const,
    category: "problem_solving" as const,
    condition: "",
    reward: {
      points: 0,
      exp: 0,
      title: "",
      frame: "",
      theme: "",
      effect: "",
    },
    isHidden: false,
  })

  const [newTitle, setNewTitle] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    backgroundColor: "",
    borderColor: "",
    icon: "",
    rarity: "common" as const,
    unlockCondition: "",
    isAdminOnly: false,
    glowEffect: false,
    animationType: "none" as const,
  })

  // 권한 확인
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

    loadData()
  }, [user, userProfile, router, toast])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // 실제로는 Firestore에서 데이터를 불러와야 함
      // 여기서는 예시 데이터 사용
      setFrames([
        {
          id: "default",
          name: "기본 프레임",
          description: "기본 프로필 프레임입니다.",
          imageUrl: "/frames/default.png",
          rarity: "common",
          color: "#6B7280",
          animationType: "none",
          isAdminOnly: false,
          createdAt: new Date() as any,
          createdBy: "system",
        },
      ])

      setAchievements([
        {
          id: "first_solve",
          name: "첫 걸음",
          description: "첫 번째 문제를 해결했습니다!",
          iconUrl: "/achievements/first_solve.png",
          rarity: "bronze",
          category: "problem_solving",
          condition: "solve_1_problem",
          reward: {
            points: 100,
            exp: 50,
          },
          isHidden: false,
          createdAt: new Date() as any,
        },
      ])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "데이터 로딩 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createFrame = async () => {
    try {
      // Firestore에 새 프레임 저장
      const frameData = {
        ...newFrame,
        id: `frame_${Date.now()}`,
        createdAt: new Date(),
        createdBy: user?.uid,
      }

      setFrames([...frames, frameData as any])
      setShowCreateForm(false)
      setNewFrame({
        name: "",
        description: "",
        imageUrl: "",
        rarity: "common",
        color: "#6B7280",
        glowColor: "",
        animationType: "none",
        isAdminOnly: false,
        unlockCondition: "",
        price: 0,
      })

      toast({
        title: "프레임 생성 완료",
        description: "새 프로필 프레임이 생성되었습니다.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error creating frame:", error)
      toast({
        title: "프레임 생성 실패",
        description: "프레임을 생성하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const createAchievement = async () => {
    try {
      const achievementData = {
        ...newAchievement,
        id: `achievement_${Date.now()}`,
        createdAt: new Date(),
      }

      setAchievements([...achievements, achievementData as any])
      setShowCreateForm(false)
      setNewAchievement({
        name: "",
        description: "",
        iconUrl: "",
        rarity: "bronze",
        category: "problem_solving",
        condition: "",
        reward: {
          points: 0,
          exp: 0,
          title: "",
          frame: "",
          theme: "",
          effect: "",
        },
        isHidden: false,
      })

      toast({
        title: "업적 생성 완료",
        description: "새 업적이 생성되었습니다.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error creating achievement:", error)
      toast({
        title: "업적 생성 실패",
        description: "업적을 생성하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>데이터를 불러오는 중...</p>
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
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 대시보드로 돌아가기
            </Button>

            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">프로필 시스템 관리</h1>
                <p className="text-muted-foreground mt-2">프로필 프레임, 테마, 업적, 칭호를 관리합니다.</p>
              </div>

              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />새 아이템 생성
              </Button>
            </div>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="frames" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                프로필 프레임
              </TabsTrigger>
              <TabsTrigger value="themes" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                프로필 테마
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                업적
              </TabsTrigger>
              <TabsTrigger value="titles" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                칭호
              </TabsTrigger>
            </TabsList>

            {/* 프로필 프레임 탭 */}
            <TabsContent value="frames">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {frames.map((frame, index) => (
                  <motion.div
                    key={frame.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{frame.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className={`mt-1 ${
                                frame.rarity === "legendary"
                                  ? "border-yellow-400 text-yellow-400"
                                  : frame.rarity === "epic"
                                    ? "border-purple-400 text-purple-400"
                                    : frame.rarity === "rare"
                                      ? "border-blue-400 text-blue-400"
                                      : frame.rarity === "uncommon"
                                        ? "border-green-400 text-green-400"
                                        : "border-gray-400 text-gray-400"
                              }`}
                            >
                              {frame.rarity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 mb-4">
                          <ProfileFrameDisplay
                            user={{
                              photoURL: "/placeholder.svg",
                              username: "미리보기",
                              level: 25,
                            }}
                            frame={frame}
                            size="lg"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-2">{frame.description}</p>
                            {frame.isAdminOnly && (
                              <Badge variant="destructive" className="text-xs">
                                관리자 전용
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span>색상:</span>
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: frame.color }} />
                          </div>
                          <div className="flex justify-between">
                            <span>애니메이션:</span>
                            <span>{frame.animationType}</span>
                          </div>
                          {frame.unlockCondition && (
                            <div className="flex justify-between">
                              <span>잠금해제 조건:</span>
                              <span>{frame.unlockCondition}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* 업적 탭 */}
            <TabsContent value="achievements">
              <AchievementDisplay achievements={achievements} unlockedAchievements={[]} showProgress={false} />
            </TabsContent>

            {/* 다른 탭들... */}
            <TabsContent value="themes">
              <div className="text-center py-12">
                <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">프로필 테마</h3>
                <p className="text-muted-foreground mt-2">곧 추가될 예정입니다.</p>
              </div>
            </TabsContent>

            <TabsContent value="titles">
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">칭호 시스템</h3>
                <p className="text-muted-foreground mt-2">곧 추가될 예정입니다.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* 생성 폼 모달 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">새 아이템 생성</h2>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>아이템 타입</Label>
                <Select value={createFormType} onValueChange={(value: any) => setCreateFormType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frame">프로필 프레임</SelectItem>
                    <SelectItem value="theme">프로필 테마</SelectItem>
                    <SelectItem value="achievement">업적</SelectItem>
                    <SelectItem value="title">칭호</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createFormType === "frame" && (
                <div className="space-y-4">
                  <div>
                    <Label>프레임 이름</Label>
                    <Input
                      value={newFrame.name}
                      onChange={(e) => setNewFrame({ ...newFrame, name: e.target.value })}
                      placeholder="프레임 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label>설명</Label>
                    <Textarea
                      value={newFrame.description}
                      onChange={(e) => setNewFrame({ ...newFrame, description: e.target.value })}
                      placeholder="프레임 설명을 입력하세요"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>희귀도</Label>
                      <Select
                        value={newFrame.rarity}
                        onValueChange={(value: any) => setNewFrame({ ...newFrame, rarity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">일반</SelectItem>
                          <SelectItem value="uncommon">고급</SelectItem>
                          <SelectItem value="rare">희귀</SelectItem>
                          <SelectItem value="epic">영웅</SelectItem>
                          <SelectItem value="legendary">전설</SelectItem>
                          <SelectItem value="mythic">신화</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>애니메이션</Label>
                      <Select
                        value={newFrame.animationType}
                        onValueChange={(value: any) => setNewFrame({ ...newFrame, animationType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">없음</SelectItem>
                          <SelectItem value="glow">글로우</SelectItem>
                          <SelectItem value="pulse">펄스</SelectItem>
                          <SelectItem value="rotate">회전</SelectItem>
                          <SelectItem value="rainbow">무지개</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newFrame.isAdminOnly}
                        onChange={(e) => setNewFrame({ ...newFrame, isAdminOnly: e.target.checked })}
                      />
                      관리자 전용
                    </label>
                  </div>

                  <Button onClick={createFrame} className="w-full">
                    프레임 생성
                  </Button>
                </div>
              )}

              {createFormType === "achievement" && (
                <div className="space-y-4">
                  <div>
                    <Label>업적 이름</Label>
                    <Input
                      value={newAchievement.name}
                      onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })}
                      placeholder="업적 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label>설명</Label>
                    <Textarea
                      value={newAchievement.description}
                      onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                      placeholder="업적 설명을 입력하세요"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>희귀도</Label>
                      <Select
                        value={newAchievement.rarity}
                        onValueChange={(value: any) => setNewAchievement({ ...newAchievement, rarity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">브론즈</SelectItem>
                          <SelectItem value="silver">실버</SelectItem>
                          <SelectItem value="gold">골드</SelectItem>
                          <SelectItem value="platinum">플래티넘</SelectItem>
                          <SelectItem value="diamond">다이아몬드</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>카테고리</Label>
                      <Select
                        value={newAchievement.category}
                        onValueChange={(value: any) => setNewAchievement({ ...newAchievement, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="problem_solving">문제 해결</SelectItem>
                          <SelectItem value="participation">참여</SelectItem>
                          <SelectItem value="special">특별</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>달성 조건</Label>
                    <Input
                      value={newAchievement.condition}
                      onChange={(e) => setNewAchievement({ ...newAchievement, condition: e.target.value })}
                      placeholder="예: solve_10_problems"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>보상 점수</Label>
                      <Input
                        type="number"
                        value={newAchievement.reward.points}
                        onChange={(e) =>
                          setNewAchievement({
                            ...newAchievement,
                            reward: { ...newAchievement.reward, points: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>보상 경험치</Label>
                      <Input
                        type="number"
                        value={newAchievement.reward.exp}
                        onChange={(e) =>
                          setNewAchievement({
                            ...newAchievement,
                            reward: { ...newAchievement.reward, exp: Number.parseInt(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={createAchievement} className="w-full">
                    업적 생성
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
