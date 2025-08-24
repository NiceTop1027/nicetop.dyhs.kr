"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { isAdmin } from "@/lib/admin-utils"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  RefreshCw,
  User,
  Target,
  Zap,
  Shield,
  Crown,
} from "lucide-react"
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

type ReservationStatus = "pending" | "approved" | "rejected"

type Reservation = {
  id: string
  title: string
  description: string
  startTime: Timestamp
  endTime: Timestamp
  difficulty: string
  category: string
  teamSize?: number
  additionalNotes?: string
  requesterId: string
  requesterName: string
  requesterEmail: string
  status: ReservationStatus
  adminComment?: string
  createdAt: Timestamp
  reviewedAt?: Timestamp
  reviewedBy?: string
}

const statusConfig = {
  pending: {
    label: "대기중",
    color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    icon: AlertCircle,
  },
  approved: {
    label: "승인됨",
    color: "bg-green-500/20 text-green-700 border-green-500/30",
    icon: CheckCircle,
  },
  rejected: {
    label: "거부됨",
    color: "bg-red-500/20 text-red-700 border-red-500/30",
    icon: XCircle,
  },
}

const categoryLabels = {
  general: "일반 대회",
  student: "학생 대회",
  corporate: "기업 대회",
  special: "특별 이벤트",
}

const difficultyLabels = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
  expert: "전문가",
}

export default function ReservationsPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adminComment, setAdminComment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!isAdmin(userProfile)) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    // 실시간 예약 데이터 구독
    const reservationsRef = collection(db, "ctf_reservations")
    const q = query(reservationsRef, orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reservationData: Reservation[] = []
      snapshot.forEach((doc) => {
        reservationData.push({ id: doc.id, ...doc.data() } as Reservation)
      })
      setReservations(reservationData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, userProfile, router, toast])

  const handleStatusChange = async (reservationId: string, newStatus: ReservationStatus) => {
    if (!user) return

    setIsProcessing(true)
    try {
      const reservationRef = doc(db, "ctf_reservations", reservationId)
      await updateDoc(reservationRef, {
        status: newStatus,
        adminComment: adminComment || "",
        reviewedAt: Timestamp.now(),
        reviewedBy: user.uid,
      })

      // 승인된 경우 CTF 대회 생성
      if (newStatus === "approved" && selectedReservation) {
        await addDoc(collection(db, "ctf_contests"), {
          title: selectedReservation.title,
          description: selectedReservation.description,
          startTime: selectedReservation.startTime,
          endTime: selectedReservation.endTime,
          difficulty: selectedReservation.difficulty,
          category: selectedReservation.category,
          maxTeamSize: selectedReservation.teamSize || null,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          status: "upcoming",
          participants: [],
          problems: [],
          reservationId: reservationId,
        })
      }

      toast({
        title: newStatus === "approved" ? "예약이 승인되었습니다! 🎉" : "예약이 거부되었습니다",
        description:
          newStatus === "approved" ? "CTF 대회가 자동으로 생성되었습니다." : "신청자에게 거부 사유가 전달됩니다.",
        variant: newStatus === "approved" ? "default" : "destructive",
      })

      setIsDialogOpen(false)
      setSelectedReservation(null)
      setAdminComment("")
    } catch (error) {
      console.error("Error updating reservation:", error)
      toast({
        title: "처리 실패",
        description: "예약 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const openReviewDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setAdminComment(reservation.adminComment || "")
    setIsDialogOpen(true)
  }

  const filteredReservations = reservations.filter((reservation) => {
    if (activeTab === "all") return true
    return reservation.status === activeTab
  })

  const getStatusCounts = () => {
    return {
      all: reservations.length,
      pending: reservations.filter((r) => r.status === "pending").length,
      approved: reservations.filter((r) => r.status === "approved").length,
      rejected: reservations.filter((r) => r.status === "rejected").length,
    }
  }

  const statusCounts = getStatusCounts()

  if (!isAdmin(userProfile)) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-background/90">
      <Navbar />

      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />

        <motion.div
          className="relative container mx-auto px-4 py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">CTF 예약 관리</h1>
                  <p className="text-xl text-blue-200 mt-1">CTF 대회 예약 요청을 검토하고 관리합니다</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1">
                  <Shield className="mr-1 h-3 w-3" />
                  관리자 권한
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1">
                  <Zap className="mr-1 h-3 w-3" />
                  실시간 업데이트
                </Badge>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-right"
            >
              <div className="text-white">
                <p className="text-3xl font-bold">{statusCounts.all}</p>
                <p className="text-blue-200">총 예약 요청</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/50">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  전체 ({statusCounts.all})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  대기중 ({statusCounts.pending})
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인됨 ({statusCounts.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  <XCircle className="mr-2 h-4 w-4" />
                  거부됨 ({statusCounts.rejected})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span>예약 데이터를 불러오는 중...</span>
                    </div>
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold">예약 요청이 없습니다</h3>
                    <p className="text-muted-foreground mt-2">
                      {activeTab === "all"
                        ? "아직 CTF 예약 요청이 없습니다."
                        : `${statusConfig[activeTab as ReservationStatus]?.label} 상태의 예약이 없습니다.`}
                    </p>
                  </motion.div>
                ) : (
                  <div className="grid gap-6">
                    {filteredReservations.map((reservation, index) => (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                      >
                        <Card className="border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-16 translate-x-16" />

                          <CardHeader className="relative">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl">{reservation.title}</CardTitle>
                                  <Badge className={statusConfig[reservation.status].color}>
                                    {React.createElement(statusConfig[reservation.status].icon, {
                                      className: "mr-1 h-3 w-3",
                                    })}
                                    {statusConfig[reservation.status].label}
                                  </Badge>
                                </div>
                                <CardDescription className="text-sm">{reservation.description}</CardDescription>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openReviewDialog(reservation)}
                                  className="bg-transparent"
                                >
                                  <Eye className="mr-1 h-4 w-4" />
                                  검토
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="relative">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  신청자
                                </div>
                                <p className="font-medium">{reservation.requesterName}</p>
                                <p className="text-xs text-muted-foreground">{reservation.requesterEmail}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  일정
                                </div>
                                <p className="font-medium text-sm">
                                  {reservation.startTime.toDate().toLocaleDateString("ko-KR")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {reservation.startTime.toDate().toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  -{" "}
                                  {reservation.endTime.toDate().toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Target className="h-3 w-3" />
                                  설정
                                </div>
                                <p className="font-medium text-sm">
                                  {categoryLabels[reservation.category as keyof typeof categoryLabels]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {difficultyLabels[reservation.difficulty as keyof typeof difficultyLabels]}
                                  {reservation.teamSize && ` • ${reservation.teamSize}명 팀`}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  신청일
                                </div>
                                <p className="font-medium text-sm">
                                  {reservation.createdAt.toDate().toLocaleDateString("ko-KR")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {reservation.createdAt.toDate().toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>

                            {reservation.additionalNotes && (
                              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">추가 요청사항:</p>
                                <p className="text-sm">{reservation.additionalNotes}</p>
                              </div>
                            )}

                            {reservation.adminComment && (
                              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">관리자 코멘트:</p>
                                <p className="text-sm">{reservation.adminComment}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      {/* 검토 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              CTF 예약 검토
            </DialogTitle>
            <DialogDescription>예약 요청을 검토하고 승인 또는 거부 처리를 진행하세요.</DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">대회 제목</Label>
                  <p className="text-sm bg-muted/30 p-2 rounded">{selectedReservation.title}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">신청자</Label>
                  <p className="text-sm bg-muted/30 p-2 rounded">{selectedReservation.requesterName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">카테고리</Label>
                  <p className="text-sm bg-muted/30 p-2 rounded">
                    {categoryLabels[selectedReservation.category as keyof typeof categoryLabels]}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">난이도</Label>
                  <p className="text-sm bg-muted/30 p-2 rounded">
                    {difficultyLabels[selectedReservation.difficulty as keyof typeof difficultyLabels]}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">대회 설명</Label>
                <p className="text-sm bg-muted/30 p-3 rounded min-h-[60px]">{selectedReservation.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminComment" className="text-sm font-medium">
                  관리자 코멘트
                </Label>
                <Textarea
                  id="adminComment"
                  placeholder="승인/거부 사유나 추가 안내사항을 입력하세요..."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleStatusChange(selectedReservation.id, "approved")}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  {isProcessing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  승인하기
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedReservation.id, "rejected")}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  거부하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
