"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import {
  Trophy,
  Calendar,
  Users,
  Target,
  Zap,
  Shield,
  Star,
  Sparkles,
  ChevronRight,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export default function CTFReservePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    difficulty: "",
    category: "",
    teamSize: "",
    additionalNotes: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "CTF 예약을 하려면 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    // 필수 필드 검증
    if (
      !formData.title ||
      !formData.description ||
      !formData.startDate ||
      !formData.startTime ||
      !formData.endDate ||
      !formData.endTime ||
      !formData.difficulty ||
      !formData.category
    ) {
      toast({
        title: "필수 정보를 입력해주세요",
        description: "모든 필수 필드를 채워주세요.",
        variant: "destructive",
      })
      return
    }

    // 날짜 검증
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
    const now = new Date()

    if (startDateTime <= now) {
      toast({
        title: "잘못된 시작 시간",
        description: "시작 시간은 현재 시간보다 이후여야 합니다.",
        variant: "destructive",
      })
      return
    }

    if (endDateTime <= startDateTime) {
      toast({
        title: "잘못된 종료 시간",
        description: "종료 시간은 시작 시간보다 이후여야 합니다.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await addDoc(collection(db, "ctf_reservations"), {
        title: formData.title,
        description: formData.description,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        difficulty: formData.difficulty,
        category: formData.category,
        teamSize: formData.teamSize ? Number.parseInt(formData.teamSize) : null,
        additionalNotes: formData.additionalNotes,
        requesterId: user.uid,
        requesterName: user.displayName || user.email || "Unknown",
        requesterEmail: user.email,
        status: "pending",
        createdAt: Timestamp.now(),
      })

      toast({
        title: "예약 요청이 완료되었습니다! 🎉",
        description: "관리자 검토 후 승인 여부를 알려드리겠습니다.",
        variant: "default",
      })

      // 폼 초기화
      setFormData({
        title: "",
        description: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        difficulty: "",
        category: "",
        teamSize: "",
        additionalNotes: "",
      })
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "예약 요청 실패",
        description: "예약 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">로그인이 필요합니다</h3>
                <p className="text-muted-foreground mt-2">CTF 예약을 하려면 로그인이 필요합니다.</p>
                <Button className="mt-4" onClick={() => router.push("/login")}>
                  로그인 페이지로
                </Button>
              </motion.div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navbar />

      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        <div className="absolute inset-0">
          {/* 움직이는 파티클 효과 */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <motion.div
          className="relative container mx-auto px-4 py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex justify-center"
            >
              <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-2xl">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold text-white mb-4">CTF 대회 예약</h1>
              <p className="text-xl text-blue-200 max-w-2xl mx-auto">
                맞춤형 CTF 대회를 예약하고 팀과 함께 사이버 보안 실력을 겨뤄보세요
              </p>
            </motion.div>

            <motion.div
              className="flex justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white text-sm">실시간 검토</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-white text-sm">빠른 승인</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-white text-sm">전문 관리</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-lg" />

              <CardHeader className="relative text-center pb-8">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CTF 대회 예약 신청
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  아래 정보를 입력하여 맞춤형 CTF 대회를 예약해보세요
                </CardDescription>
              </CardHeader>

              <CardContent className="relative">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* 기본 정보 섹션 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">기본 정보</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">
                          대회 제목 *
                        </Label>
                        <Input
                          id="title"
                          placeholder="예: 웹 해킹 챌린지 대회"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                          대회 카테고리 *
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleInputChange("category", value)}
                        >
                          <SelectTrigger className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50">
                            <SelectValue placeholder="카테고리를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">일반 대회</SelectItem>
                            <SelectItem value="student">학생 대회</SelectItem>
                            <SelectItem value="corporate">기업 대회</SelectItem>
                            <SelectItem value="special">특별 이벤트</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        대회 설명 *
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="대회의 목적, 주요 내용, 참가 대상 등을 자세히 설명해주세요..."
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50 min-h-[120px]"
                        required
                      />
                    </div>
                  </motion.div>

                  {/* 일정 정보 섹션 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">일정 정보</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate" className="text-sm font-medium">
                            시작 날짜 *
                          </Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleInputChange("startDate", e.target.value)}
                            className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startTime" className="text-sm font-medium">
                            시작 시간 *
                          </Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => handleInputChange("startTime", e.target.value)}
                            className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="endDate" className="text-sm font-medium">
                            종료 날짜 *
                          </Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => handleInputChange("endDate", e.target.value)}
                            className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime" className="text-sm font-medium">
                            종료 시간 *
                          </Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => handleInputChange("endTime", e.target.value)}
                            className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* 대회 설정 섹션 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">대회 설정</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="difficulty" className="text-sm font-medium">
                          난이도 *
                        </Label>
                        <Select
                          value={formData.difficulty}
                          onValueChange={(value) => handleInputChange("difficulty", value)}
                        >
                          <SelectTrigger className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50">
                            <SelectValue placeholder="난이도를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">초급 (입문자)</SelectItem>
                            <SelectItem value="intermediate">중급 (경험자)</SelectItem>
                            <SelectItem value="advanced">고급 (전문가)</SelectItem>
                            <SelectItem value="expert">전문가 (마스터)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="teamSize" className="text-sm font-medium">
                          팀 최대 인원 (선택사항)
                        </Label>
                        <Select
                          value={formData.teamSize}
                          onValueChange={(value) => handleInputChange("teamSize", value)}
                        >
                          <SelectTrigger className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50">
                            <SelectValue placeholder="팀 크기 제한 없음" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">개인전 (1명)</SelectItem>
                            <SelectItem value="2">2명 팀</SelectItem>
                            <SelectItem value="3">3명 팀</SelectItem>
                            <SelectItem value="4">4명 팀</SelectItem>
                            <SelectItem value="5">5명 팀</SelectItem>
                            <SelectItem value="6">6명 팀</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>

                  {/* 추가 정보 섹션 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">추가 정보</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes" className="text-sm font-medium">
                        추가 요청사항 (선택사항)
                      </Label>
                      <Textarea
                        id="additionalNotes"
                        placeholder="특별한 요구사항이나 추가로 전달하고 싶은 내용이 있다면 작성해주세요..."
                        value={formData.additionalNotes}
                        onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                        className="bg-white/50 dark:bg-card/50 border-primary/20 focus:border-primary/50 min-h-[100px]"
                      />
                    </div>
                  </motion.div>

                  {/* 제출 버튼 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="pt-6"
                  >
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          예약 요청 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          CTF 대회 예약 신청하기
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
