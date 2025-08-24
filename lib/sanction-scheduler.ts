import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "./firebase"

export async function checkExpiredSanctions(): Promise<void> {
  try {
    // 현재 시간
    const now = new Date()

    // 만료된 제재 조회 (권한 확인 추가)
    const sanctionsRef = collection(db, "user_sanctions")
    const expiredQuery = query(sanctionsRef, where("isActive", "==", true), where("expiresAt", "<=", now))

    const snapshot = await getDocs(expiredQuery)

    if (snapshot.empty) {
      return
    }

    // 배치 업데이트
    const batch = writeBatch(db)
    const userUpdates: { [userId: string]: any } = {}

    snapshot.forEach((doc) => {
      const sanctionData = doc.data()

      // 제재 비활성화
      batch.update(doc.ref, {
        isActive: false,
        updatedAt: now,
      })

      // 사용자 상태 업데이트 준비
      if (!userUpdates[sanctionData.userId]) {
        userUpdates[sanctionData.userId] = {
          status: "active",
          updatedAt: now,
        }
      }
    })

    // 제재 업데이트 실행
    await batch.commit()

    // 사용자 상태 업데이트
    const userBatch = writeBatch(db)
    for (const [userId, updates] of Object.entries(userUpdates)) {
      const userRef = doc(db, "users", userId)
      userBatch.update(userRef, updates)
    }

    await userBatch.commit()

    console.log(`${snapshot.size}개의 만료된 제재가 해제되었습니다.`)
  } catch (error: any) {
    // 권한 오류인 경우 조용히 실패
    if (error.code === "permission-denied" || error.code === "insufficient-permissions") {
      console.log("제재 확인 권한이 없습니다. 관리자 권한이 필요합니다.")
      return
    }

    console.error("만료된 제재 확인 중 오류:", error)
  }
}
