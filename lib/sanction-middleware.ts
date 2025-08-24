"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"

// 사용자 접근 권한 확인 함수 (간단한 버전)
function checkUserAccess(userProfile: any) {
  if (!userProfile) {
    return { canAccess: false, reason: "로그인이 필요합니다." }
  }

  // 기본적으로 모든 사용자에게 접근 허용
  if (userProfile.status === "banned") {
    return { canAccess: false, reason: "계정이 정지되었습니다." }
  }

  if (userProfile.status === "suspended") {
    return { canAccess: false, reason: "계정이 일시 정지되었습니다." }
  }

  return { canAccess: true, reason: "" }
}

// 제재 상태 확인 훅
export function useSanctionCheck() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (userProfile) {
      const accessCheck = checkUserAccess(userProfile)

      if (!accessCheck.canAccess) {
        toast({
          title: "접근 제한",
          description: accessCheck.reason,
          variant: "destructive",
          duration: 5000,
        })

        // 제재된 사용자를 제재 정보 페이지로 리다이렉트
        router.push("/account/restricted")
      }
    }
  }, [userProfile, router, toast])

  return userProfile ? checkUserAccess(userProfile) : { canAccess: false }
}

// 특정 기능 접근 권한 확인
export function checkFeatureAccess(userProfile?: any, feature: string): boolean {
  if (!userProfile) return false

  const accessCheck = checkUserAccess(userProfile)
  if (!accessCheck.canAccess) return false

  // 제한된 사용자의 기능 접근 제한
  if (userProfile.status === "restricted") {
    const restrictedFeatures = ["community_post", "community_comment", "file_upload", "direct_message"]

    if (restrictedFeatures.includes(feature)) {
      return false
    }
  }

  return true
}
