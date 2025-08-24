"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, CheckCircle, XCircle, ArrowLeft, Loader2, BadgeCheck, AlertCircle } from "lucide-react"
import { collection, getDocs, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { UserProfile } from "@/lib/user-types"

// 인증 요청 타입 정의
interface VerificationRequest {
  userId: string
  username: string
  email?: string
  photoURL?: string
  affiliationId: string
  affiliationName: string
  affiliationDepartment?: string
  requestDate: Timestamp
}

// 인증된 소속 타입 정의
interface VerifiedAffiliation {
  userId: string
  username: string
  email?: string
  photoURL?: string
  affiliationId: string
  affiliationName: string
  affiliationDepartment?: string
  verifiedAt: Timestamp
  verifiedBy: string
}

export default function VerificationsPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [pendingVerifications, setPendingVerifications] = useState<VerificationRequest[]>([])
  const [verifiedAffiliations, setVerifiedAffiliations] = useState<VerifiedAffiliation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")

  // 확인 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    userId: string
    username: string
    affiliationId: string
    affiliationName: string
    affiliationDepartment?: string
    action: "approve" | "reject"
    isProcessing: boolean
  }>({
    isOpen: false,
    userId: "",
    username: "",
    affiliationId: "",
    affiliationName: "",
    affiliationDepartment: "",
    action: "approve",
    isProcessing: false,
  })

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    } else {
      fetchVerifications()
    }
  }, [isAdmin, router, toast, activeTab])

  // 인증 요청 목록 가져오기
  const fetchVerifications = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const pendingRequests: VerificationRequest[] = []
      const verifiedAffs: VerifiedAffiliation[] = []

      // 모든 사용자를 순회하며 인증 요청 및 인증된 소속 찾기
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserProfile

        if (userData.affiliations && userData.affiliations.length > 0) {
          // 인증 요청이 있는 소속 찾기
          const pendingAffiliations = userData.affiliations.filter(
            (aff) => aff.verificationRequestDate && !aff.isVerified,
          )

          // 인증된 소속 찾기
          const verifiedAffiliations = userData.affiliations.filter((aff) => aff.isVerified && aff.verifiedAt)

          // 인증 요청 목록에 추가
          pendingAffiliations.forEach((aff) => {
            pendingRequests.push({
              userId: userDoc.id,
              username: userData.username,
              email: userData.email,
              photoURL: userData.photoURL,
              affiliationId: aff.id,
              affiliationName: aff.name,
              affiliationDepartment: aff.department,
              requestDate: aff.verificationRequestDate as Timestamp,
            })
          })

          // 인증된 소속 목록에 추가
          verifiedAffiliations.forEach((aff) => {
            verifiedAffs.push({
              userId: userDoc.id,
              username: userData.username,
              email: userData.email,
              photoURL: userData.photoURL,
              affiliationId: aff.id,
              affiliationName: aff.name,
              affiliationDepartment: aff.department,
              verifiedAt: aff.verifiedAt as Timestamp,
              verifiedBy: aff.verifiedBy || "",
            })
          })
        }
      }

      // 날짜 기준으로 정렬
      pendingRequests.sort((a, b) => b.requestDate.seconds - a.requestDate.seconds)
      verifiedAffs.sort((a, b) => b.verifiedAt.seconds - a.verifiedAt.seconds)

      setPendingVerifications(pendingRequests)
      setVerifiedAffiliations(verifiedAffs)
    } catch (error) {
      console.error("Error fetching verifications:", error)
      toast({
        title: "오류 발생",
        description: "인증 요청 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 인증 요청 승인
  const approveVerification = async () => {
    if (!confirmDialog.userId || !confirmDialog.affiliationId) return

    setConfirmDialog({ ...confirmDialog, isProcessing: true })

    try {
      const userRef = doc(db, "users", confirmDialog.userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        const affiliations = userData.affiliations || []

        // 인증할 소속 찾기 및 업데이트
        const updatedAffiliations = affiliations.map((aff) => {
          if (aff.id === confirmDialog.affiliationId) {
            return {
              ...aff,
              isVerified: true,
              verifiedAt: Timestamp.now(),
              verifiedBy: user?.uid,
            }
          }
          return aff
        })

        // Firestore 업데이트
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
        })

        toast({
          title: "인증 완료",
          description: `${confirmDialog.username}님의 소속 정보가 인증되었습니다.`,
          variant: "default",
        })

        // 사용자에게 알림 보내기
        try {
          import("@/lib/notification-utils").then(({ sendEventNotification }) => {
            sendEventNotification("affiliation_verified", confirmDialog.userId, {
              affiliationName: confirmDialog.affiliationName,
              affiliationId: confirmDialog.affiliationId,
            })
          })
        } catch (notificationError) {
          console.error("알림 전송 오류:", notificationError)
        }

        // 목록 새로고침
        fetchVerifications()
      }
    } catch (error) {
      console.error("Error approving verification:", error)
      toast({
        title: "오류 발생",
        description: "인증 요청을 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setConfirmDialog({
        isOpen: false,
        userId: "",
        username: "",
        affiliationId: "",
        affiliationName: "",
        affiliationDepartment: "",
        action: "approve",
        isProcessing: false,
      })
    }
  }

  // 인증 요청 거부
  const rejectVerification = async () => {
    if (!confirmDialog.userId || !confirmDialog.affiliationId) return

    setConfirmDialog({ ...confirmDialog, isProcessing: true })

    try {
      const userRef = doc(db, "users", confirmDialog.userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        const affiliations = userData.affiliations || []

        // 거부할 소속 찾기 및 업데이트
        const updatedAffiliations = affiliations.map((aff) => {
          if (aff.id === confirmDialog.affiliationId) {
            // 인증 요청 정보 제거
            const { verificationRequestDate, ...rest } = aff
            return rest
          }
          return aff
        })

        // Firestore 업데이트
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
        })

        toast({
          title: "인증 거부",
          description: `${confirmDialog.username}님의 소속 인증 요청이 거부되었습니다.`,
          variant: "default",
        })

        // 사용자에게 알림 보내기
        try {
          import("@/lib/notification-utils").then(({ sendNotificationToUser }) => {
            sendNotificationToUser(
              confirmDialog.userId,
              "verification",
              "소속 인증 요청 거부",
              `'${confirmDialog.affiliationName}' 소속 인증 요청이 거부되었습니다. 정확한 정보로 다시 요청해주세요.`,
              "/profile",
              "medium",
            )
          })
        } catch (notificationError) {
          console.error("알림 전송 오류:", notificationError)
        }

        // 목록 새로고침
        fetchVerifications()
      }
    } catch (error) {
      console.error("Error rejecting verification:", error)
      toast({
        title: "오류 발생",
        description: "인증 요청을 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setConfirmDialog({
        isOpen: false,
        userId: "",
        username: "",
        affiliationId: "",
        affiliationName: "",
        affiliationDepartment: "",
        action: "approve",
        isProcessing: false,
      })
    }
  }

  // 인증 취소
  const cancelVerification = async (userId: string, affiliationId: string, username: string) => {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile
        const affiliations = userData.affiliations || []

        // 인증 취소할 소속 찾기 및 업데이트
        const updatedAffiliations = affiliations.map((aff) => {
          if (aff.id === affiliationId) {
            // 인증 정보 제거
            const { isVerified, verifiedAt, verifiedBy, ...rest } = aff
            return {
              ...rest,
              isVerified: false,
            }
          }
          return aff
        })

        // Firestore 업데이트
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
        })

        toast({
          title: "인증 취소",
          description: `${username}님의 소속 인증이 취소되었습니다.`,
          variant: "default",
        })

        // 목록 새로고침
        fetchVerifications()
      }
    } catch (error) {
      console.error("Error canceling verification:", error)
      toast({
        title: "오류 발생",
        description: "인증 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 날짜 포맷 함수
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "날짜 없음"

    return timestamp.toDate().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 사용자 이름의 첫 글자 가져오기
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6 flex items-center">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              대시보드로 돌아가기
            </Button>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">소속 인증 관리</h1>
              <p className="text-muted-foreground mt-1">사용자의 소속 인증 요청을 관리합니다.</p>
            </div>
          </div>

          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending">
                대기 중
                {pendingVerifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                    {pendingVerifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verified">인증됨</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>대기 중인 인증 요청</CardTitle>
                  <CardDescription>사용자가 요청한 소속 인증을 승인하거나 거부할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
                        <p>인증 요청 목록을 불러오는 중...</p>
                      </div>
                    </div>
                  ) : pendingVerifications.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">대기 중인 인증 요청이 없습니다</p>
                        <p className="text-muted-foreground">모든 인증 요청이 처리되었습니다.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>사용자</TableHead>
                            <TableHead>소속</TableHead>
                            <TableHead>요청일</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingVerifications.map((verification) => (
                            <TableRow key={verification.affiliationId}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    {verification.photoURL ? (
                                      <AvatarImage src={verification.photoURL} alt={verification.username} />
                                    ) : (
                                      <AvatarFallback>{getInitials(verification.username)}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{verification.username}</div>
                                    <div className="text-sm text-muted-foreground">{verification.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{verification.affiliationName}</div>
                                {verification.affiliationDepartment && (
                                  <div className="text-sm text-muted-foreground">
                                    {verification.affiliationDepartment}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(verification.requestDate)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                    onClick={() =>
                                      setConfirmDialog({
                                        isOpen: true,
                                        userId: verification.userId,
                                        username: verification.username,
                                        affiliationId: verification.affiliationId,
                                        affiliationName: verification.affiliationName,
                                        affiliationDepartment: verification.affiliationDepartment,
                                        action: "reject",
                                        isProcessing: false,
                                      })
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    거부
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() =>
                                      setConfirmDialog({
                                        isOpen: true,
                                        userId: verification.userId,
                                        username: verification.username,
                                        affiliationId: verification.affiliationId,
                                        affiliationName: verification.affiliationName,
                                        affiliationDepartment: verification.affiliationDepartment,
                                        action: "approve",
                                        isProcessing: false,
                                      })
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    승인
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verified">
              <Card>
                <CardHeader>
                  <CardTitle>인증된 소속</CardTitle>
                  <CardDescription>
                    소속이 인증된 사용자 목록입니다. 필요한 경우 인증을 취소할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
                        <p>인증된 소속 목록을 불러오는 중...</p>
                      </div>
                    </div>
                  ) : verifiedAffiliations.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-center">
                        <BadgeCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">인증된 소속이 없습니다</p>
                        <p className="text-muted-foreground">아직 인증된 소속이 없습니다.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>사용자</TableHead>
                            <TableHead>소속</TableHead>
                            <TableHead>인증일</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verifiedAffiliations.map((verification) => (
                            <TableRow key={verification.affiliationId}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    {verification.photoURL ? (
                                      <AvatarImage src={verification.photoURL} alt={verification.username} />
                                    ) : (
                                      <AvatarFallback>{getInitials(verification.username)}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{verification.username}</div>
                                    <div className="text-sm text-muted-foreground">{verification.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium flex items-center">
                                  {verification.affiliationName}
                                  <BadgeCheck className="ml-1 h-4 w-4 text-green-500" />
                                </div>
                                {verification.affiliationDepartment && (
                                  <div className="text-sm text-muted-foreground">
                                    {verification.affiliationDepartment}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(verification.verifiedAt)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                  onClick={() =>
                                    cancelVerification(
                                      verification.userId,
                                      verification.affiliationId,
                                      verification.username,
                                    )
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  인증 취소
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 확인 다이얼로그 */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.action === "approve" ? "소속 인증 승인" : "소속 인증 거부"}</DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "approve"
                ? `${confirmDialog.username}님의 소속 정보를 인증하시겠습니까?`
                : `${confirmDialog.username}님의 소속 인증 요청을 거부하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted">
              <Building className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm font-medium">소속 정보</p>
                <p className="text-lg font-bold">{confirmDialog.affiliationName}</p>
                {confirmDialog.affiliationDepartment && (
                  <p className="text-sm text-muted-foreground">{confirmDialog.affiliationDepartment}</p>
                )}
              </div>
            </div>

            {confirmDialog.action === "reject" && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                  거부된 요청은 사용자가 다시 제출할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              disabled={confirmDialog.isProcessing}
            >
              취소
            </Button>
            <Button
              variant={confirmDialog.action === "approve" ? "default" : "destructive"}
              onClick={confirmDialog.action === "approve" ? approveVerification : rejectVerification}
              disabled={confirmDialog.isProcessing}
            >
              {confirmDialog.isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : confirmDialog.action === "approve" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인하기
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  거부하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
