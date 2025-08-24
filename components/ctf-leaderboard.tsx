"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Crown, Medal, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// CTF 참가자 타입 정의
type CTFParticipant = {
  uid: string
  username: string
  photoURL?: string
  score: number
  solvedProblems: string[]
  contestId: string
  rank?: number
  title?: string
  affiliation?: string
}

export function CTFLeaderboard() {
  const [topUsers, setTopUsers] = useState<CTFParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setIsLoading(true)
        // CTF 참가자 컬렉션에서 상위 사용자 가져오기 (10명으로 증가)
        const participantsRef = collection(db, "ctf_participants")
        const q = query(participantsRef, orderBy("score", "desc"))
        const querySnapshot = await getDocs(q)

        const topUsersData: CTFParticipant[] = []
        let rank = 1

        querySnapshot.forEach((doc) => {
          const data = doc.data() as CTFParticipant
          topUsersData.push({
            ...data,
            rank,
          })
          rank++
        })

        setTopUsers(topUsersData)
      } catch (error) {
        console.error("Error fetching CTF top users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopUsers()
  }, [])

  // 순위 아이콘 가져오기
  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Crown className="h-4 w-4 text-yellow-500" />
    } else if (rank === 2) {
      return <Medal className="h-4 w-4 text-gray-400" />
    } else if (rank === 3) {
      return <Trophy className="h-4 w-4 text-amber-600" />
    }
    return null
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500 rounded-xl blur-md opacity-30"></div>
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          CTF 전체 순위
        </CardTitle>
        <CardDescription>CTF 대회 모든 해커들의 순위</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : topUsers.length > 0 ? (
          <div className="space-y-2">
            {topUsers.map((user) => (
              <Link
                key={user.uid}
                href={`/user/${user.uid}`}
                className={`flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] ${
                  user.rank && user.rank <= 3
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-l-4 border-yellow-400"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                    {user.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                        <Crown className="h-4 w-4 text-white" />
                      </div>
                    ) : user.rank === 2 ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
                        <Medal className="h-4 w-4 text-white" />
                      </div>
                    ) : user.rank === 3 ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                        <Trophy className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 shadow-md">
                        {user.rank}
                      </div>
                    )}
                  </div>
                  <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-700 shadow-md">
                    <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-700 dark:text-orange-400 font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{user.username}</span>
                      {user.rank && user.rank <= 3 && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 text-xs px-2 py-0.5">
                          <Star className="h-2.5 w-2.5 mr-1" />
                          TOP
                        </Badge>
                      )}
                    </div>
                    {user.affiliation && <span className="text-xs text-muted-foreground">{user.affiliation}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    <span className="font-bold text-sm">{user.score.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-muted-foreground">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-20"></div>
              <div className="relative p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 mx-auto w-fit">
                <Trophy className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <p className="text-sm">아직 CTF 참가자가 없습니다</p>
            <p className="text-xs mt-1">첫 번째 해커가 되어보세요!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
