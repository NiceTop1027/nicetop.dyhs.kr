"use client"

import { useEffect, useState } from "react"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { Season, SeasonParticipant } from "@/lib/season-types"
import { updateSeasonParticipantScore } from "@/lib/season-management"

// 현재 활성 시즌 가져오기
export function useActiveSeason() {
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const seasonsRef = collection(db, "seasons")
    const activeSeasonQuery = query(seasonsRef, where("isActive", "==", true))

    const unsubscribe = onSnapshot(activeSeasonQuery, (snapshot) => {
      if (!snapshot.empty) {
        const seasonDoc = snapshot.docs[0]
        setActiveSeason({
          id: seasonDoc.id,
          ...seasonDoc.data(),
        } as Season)
      } else {
        setActiveSeason(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { activeSeason, isLoading }
}

// 시즌 리더보드 실시간 업데이트
export function useSeasonLeaderboard(seasonId: string | null, limit = 10) {
  const [leaderboard, setLeaderboard] = useState<SeasonParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!seasonId) {
      setLeaderboard([])
      setIsLoading(false)
      return
    }

    const participantsRef = collection(db, "season_participants")
    const leaderboardQuery = query(
      participantsRef,
      where("seasonId", "==", seasonId),
      orderBy("totalScore", "desc"),
      orderBy("updatedAt", "asc"),
    )

    const unsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
      const participants = snapshot.docs.slice(0, limit).map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rank: index + 1,
      })) as SeasonParticipant[]

      setLeaderboard(participants)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [seasonId, limit])

  return { leaderboard, isLoading }
}

// 사용자의 시즌 참가 정보
export function useUserSeasonParticipation(userId: string | null, seasonId: string | null) {
  const [participation, setParticipation] = useState<SeasonParticipant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId || !seasonId) {
      setParticipation(null)
      setIsLoading(false)
      return
    }

    const participantsRef = collection(db, "season_participants")
    const participationQuery = query(participantsRef, where("seasonId", "==", seasonId), where("userId", "==", userId))

    const unsubscribe = onSnapshot(participationQuery, (snapshot) => {
      if (!snapshot.empty) {
        const participantDoc = snapshot.docs[0]
        setParticipation({
          id: participantDoc.id,
          ...participantDoc.data(),
        } as SeasonParticipant)
      } else {
        setParticipation(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [userId, seasonId])

  return { participation, isLoading }
}

// 점수 업데이트 헬퍼 함수
export async function addSeasonScore(
  userId: string,
  scoreType: "ctf" | "wargame" | "curriculum",
  points: number,
  reason: string,
) {
  return await updateSeasonParticipantScore(userId, scoreType, points, reason)
}
