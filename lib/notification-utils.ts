import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { NotificationType, NotificationSettings } from "@/lib/notification-types"
import { Timestamp } from "firebase/firestore"

// 알림 유형
// export type NotificationType =
//   | "announcement"  // 공지사항
//   | "affiliation"   // 소속 인증
//   | "ctf"           // CTF 관련
//   | "wargame"       // 워게임 관련
//   | "system"        // 시스템 알림
//   | "message"       // 메시지

// 알림 생성 함수
export async function createNotification({
  userId,
  title,
  message,
  type,
  link = "",
}: {
  userId: string
  title: string
  message: string
  type: NotificationType
  link?: string
}) {
  try {
    const notificationData = {
      userId,
      title,
      message,
      type,
      link,
      read: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "notifications"), notificationData)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
  }
}

// 여러 사용자에게 알림 전송 (예: 공지사항)
export async function sendNotificationToUsers({
  userIds,
  title,
  message,
  type,
  link = "",
}: {
  userIds: string[]
  title: string
  message: string
  type: NotificationType
  link?: string
}) {
  try {
    const promises = userIds.map((userId) =>
      createNotification({
        userId,
        title,
        message,
        type,
        link,
      }),
    )

    const results = await Promise.all(promises)
    return {
      success: true,
      results,
      successCount: results.filter((r) => r.success).length,
      failCount: results.filter((r) => !r.success).length,
    }
  } catch (error) {
    console.error("Error sending notifications to users:", error)
    return { success: false, error }
  }
}

// 모든 사용자에게 알림 전송 (예: 중요 공지사항)
export async function sendNotificationToAllUsers(type: NotificationType, title: string, message: string, link = "") {
  try {
    // 모든 사용자 ID 가져오기
    const usersRef = collection(db, "users")
    const usersSnapshot = await getDocs(usersRef)

    const userIds: string[] = []
    usersSnapshot.forEach((doc) => {
      userIds.push(doc.id)
    })

    return sendNotificationToUsers({
      userIds,
      title,
      message,
      type,
      link,
    })
  } catch (error) {
    console.error("Error sending notifications to all users:", error)
    return { success: false, error }
  }
}

/**
 * 특정 사용자에게 알림을 보냅니다.
 */
export async function sendNotificationToUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  priority: "low" | "medium" | "high" = "medium",
  expiresAt?: Date,
) {
  try {
    if (!userId) {
      console.error("Invalid userId provided to sendNotificationToUser")
      return false
    }

    // 사용자 존재 여부 확인
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.error(`User with ID ${userId} does not exist`)
      return false
    }

    // 사용자 알림 설정 확인
    const userSettings = await getUserNotificationSettings(userId)

    // 해당 타입의 알림이 비활성화되어 있으면 알림을 보내지 않음
    if (userSettings && !isNotificationTypeEnabled(userSettings, type)) {
      console.log(`Notification type ${type} is disabled for user ${userId}`)
      return false
    }

    // 알림 생성 - 여기서 read 필드를 사용하도록 수정
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      title,
      message,
      link,
      read: false, // isRead 대신 read 필드 사용
      createdAt: serverTimestamp(),
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      priority,
    })

    return true
  } catch (error) {
    console.error("Error sending notification:", error)
    return false
  }
}

/**
 * 사용자의 알림 설정에서 특정 타입의 알림이 활성화되어 있는지 확인합니다.
 */
function isNotificationTypeEnabled(settings: NotificationSettings, type: NotificationType): boolean {
  switch (type) {
    case "announcement":
      return settings.enableAnnouncements
    case "ctf":
      return settings.enableCtf
    case "wargame":
      return settings.enableWargame
    case "community":
      return settings.enableCommunity
    case "verification":
      return settings.enableVerification
    case "system":
      return settings.enableSystem
    case "achievement":
      return settings.enableAchievements
    case "level_up":
      return settings.enableLevelUp
    case "tier_up":
      return settings.enableTierUp
    case "admin_action":
      return settings.enableAdminAction
    default:
      return true
  }
}

/**
 * 사용자의 알림 설정을 가져옵니다.
 */
async function getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const settingsRef = doc(db, "notification_settings", userId)
    const settingsDoc = await getDoc(settingsRef)

    if (settingsDoc.exists()) {
      return settingsDoc.data() as NotificationSettings
    }

    // 설정이 없으면 기본 설정 생성
    const defaultSettings: NotificationSettings = {
      userId,
      enableAnnouncements: true,
      enableCtf: true,
      enableWargame: true,
      enableCommunity: true,
      enableVerification: true,
      enableSystem: true,
      enableAchievements: true,
      enableLevelUp: true,
      enableTierUp: true,
      enableAdminAction: true,
      emailNotifications: false,
      updatedAt: Timestamp.now(),
    }

    // 기본 설정 저장
    await setDoc(settingsRef, defaultSettings)

    return defaultSettings
  } catch (error) {
    console.error("Error getting user notification settings:", error)
    return null
  }
}

/**
 * 모든 관리자에게 알림을 보냅니다.
 */
export async function sendNotificationToAllAdmins(
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  priority: "low" | "medium" | "high" = "high",
  excludeUserId?: string,
) {
  try {
    // 관리자 목록 가져오기
    const usersRef = collection(db, "users")
    const adminQuery = query(usersRef, where("role", "==", "admin"))
    const adminSnapshot = await getDocs(adminQuery)

    const notifications = []

    adminSnapshot.forEach((doc) => {
      const adminId = doc.id

      // 제외할 사용자 ID가 있으면 건너뛰기
      if (excludeUserId && adminId === excludeUserId) return

      notifications.push(sendNotificationToUser(adminId, type, title, message, link, priority))
    })

    await Promise.all(notifications)
    return true
  } catch (error) {
    console.error("Error sending notifications to admins:", error)
    return false
  }
}

/**
 * 특정 역할을 가진 사용자들에게 알림을 보냅니다.
 */
export async function sendNotificationByRole(
  role: "user" | "admin" | "superadmin",
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
) {
  try {
    // 특정 역할을 가진 사용자 목록 가져오기
    const usersRef = collection(db, "users")
    const roleQuery = query(usersRef, where("role", "==", role))
    const roleSnapshot = await getDocs(roleQuery)

    const notifications = []

    roleSnapshot.forEach((doc) => {
      notifications.push(
        addDoc(collection(db, "notifications"), {
          userId: doc.id,
          type,
          title,
          message,
          link,
          read: false,
          createdAt: serverTimestamp(),
        }),
      )
    })

    await Promise.all(notifications)
    return true
  } catch (error) {
    console.error(`Error sending notifications to ${role}s:`, error)
    return false
  }
}

/**
 * 특정 이벤트에 대한 알림을 보냅니다.
 */
export async function sendEventNotification(
  event:
    | "rank_change"
    | "achievement_earned"
    | "level_up"
    | "tier_up"
    | "affiliation_verified"
    | "ctf_started"
    | "ctf_ended"
    | "new_challenge",
  userId: string,
  data: any,
) {
  try {
    switch (event) {
      case "rank_change":
        return await sendNotificationToUser(
          userId,
          "system",
          "랭킹 변동 알림",
          `당신의 랭킹이 ${data.oldRank}위에서 ${data.newRank}위로 변경되었습니다.`,
          "/ranking",
          "medium",
        )

      case "achievement_earned":
        return await sendNotificationToUser(
          userId,
          "achievement",
          "새로운 업적 획득!",
          `축하합니다! "${data.achievementName}" 업적을 획득하셨습니다.`,
          "/mypage",
          "high",
        )

      case "level_up":
        return await sendNotificationToUser(
          userId,
          "level_up",
          "레벨 업!",
          `축하합니다! 레벨 ${data.newLevel}에 도달하셨습니다.`,
          "/mypage",
          "high",
        )

      case "tier_up":
        return await sendNotificationToUser(
          userId,
          "tier_up",
          "티어 승급!",
          `축하합니다! ${data.newTier} 티어에 도달하셨습니다.`,
          "/ranking",
          "high",
        )

      case "affiliation_verified":
        return await sendNotificationToUser(
          userId,
          "verification",
          "소속 인증 완료",
          `"${data.affiliationName}" 소속이 성공적으로 인증되었습니다.`,
          "/profile",
          "medium",
        )

      case "ctf_started":
        return await sendNotificationToUser(
          userId,
          "ctf",
          "CTF 대회 시작",
          `"${data.ctfName}" 대회가 시작되었습니다. 지금 참여하세요!`,
          `/ctf/${data.ctfId}`,
          "high",
        )

      case "ctf_ended":
        return await sendNotificationToUser(
          userId,
          "ctf",
          "CTF 대회 종료",
          `"${data.ctfName}" 대회가 종료되었습니다. 결과를 확인하세요.`,
          `/ctf/${data.ctfId}`,
          "medium",
        )

      case "new_challenge":
        return await sendNotificationToUser(
          userId,
          "wargame",
          "새로운 문제 추가",
          `"${data.challengeName}" 문제가 추가되었습니다. 지금 도전하세요!`,
          `/wargame/${data.challengeId}`,
          "medium",
        )

      default:
        return false
    }
  } catch (error) {
    console.error(`Error sending ${event} notification:`, error)
    return false
  }
}

/**
 * 새로운 워게임 문제가 추가되었을 때 모든 사용자에게 알림을 보냅니다.
 */
export async function sendNewWargameChallengeNotification(
  challengeId: string,
  title: string,
  category: string,
  difficulty: string,
) {
  try {
    const message = `새로운 ${category} 분야의 ${difficulty} 난이도 문제 "${title}"가 추가되었습니다. 지금 도전해보세요!`
    return await sendNotificationToAllUsers("wargame", "새로운 워게임 문제 추가", message, `/wargame/${challengeId}`)
  } catch (error) {
    console.error("Error sending new wargame challenge notification:", error)
    return { success: false, error }
  }
}

/**
 * 새로운 CTF 대회가 생성되었을 때 모든 사용자에게 알림을 보냅니다.
 */
export async function sendNewCTFContestNotification(contestId: string, title: string, startTime: Date) {
  try {
    const formattedDate = startTime.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const message = `새로운 CTF 대회 "${title}"가 개설되었습니다. 대회는 ${formattedDate}에 시작됩니다. 지금 확인해보세요!`

    return await sendNotificationToAllUsers("ctf", "새로운 CTF 대회 개설", message, `/ctf/${contestId}`)
  } catch (error) {
    console.error("Error sending new CTF contest notification:", error)
    return { success: false, error }
  }
}

/**
 * CTF 대회 결과를 모든 사용자에게 알림으로 보냅니다.
 */
export async function sendCTFResultsNotification(
  contestId: string,
  contestTitle: string,
  topRankers: Array<{ rank: number; username: string; score: number }>,
) {
  try {
    let rankersText = ""

    topRankers.forEach((ranker) => {
      rankersText += `${ranker.rank}위: ${ranker.username} (${ranker.score}점)\n`
    })

    const message = `"${contestTitle}" CTF 대회가 종료되었습니다.\n\n🏆 최종 순위 🏆\n${rankersText}\n전체 결과를 확인해보세요!`

    return await sendNotificationToAllUsers("ctf", `${contestTitle} CTF 대회 결과 발표`, message, `/ctf/${contestId}`)
  } catch (error) {
    console.error("Error sending CTF results notification:", error)
    return { success: false, error }
  }
}
