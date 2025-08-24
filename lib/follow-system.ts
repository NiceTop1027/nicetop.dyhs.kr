import { getFirestore, doc, getDoc, Timestamp, runTransaction } from "firebase/firestore"

export interface FollowData {
  userId: string
  username: string
  photoURL?: string
  followedAt: Timestamp
}

export class FollowSystem {
  private db = getFirestore()

  // 팔로우하기
  async followUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (currentUserId === targetUserId) return false

    try {
      // 이미 팔로우 중인지 확인
      const isAlreadyFollowing = await this.isFollowing(currentUserId, targetUserId)
      if (isAlreadyFollowing) {
        console.log("Already following this user")
        return true // 이미 팔로우 중이므로 성공으로 처리
      }

      // 트랜잭션 시작
      await runTransaction(this.db, async (transaction) => {
        // 현재 사용자와 대상 사용자 정보 가져오기
        const currentUserDoc = await transaction.get(doc(this.db, "users", currentUserId))
        const targetUserDoc = await transaction.get(doc(this.db, "users", targetUserId))

        if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
          throw new Error("사용자 정보를 찾을 수 없습니다.")
        }

        const currentUserData = currentUserDoc.data()
        const targetUserData = targetUserDoc.data()

        // 기존 팔로우 목록에서 중복 확인
        const currentFollowing = currentUserData.following || []
        const targetFollowers = targetUserData.followers || []

        const alreadyFollowing = currentFollowing.some((f: FollowData) => f.userId === targetUserId)
        const alreadyFollower = targetFollowers.some((f: FollowData) => f.userId === currentUserId)

        if (alreadyFollowing || alreadyFollower) {
          console.log("Duplicate follow attempt detected")
          return // 이미 존재하면 추가하지 않음
        }

        const followData: FollowData = {
          userId: targetUserId,
          username: targetUserData.username || "사용자",
          photoURL: targetUserData.photoURL,
          followedAt: Timestamp.now(),
        }

        const followerData: FollowData = {
          userId: currentUserId,
          username: currentUserData.username || "사용자",
          photoURL: currentUserData.photoURL,
          followedAt: Timestamp.now(),
        }

        // 중복 제거된 배열 생성
        const updatedFollowing = [...currentFollowing.filter((f: FollowData) => f.userId !== targetUserId), followData]
        const updatedFollowers = [
          ...targetFollowers.filter((f: FollowData) => f.userId !== currentUserId),
          followerData,
        ]

        // 현재 사용자의 following에 추가, 대상 사용자의 followers에 추가
        transaction.update(doc(this.db, "users", currentUserId), {
          following: updatedFollowing,
          followingCount: updatedFollowing.length,
          updatedAt: Timestamp.now(),
        })
        transaction.update(doc(this.db, "users", targetUserId), {
          followers: updatedFollowers,
          followersCount: updatedFollowers.length,
          updatedAt: Timestamp.now(),
        })
      })
      // 트랜잭션 종료

      return true
    } catch (error) {
      console.error("Error following user:", error)
      return false
    }
  }

  // 언팔로우하기
  async unfollowUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (currentUserId === targetUserId) return false

    try {
      // 트랜잭션으로 변경
      await runTransaction(this.db, async (transaction) => {
        // 현재 사용자와 대상 사용자 정보 가져오기
        const currentUserDoc = await transaction.get(doc(this.db, "users", currentUserId))
        const targetUserDoc = await transaction.get(doc(this.db, "users", targetUserId))

        if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
          throw new Error("사용자 정보를 찾을 수 없습니다.")
        }

        const currentUserData = currentUserDoc.data()
        const targetUserData = targetUserDoc.data()

        // 기존 팔로우 데이터에서 해당 사용자 제거
        const currentFollowing = currentUserData.following || []
        const targetFollowers = targetUserData.followers || []

        const updatedFollowing = currentFollowing.filter((f: FollowData) => f.userId !== targetUserId)
        const updatedFollowers = targetFollowers.filter((f: FollowData) => f.userId !== currentUserId)

        // 업데이트
        transaction.update(doc(this.db, "users", currentUserId), {
          following: updatedFollowing,
          followingCount: updatedFollowing.length,
          updatedAt: Timestamp.now(),
        })
        transaction.update(doc(this.db, "users", targetUserId), {
          followers: updatedFollowers,
          followersCount: updatedFollowers.length,
          updatedAt: Timestamp.now(),
        })
      })

      return true
    } catch (error) {
      console.error("Error unfollowing user:", error)
      return false
    }
  }

  // 팔로우 상태 확인
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (currentUserId === targetUserId) return false

    try {
      const userDoc = await getDoc(doc(this.db, "users", currentUserId))
      if (!userDoc.exists()) return false

      const userData = userDoc.data()
      const following = userData.following || []

      return following.some((f: FollowData) => f.userId === targetUserId)
    } catch (error) {
      console.error("Error checking follow status:", error)
      return false
    }
  }

  // 팔로잉 목록 가져오기
  async getFollowing(userId: string): Promise<FollowData[]> {
    try {
      const userDoc = await getDoc(doc(this.db, "users", userId))
      if (!userDoc.exists()) return []

      const userData = userDoc.data()
      return userData.following || []
    } catch (error) {
      console.error("Error getting following list:", error)
      return []
    }
  }

  // 팔로워 목록 가져오기
  async getFollowers(userId: string): Promise<FollowData[]> {
    try {
      const userDoc = await getDoc(doc(this.db, "users", userId))
      if (!userDoc.exists()) return []

      const userData = userDoc.data()
      return userData.followers || []
    } catch (error) {
      console.error("Error getting followers list:", error)
      return []
    }
  }
}

export const followSystem = new FollowSystem()
