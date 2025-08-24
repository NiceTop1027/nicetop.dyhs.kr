import { getFirestore, doc, updateDoc, Timestamp, getDoc, collection, getDocs } from "firebase/firestore"
import type { UserProfile, Affiliation, Sanction } from "./user-types"
import { sendNotificationToUser } from "./notification-utils"

// 관리자 권한 확인 함수
export function isAdmin(userProfile?: UserProfile | null): boolean {
  if (!userProfile) return false
  return userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
}

// 최고 관리자 확인 함수
export function isSuperAdmin(userProfile?: UserProfile | null): boolean {
  if (!userProfile) return false
  return userProfile.email === "mistarcodm@gmail.com"
}

// 사용자 칭호 업데이트 함수
export async function updateUserTitle(userId: string, title: string) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    await updateDoc(userRef, {
      title: title,
      updatedAt: Timestamp.now(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating user title:", error)
    return { success: false, error }
  }
}

// 사용자 소속 추가 함수
export async function addUserAffiliation(userId: string, affiliation: Partial<Affiliation>) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    // 현재 사용자 문서 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data() as UserProfile
    const currentAffiliations = userData.affiliations || []

    // 새 소속 정보 생성
    const newAffiliation: Affiliation = {
      id: `aff_${Date.now()}`,
      name: affiliation.name || "",
      department: affiliation.department || "",
      isVerified: affiliation.isVerified || false,
      verificationRequestDate: Timestamp.now(),
    }

    // 소속 정보 업데이트
    await updateDoc(userRef, {
      affiliations: [...currentAffiliations, newAffiliation],
      updatedAt: Timestamp.now(),
    })

    return { success: true, affiliation: newAffiliation }
  } catch (error) {
    console.error("Error adding user affiliation:", error)
    return { success: false, error }
  }
}

// 사용자 소속 삭제 함수
export async function removeUserAffiliation(userId: string, affiliationId: string) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    // 현재 사용자 문서 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data() as UserProfile
    const updatedAffiliations = (userData.affiliations || []).filter((aff) => aff.id !== affiliationId)

    // 소속 정보 업데이트
    await updateDoc(userRef, {
      affiliations: updatedAffiliations,
      updatedAt: Timestamp.now(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error removing user affiliation:", error)
    return { success: false, error }
  }
}

// 사용자 소속 인증 함수
export async function verifyUserAffiliation(userId: string, affiliationId: string, adminId: string) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    // 현재 사용자 문서 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data() as UserProfile
    const updatedAffiliations = (userData.affiliations || []).map((aff) => {
      if (aff.id === affiliationId) {
        return {
          ...aff,
          isVerified: true,
          verifiedBy: adminId,
          verifiedAt: Timestamp.now(),
        }
      }
      return aff
    })

    // 소속 정보 업데이트
    await updateDoc(userRef, {
      affiliations: updatedAffiliations,
      updatedAt: Timestamp.now(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error verifying user affiliation:", error)
    return { success: false, error }
  }
}

// 사용자 제재 적용 함수
export async function applySanction(
  userId: string,
  sanctionType: string,
  reason: string,
  adminId: string,
  duration?: number,
  details?: string,
) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    // 현재 사용자 문서 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data() as UserProfile
    const currentSanctions = userData.sanctions || []

    // 제재 정보 생성
    const now = Timestamp.now()
    let expiresAt = undefined

    if (duration) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + duration)
      expiresAt = Timestamp.fromDate(expiryDate)
    }

    const newSanction: Sanction = {
      id: `sanction_${Date.now()}`,
      type: sanctionType as "warning" | "restriction" | "suspension" | "ban",
      reason,
      appliedBy: adminId,
      appliedAt: now,
      expiresAt,
      isActive: true,
      details,
    }

    // 사용자 상태 업데이트
    let status = "active"
    if (sanctionType === "ban") {
      status = "banned"
    } else if (sanctionType === "suspension") {
      status = "suspended"
    } else if (sanctionType === "restriction") {
      status = "restricted"
    }

    // 제재 정보 업데이트
    await updateDoc(userRef, {
      sanctions: [...currentSanctions, newSanction],
      status,
      updatedAt: now,
    })

    // 제재 적용 후 사용자에게 알림 전송
    await sendNotificationToUser(
      userId,
      "admin_action",
      "계정 제재 알림",
      `귀하의 계정에 ${sanctionType} 제재가 적용되었습니다. 사유: ${reason}`,
      "/account/restricted",
      "high",
    )

    return { success: true, sanction: newSanction }
  } catch (error) {
    console.error("Error applying sanction:", error)
    return { success: false, error }
  }
}

// 제재 취소 함수
export async function cancelSanction(userId: string, sanctionId: string) {
  try {
    const db = getFirestore()
    const userRef = doc(db, "users", userId)

    // 현재 사용자 문서 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data() as UserProfile
    const updatedSanctions = (userData.sanctions || []).map((sanction) => {
      if (sanction.id === sanctionId) {
        return { ...sanction, isActive: false }
      }
      return sanction
    })

    // 활성 제재 확인
    const hasActiveSanctions = updatedSanctions.some((s) => s.isActive)
    let status = "active"

    if (hasActiveSanctions) {
      // 가장 심각한 제재 찾기
      if (updatedSanctions.some((s) => s.isActive && s.type === "ban")) {
        status = "banned"
      } else if (updatedSanctions.some((s) => s.isActive && s.type === "suspension")) {
        status = "suspended"
      } else if (updatedSanctions.some((s) => s.isActive && s.type === "restriction")) {
        status = "restricted"
      }
    }

    // 제재 정보 업데이트
    await updateDoc(userRef, {
      sanctions: updatedSanctions,
      status,
      updatedAt: Timestamp.now(),
    })

    // 제재 해제 알림
    if (status === "active") {
      await sendNotificationToUser(
        userId,
        "admin_action",
        "제재 해제 알림",
        "귀하의 계정 제재가 해제되었습니다.",
        "/mypage",
        "medium",
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error canceling sanction:", error)
    return { success: false, error }
  }
}

// 만료된 제재 자동 해제 함수
export async function checkExpiredSanctions() {
  try {
    const db = getFirestore()
    const usersRef = collection(db, "users")
    const now = Timestamp.now()

    const usersSnapshot = await getDocs(usersRef)

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserProfile
      if (!userData.sanctions) continue

      let hasChanges = false
      const updatedSanctions = userData.sanctions.map((sanction) => {
        if (sanction.isActive && sanction.expiresAt && sanction.expiresAt.toMillis() <= now.toMillis()) {
          hasChanges = true
          return { ...sanction, isActive: false }
        }
        return sanction
      })

      if (hasChanges) {
        // 활성 제재 확인하여 상태 업데이트
        const activeSanctions = updatedSanctions.filter((s) => s.isActive)
        let newStatus = "active"

        if (activeSanctions.some((s) => s.type === "ban")) {
          newStatus = "banned"
        } else if (activeSanctions.some((s) => s.type === "suspension")) {
          newStatus = "suspended"
        } else if (activeSanctions.some((s) => s.type === "restriction")) {
          newStatus = "restricted"
        }

        await updateDoc(userDoc.ref, {
          sanctions: updatedSanctions,
          status: newStatus,
          updatedAt: now,
        })

        // 제재 해제 알림
        if (newStatus === "active") {
          await sendNotificationToUser(
            userDoc.id,
            "admin_action",
            "제재 해제 알림",
            "귀하의 계정 제재가 해제되었습니다.",
            "/mypage",
            "medium",
          )
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error checking expired sanctions:", error)
    return { success: false, error }
  }
}

// 사용자 접근 권한 확인 함수
export function checkUserAccess(userProfile?: UserProfile | null): {
  canAccess: boolean
  reason?: string
  sanctionInfo?: Sanction
} {
  if (!userProfile) {
    return { canAccess: false, reason: "로그인이 필요합니다." }
  }

  if (userProfile.status === "banned") {
    const banSanction = userProfile.sanctions?.find((s) => s.isActive && s.type === "ban")
    return {
      canAccess: false,
      reason: "계정이 영구 정지되었습니다.",
      sanctionInfo: banSanction,
    }
  }

  if (userProfile.status === "suspended") {
    const suspensionSanction = userProfile.sanctions?.find((s) => s.isActive && s.type === "suspension")
    return {
      canAccess: false,
      reason: "계정이 일시 정지되었습니다.",
      sanctionInfo: suspensionSanction,
    }
  }

  return { canAccess: true }
}
