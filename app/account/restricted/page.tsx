"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { checkUserAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Ban, Clock, Shield, ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function RestrictedAccountPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [accessInfo, setAccessInfo] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (userProfile) {
      const info = checkUserAccess(userProfile)
      setAccessInfo(info)

      // 접근 가능한 사용자는 메인 페이지로 리다이렉트
      if (info.canAccess) {
        router.push("/")
      }
    }
  }, [user, userProfile, router])

  const getSanctionIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
      case "restriction":
        return <Shield className="h-6 w-6 text-blue-500" />
      case "suspension":
        return <Clock className="h-6 w-6 text-amber-500" />
      case "ban":
        return <Ban className="h-6 w-6 text-red-500" />
      default:
        return <AlertTriangle className="h-6 w-6" />
    }
  }

  const getSanctionBadge = (type: string) => {
    switch (type) {
      case "warning":
        return <Badge className="bg-yellow-500">경고</Badge>
      case "restriction":
        return <Badge className="bg-blue-500">제한</Badge>
      case "suspension":
        return <Badge className="bg-amber-500">일시 정지</Badge>
      case "ban":
        return <Badge className="bg-red-500">영구 정지</Badge>
      default:
        return <Badge variant="outline">알 수 없음</Badge>
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 없음"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "날짜 형식 오류"
    }
  }

  if (!userProfile || !accessInfo) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>계정 상태를 확인하는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const activeSanctions = userProfile.sanctions?.filter((s) => s.isActive) || []
  const mainSanction = accessInfo.sanctionInfo

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              메인 페이지로 돌아가기
            </Button>
          </div>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">{mainSanction && getSanctionIcon(mainSanction.type)}</div>
              <CardTitle className="text-2xl text-red-700">계정 접근 제한</CardTitle>
              <CardDescription className="text-red-600">{accessInfo.reason}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {mainSanction && (
                <div className="bg-white rounded-lg p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">현재 적용된 제재</h3>
                    {getSanctionBadge(mainSanction.type)}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">제재 사유:</span>
                      <p className="mt-1 text-gray-900">{mainSanction.reason}</p>
                    </div>

                    {mainSanction.details && (
                      <div>
                        <span className="font-medium text-gray-700">세부 내용:</span>
                        <p className="mt-1 text-gray-900">{mainSanction.details}</p>
                      </div>
                    )}

                    <div>
                      <span className="font-medium text-gray-700">적용일:</span>
                      <p className="mt-1 text-gray-900">{formatDate(mainSanction.appliedAt)}</p>
                    </div>

                    {mainSanction.expiresAt ? (
                      <div>
                        <span className="font-medium text-gray-700">해제 예정일:</span>
                        <p className="mt-1 text-gray-900">{formatDate(mainSanction.expiresAt)}</p>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-gray-700">기간:</span>
                        <p className="mt-1 text-red-600 font-medium">영구적</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSanctions.length > 1 && (
                <div className="bg-white rounded-lg p-6 border">
                  <h3 className="text-lg font-semibold mb-4">기타 활성 제재</h3>
                  <div className="space-y-3">
                    {activeSanctions
                      .filter((s) => s.id !== mainSanction?.id)
                      .map((sanction) => (
                        <div key={sanction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <div className="flex items-center gap-2">
                              {getSanctionBadge(sanction.type)}
                              <span className="font-medium">{sanction.reason}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">적용일: {formatDate(sanction.appliedAt)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">이의 제기 안내</h3>
                <p className="text-blue-700 mb-4">제재 조치에 대해 이의가 있으시면 관리자에게 문의해주세요.</p>
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => router.push("/contact")}
                >
                  관리자 문의하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
