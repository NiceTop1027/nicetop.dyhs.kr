import { getFirestore, doc, updateDoc, getDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import type { UserProfile, ProfileFrame, Achievement } from "./user-types"

// 프로필 프레임 관리
export class ProfileFrameManager {
  private db = getFirestore()

  async unlockFrame(userId: string, frameId: string): Promise<boolean> {
    try {
      const userRef = doc(this.db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) return false

      const userData = userDoc.data() as UserProfile
      const unlockedFrames = userData.unlockedFrames || []

      if (!unlockedFrames.includes(frameId)) {
        await updateDoc(userRef, {
          unlockedFrames: [...unlockedFrames, frameId],
          updatedAt: Timestamp.now(),
        })
      }

      return true
    } catch (error) {
      console.error("Error unlocking frame:", error)
      return false
    }
  }

  async setActiveFrame(userId: string, frameId: string): Promise<boolean> {
    try {
      const userRef = doc(this.db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) return false

      const userData = userDoc.data() as UserProfile
      const unlockedFrames = userData.unlockedFrames || []

      if (!unlockedFrames.includes(frameId) && frameId !== "default") {
        return false // 잠금 해제되지 않은 프레임
      }

      await updateDoc(userRef, {
        profileFrameId: frameId,
        updatedAt: Timestamp.now(),
      })

      return true
    } catch (error) {
      console.error("Error setting active frame:", error)
      return false
    }
  }

  async getAvailableFrames(userId: string): Promise<ProfileFrame[]> {
    try {
      const framesRef = collection(this.db, "profile_frames")
      const framesSnapshot = await getDocs(framesRef)

      const userRef = doc(this.db, "users", userId)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.exists() ? (userDoc.data() as UserProfile) : null
      const unlockedFrames = userData?.unlockedFrames || []

      const frames: ProfileFrame[] = []
      framesSnapshot.forEach((doc) => {
        const frame = { id: doc.id, ...doc.data() } as ProfileFrame
        if (unlockedFrames.includes(frame.id) || frame.id === "default") {
          frames.push(frame)
        }
      })

      return frames
    } catch (error) {
      console.error("Error getting available frames:", error)
      return []
    }
  }
}

// 업적 시스템
export class AchievementManager {
  private db = getFirestore()

  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
      const userRef = doc(this.db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) return []

      const userData = userDoc.data() as UserProfile
      const unlockedAchievements = userData.unlockedAchievements || []

      // 모든 업적 가져오기
      const achievementsRef = collection(this.db, "achievements")
      const achievementsSnapshot = await getDocs(achievementsRef)

      const newlyUnlocked: Achievement[] = []

      for (const achievementDoc of achievementsSnapshot.docs) {
        const achievement = { id: achievementDoc.id, ...achievementDoc.data() } as Achievement

        if (unlockedAchievements.includes(achievement.id)) continue

        // 업적 조건 확인
        if (await this.checkAchievementCondition(userData, achievement)) {
          await this.unlockAchievement(userId, achievement.id)
          newlyUnlocked.push(achievement)

          // 보상 지급
          if (achievement.reward) {
            await this.grantAchievementReward(userId, achievement.reward)
          }
        }
      }

      return newlyUnlocked
    } catch (error) {
      console.error("Error checking achievements:", error)
      return []
    }
  }

  private async checkAchievementCondition(userData: UserProfile, achievement: Achievement): Promise<boolean> {
    switch (achievement.condition) {
      case "solve_10_problems":
        return userData.solvedChallenges.length >= 10
      case "solve_50_problems":
        return userData.solvedChallenges.length >= 50
      case "solve_100_problems":
        return userData.solvedChallenges.length >= 100
      case "reach_level_10":
        return (userData.level || 1) >= 10
      case "reach_level_25":
        return (userData.level || 1) >= 25
      case "first_ctf_win":
        return userData.ctfPoints > 0
      case "streak_7_days":
        return (userData.streak || 0) >= 7
      case "streak_30_days":
        return (userData.streak || 0) >= 30
      default:
        return false
    }
  }

  private async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    const userRef = doc(this.db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile
      const unlockedAchievements = userData.unlockedAchievements || []

      await updateDoc(userRef, {
        unlockedAchievements: [...unlockedAchievements, achievementId],
        updatedAt: Timestamp.now(),
      })
    }
  }

  private async grantAchievementReward(userId: string, reward: any): Promise<void> {
    const userRef = doc(this.db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile
      const updates: any = {}

      if (reward.points) {
        updates.points = (userData.points || 0) + reward.points
      }

      if (reward.exp) {
        updates.exp = (userData.exp || 0) + reward.exp
      }

      if (reward.frame) {
        const unlockedFrames = userData.unlockedFrames || []
        if (!unlockedFrames.includes(reward.frame)) {
          updates.unlockedFrames = [...unlockedFrames, reward.frame]
        }
      }

      if (reward.theme) {
        const unlockedThemes = userData.unlockedThemes || []
        if (!unlockedThemes.includes(reward.theme)) {
          updates.unlockedThemes = [...unlockedThemes, reward.theme]
        }
      }

      if (reward.title) {
        const unlockedTitles = userData.unlockedTitles || []
        if (!unlockedTitles.includes(reward.title)) {
          updates.unlockedTitles = [...unlockedTitles, reward.title]
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = Timestamp.now()
        await updateDoc(userRef, updates)
      }
    }
  }
}

// 프로필 통계 계산
export class ProfileStatsCalculator {
  private db = getFirestore()

  async calculateUserStats(userId: string): Promise<any> {
    try {
      // 해결 로그에서 통계 계산
      const solveLogsRef = collection(this.db, "user_solve_logs")
      const userLogsQuery = query(solveLogsRef, where("userId", "==", userId))
      const logsSnapshot = await getDocs(userLogsQuery)

      const stats = {
        totalProblemsAttempted: 0,
        totalProblemsSolved: logsSnapshot.size,
        averageSolveTime: 0,
        longestStreak: 0,
        currentStreak: 0,
        favoriteCategory: "",
        totalTimeSpent: 0,
        firstSolveDate: null as Timestamp | null,
        lastSolveDate: null as Timestamp | null,
        weeklyActivity: new Array(7).fill(0),
        monthlyActivity: new Array(30).fill(0),
      }

      const categoryCount: Record<string, number> = {}
      const solveTimes: number[] = []
      const solveDates: Date[] = []

      logsSnapshot.forEach((doc) => {
        const data = doc.data()

        // 카테고리 통계
        const category = data.category || "기타"
        categoryCount[category] = (categoryCount[category] || 0) + 1

        // 해결 시간 통계
        if (data.solveTime) {
          solveTimes.push(data.solveTime)
        }

        // 날짜 통계
        if (data.solvedAt) {
          const date = data.solvedAt.toDate()
          solveDates.push(date)

          if (!stats.firstSolveDate || date < stats.firstSolveDate.toDate()) {
            stats.firstSolveDate = data.solvedAt
          }

          if (!stats.lastSolveDate || date > stats.lastSolveDate.toDate()) {
            stats.lastSolveDate = data.solvedAt
          }
        }
      })

      // 평균 해결 시간 계산
      if (solveTimes.length > 0) {
        stats.averageSolveTime = solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length
      }

      // 가장 좋아하는 카테고리
      let maxCount = 0
      for (const [category, count] of Object.entries(categoryCount)) {
        if (count > maxCount) {
          maxCount = count
          stats.favoriteCategory = category
        }
      }

      // 주간/월간 활동 계산
      const now = new Date()
      solveDates.forEach((date) => {
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff < 7) {
          stats.weeklyActivity[6 - daysDiff]++
        }

        if (daysDiff < 30) {
          stats.monthlyActivity[29 - daysDiff]++
        }
      })

      return stats
    } catch (error) {
      console.error("Error calculating user stats:", error)
      return null
    }
  }
}

// 프로필 시스템 통합 관리자
export class ProfileSystemManager {
  frameManager = new ProfileFrameManager()
  achievementManager = new AchievementManager()
  statsCalculator = new ProfileStatsCalculator()

  async initializeUserProfile(userId: string): Promise<void> {
    try {
      // 기본 프레임 잠금 해제
      await this.frameManager.unlockFrame(userId, "default")

      // 업적 확인
      await this.achievementManager.checkAndUnlockAchievements(userId)

      // 통계 계산
      const stats = await this.statsCalculator.calculateUserStats(userId)

      if (stats) {
        const userRef = doc(getFirestore(), "users", userId)
        await updateDoc(userRef, {
          stats,
          updatedAt: Timestamp.now(),
        })
      }
    } catch (error) {
      console.error("Error initializing user profile:", error)
    }
  }
}
