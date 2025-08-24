import {
  collection,
  doc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { Season, SeasonSettings } from "@/lib/season-types"
import type { UserProfile } from "@/lib/user-types"
import { sendNotificationToUser } from "@/lib/notification-utils"

// 새 시즌 생성 및 점수 초기화
export async function createSeasonWithReset(
  seasonData: {
    name: string
    description: string
    startDate: Date
    endDate: Date
    settings: SeasonSettings
  },
  adminId: string,
  adminName: string,
) {
  try {
    const batch = writeBatch(db)

    // 1. 기존 활성 시즌 비활성화
    const seasonsRef = collection(db, "seasons")
    const activeSeasonsQuery = query(seasonsRef, where("isActive", "==", true))
    const activeSeasons = await getDocs(activeSeasonsQuery)

    activeSeasons.forEach((seasonDoc) => {
      batch.update(seasonDoc.ref, {
        isActive: false,
        updatedAt: Timestamp.now(),
      })
    })

    // 2. 새 시즌 생성
    const newSeasonRef = doc(collection(db, "seasons"))
    const newSeason: Omit<Season, "id"> = {
      name: seasonData.name,
      description: seasonData.description,
      startDate: Timestamp.fromDate(seasonData.startDate),
      endDate: Timestamp.fromDate(seasonData.endDate),
      isActive: true,
      isDefault: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: adminId,
      createdByName: adminName,
      settings: seasonData.settings,
      stats: {
        totalParticipants: 0,
        totalChallenges: 0,
        totalSolves: 0,
        averageScore: 0,
        topScore: 0,
      },
    }

    batch.set(newSeasonRef, newSeason)

    // 3. 점수 초기화가 설정된 경우 사용자 점수 초기화
    if (seasonData.settings.resetScoresOnStart) {
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      usersSnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          ctfPoints: 0,
          wargamePoints: 0,
          points: 0,
          seasonRank: null,
          lastSeasonReset: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
      })

      // 4. 기존 시즌 참가자 데이터 아카이브
      const participantsRef = collection(db, "season_participants")
      const participantsSnapshot = await getDocs(participantsRef)

      participantsSnapshot.forEach((participantDoc) => {
        const archiveRef = doc(collection(db, "season_participants_archive"))
        batch.set(archiveRef, {
          ...participantDoc.data(),
          archivedAt: Timestamp.now(),
          archivedSeasonId: participantDoc.data().seasonId,
        })
        batch.delete(participantDoc.ref)
      })
    }

    // 5. 모든 사용자를 새 시즌에 자동 등록
    if (!seasonData.settings.registrationRequired) {
      const usersSnapshot = await getDocs(collection(db, "users"))

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data() as UserProfile
        const participantRef = doc(collection(db, "season_participants"))

        batch.set(participantRef, {
          seasonId: newSeasonRef.id,
          userId: userDoc.id,
          userName: userData.username || userData.displayName || "사용자",
          userEmail: userData.email || "",
          joinedAt: Timestamp.now(),
          totalScore: 0,
          rank: 0,
          isActive: true,
        })
      })
    }

    await batch.commit()

    // 6. 모든 사용자에게 새 시즌 시작 알림
    const usersSnapshot = await getDocs(collection(db, "users"))
    const notificationPromises = usersSnapshot.docs.map((userDoc) =>
      sendNotificationToUser(
        userDoc.id,
        "season_start",
        "새 시즌 시작!",
        `${seasonData.name}이(가) 시작되었습니다. ${seasonData.settings.resetScoresOnStart ? "모든 점수가 초기화되었습니다." : ""}`,
        "/ranking",
        "medium",
      ),
    )

    await Promise.all(notificationPromises)

    return {
      success: true,
      seasonId: newSeasonRef.id,
      message: `새 시즌 "${seasonData.name}"이 생성되었습니다.`,
    }
  } catch (error) {
    console.error("Error creating season with reset:", error)
    return { success: false, error }
  }
}

// 시즌 종료 및 결과 아카이브
export async function endSeason(seasonId: string, adminId: string) {
  try {
    const batch = writeBatch(db)

    // 1. 시즌 비활성화
    const seasonRef = doc(db, "seasons", seasonId)
    batch.update(seasonRef, {
      isActive: false,
      endedAt: Timestamp.now(),
      endedBy: adminId,
      updatedAt: Timestamp.now(),
    })

    // 2. 최종 순위 계산 및 저장
    const participantsRef = collection(db, "season_participants")
    const participantsQuery = query(participantsRef, where("seasonId", "==", seasonId), orderBy("totalScore", "desc"))
    const participantsSnapshot = await getDocs(participantsQuery)

    const finalRankings: any[] = []
    participantsSnapshot.forEach((doc, index) => {
      const data = doc.data()
      const finalRank = index + 1

      finalRankings.push({
        ...data,
        finalRank,
        endedAt: Timestamp.now(),
      })

      // 참가자 최종 순위 업데이트
      batch.update(doc.ref, {
        finalRank,
        isActive: false,
        endedAt: Timestamp.now(),
      })
    })

    // 3. 시즌 결과 아카이브 생성
    const archiveRef = doc(collection(db, "season_archives"))
    batch.set(archiveRef, {
      seasonId,
      finalRankings,
      totalParticipants: finalRankings.length,
      topScore: finalRankings[0]?.totalScore || 0,
      averageScore: finalRankings.reduce((sum, p) => sum + p.totalScore, 0) / finalRankings.length || 0,
      archivedAt: Timestamp.now(),
      archivedBy: adminId,
    })

    await batch.commit()

    // 4. 상위 참가자들에게 축하 알림
    const topParticipants = finalRankings.slice(0, 3)
    const congratulationPromises = topParticipants.map((participant, index) => {
      const rank = index + 1
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"

      return sendNotificationToUser(
        participant.userId,
        "season_end",
        `시즌 종료 - ${rank}등 달성! ${medal}`,
        `축하합니다! 시즌에서 ${rank}등을 달성하셨습니다.`,
        "/ranking",
        "high",
      )
    })

    await Promise.all(congratulationPromises)

    return { success: true, finalRankings }
  } catch (error) {
    console.error("Error ending season:", error)
    return { success: false, error }
  }
}

// 시즌 참가자 점수 업데이트
export async function updateSeasonParticipantScore(
  userId: string,
  scoreType: "ctf" | "wargame" | "curriculum",
  points: number,
  reason: string,
) {
  try {
    // 1. 현재 활성 시즌 찾기
    const seasonsRef = collection(db, "seasons")
    const activeSeasonQuery = query(seasonsRef, where("isActive", "==", true))
    const activeSeasonSnapshot = await getDocs(activeSeasonQuery)

    if (activeSeasonSnapshot.empty) {
      return { success: false, error: "활성 시즌이 없습니다." }
    }

    const activeSeason = activeSeasonSnapshot.docs[0]
    const seasonId = activeSeason.id

    // 2. 참가자 정보 찾기 또는 생성
    const participantsRef = collection(db, "season_participants")
    const participantQuery = query(participantsRef, where("seasonId", "==", seasonId), where("userId", "==", userId))
    const participantSnapshot = await getDocs(participantQuery)

    let participantRef
    if (participantSnapshot.empty) {
      // 새 참가자 생성
      const userDoc = await getDoc(doc(db, "users", userId))
      if (!userDoc.exists()) {
        return { success: false, error: "사용자를 찾을 수 없습니다." }
      }

      const userData = userDoc.data() as UserProfile
      participantRef = doc(collection(db, "season_participants"))

      await addDoc(collection(db, "season_participants"), {
        seasonId,
        userId,
        userName: userData.username || userData.displayName || "사용자",
        userEmail: userData.email || "",
        joinedAt: Timestamp.now(),
        totalScore: points,
        rank: 0,
        isActive: true,
      })
    } else {
      // 기존 참가자 점수 업데이트
      participantRef = participantSnapshot.docs[0].ref
      const currentData = participantSnapshot.docs[0].data()

      await updateDoc(participantRef, {
        totalScore: (currentData.totalScore || 0) + points,
        updatedAt: Timestamp.now(),
      })
    }

    // 3. 점수 히스토리 기록
    await addDoc(collection(db, "season_score_history"), {
      seasonId,
      userId,
      scoreType,
      points,
      reason,
      timestamp: Timestamp.now(),
    })

    // 4. 순위 재계산
    await recalculateSeasonRankings(seasonId)

    return { success: true }
  } catch (error) {
    console.error("Error updating season participant score:", error)
    return { success: false, error }
  }
}

// 시즌 순위 재계산
export async function recalculateSeasonRankings(seasonId: string) {
  try {
    const participantsRef = collection(db, "season_participants")
    const participantsQuery = query(participantsRef, where("seasonId", "==", seasonId), orderBy("totalScore", "desc"))
    const participantsSnapshot = await getDocs(participantsQuery)

    const batch = writeBatch(db)

    participantsSnapshot.forEach((doc, index) => {
      batch.update(doc.ref, {
        rank: index + 1,
        updatedAt: Timestamp.now(),
      })
    })

    // 시즌 통계 업데이트
    const seasonRef = doc(db, "seasons", seasonId)
    const totalParticipants = participantsSnapshot.size
    const scores = participantsSnapshot.docs.map((doc) => doc.data().totalScore || 0)
    const topScore = scores[0] || 0
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalParticipants || 0

    batch.update(seasonRef, {
      "stats.totalParticipants": totalParticipants,
      "stats.topScore": topScore,
      "stats.averageScore": averageScore,
      updatedAt: Timestamp.now(),
    })

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error("Error recalculating season rankings:", error)
    return { success: false, error }
  }
}

// 시즌별 리더보드 가져오기
export async function getSeasonLeaderboard(seasonId: string, limit = 100) {
  try {
    const participantsRef = collection(db, "season_participants")
    const participantsQuery = query(
      participantsRef,
      where("seasonId", "==", seasonId),
      orderBy("totalScore", "desc"),
      orderBy("updatedAt", "asc"),
    )

    const participantsSnapshot = await getDocs(participantsQuery)
    const leaderboard = participantsSnapshot.docs.slice(0, limit).map((doc, index) => ({
      id: doc.id,
      ...doc.data(),
      rank: index + 1,
    }))

    return { success: true, leaderboard }
  } catch (error) {
    console.error("Error getting season leaderboard:", error)
    return { success: false, error }
  }
}

// 사용자의 시즌 참가 기록 가져오기
export async function getUserSeasonHistory(userId: string) {
  try {
    // 현재 시즌 참가 정보
    const currentParticipantsRef = collection(db, "season_participants")
    const currentQuery = query(currentParticipantsRef, where("userId", "==", userId))
    const currentSnapshot = await getDocs(currentQuery)

    // 과거 시즌 아카이브 정보
    const archiveParticipantsRef = collection(db, "season_participants_archive")
    const archiveQuery = query(archiveParticipantsRef, where("userId", "==", userId))
    const archiveSnapshot = await getDocs(archiveQuery)

    const history = [
      ...currentSnapshot.docs.map((doc) => ({ ...doc.data(), type: "current" })),
      ...archiveSnapshot.docs.map((doc) => ({ ...doc.data(), type: "archived" })),
    ]

    return { success: true, history }
  } catch (error) {
    console.error("Error getting user season history:", error)
    return { success: false, error }
  }
}

// 시즌 통계 대시보드 데이터
export async function getSeasonDashboardData(seasonId: string) {
  try {
    // 시즌 기본 정보
    const seasonDoc = await getDoc(doc(db, "seasons", seasonId))
    if (!seasonDoc.exists()) {
      return { success: false, error: "시즌을 찾을 수 없습니다." }
    }

    const seasonData = seasonDoc.data() as Season

    // 참가자 통계
    const participantsRef = collection(db, "season_participants")
    const participantsQuery = query(participantsRef, where("seasonId", "==", seasonId))
    const participantsSnapshot = await getDocs(participantsQuery)

    // 점수 분포 계산
    const scores = participantsSnapshot.docs.map((doc) => doc.data().totalScore || 0)
    const scoreDistribution = {
      "0-100": scores.filter((s) => s >= 0 && s <= 100).length,
      "101-500": scores.filter((s) => s > 100 && s <= 500).length,
      "501-1000": scores.filter((s) => s > 500 && s <= 1000).length,
      "1001-2000": scores.filter((s) => s > 1000 && s <= 2000).length,
      "2000+": scores.filter((s) => s > 2000).length,
    }

    // 일별 활동 통계
    const scoreHistoryRef = collection(db, "season_score_history")
    const historyQuery = query(scoreHistoryRef, where("seasonId", "==", seasonId))
    const historySnapshot = await getDocs(historyQuery)

    const dailyActivity: Record<string, number> = {}
    historySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const date = data.timestamp.toDate().toISOString().split("T")[0]
      dailyActivity[date] = (dailyActivity[date] || 0) + 1
    })

    return {
      success: true,
      data: {
        season: seasonData,
        totalParticipants: participantsSnapshot.size,
        scoreDistribution,
        dailyActivity,
        topScorers: participantsSnapshot.docs
          .sort((a, b) => (b.data().totalScore || 0) - (a.data().totalScore || 0))
          .slice(0, 10)
          .map((doc, index) => ({
            rank: index + 1,
            ...doc.data(),
          })),
      },
    }
  } catch (error) {
    console.error("Error getting season dashboard data:", error)
    return { success: false, error }
  }
}
