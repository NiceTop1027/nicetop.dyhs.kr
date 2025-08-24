"use client"

import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Target, Zap, Activity, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

type ActiveUser = {
  uid: string
  username: string
  photoURL?: string
  challengeId?: string
  challengeName?: string
  lastActive: Timestamp
}

type ChallengeInfo = {
  title: string
  level: number
  difficulty: string
  category: string
}

export function ActiveChallengeUsers({ challengeId }: { challengeId: string }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [challengeInfo, setChallengeInfo] = useState<ChallengeInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchChallengeInfo = async () => {
      try {
        console.log("[v0] Fetching challenge info for:", challengeId)
        const challengeDoc = await getDoc(doc(db, "wargame_challenges", challengeId))
        if (challengeDoc.exists()) {
          const data = challengeDoc.data()
          const info = {
            title: data.title || "문제",
            level: data.level || 1,
            difficulty: data.difficulty || "쉬움",
            category: data.category || "기타",
          }
          console.log("[v0] Challenge info loaded:", info)
          setChallengeInfo(info)
        } else {
          console.log("[v0] Challenge document not found")
        }
      } catch (error) {
        console.error("Error fetching challenge info:", error)
      }
    }

    fetchChallengeInfo()
  }, [challengeId])

  useEffect(() => {
    console.log("[v0] Setting up active users listener for challenge:", challengeId)
    const now = Timestamp.now()
    const fiveMinutesAgo = new Timestamp(now.seconds - 5 * 60, now.nanoseconds)

    const activeUsersRef = collection(db, "active_users")
    const q = query(activeUsersRef, where("lastActive", ">", fiveMinutesAgo), where("challengeId", "==", challengeId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activeUsersData: ActiveUser[] = []
        snapshot.forEach((doc) => {
          activeUsersData.push(doc.data() as ActiveUser)
        })
        activeUsersData.sort((a, b) => b.lastActive.seconds - a.lastActive.seconds)
        console.log("[v0] Active users updated:", activeUsersData.length, "users")
        setActiveUsers(activeUsersData)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error getting active challenge users:", error)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [challengeId])

  const getLevelColor = (level: number) => {
    if (level <= 3) return "from-emerald-500 to-teal-500"
    if (level <= 6) return "from-amber-500 to-orange-500"
    if (level <= 8) return "from-orange-500 to-red-500"
    return "from-red-500 to-pink-500"
  }

  return (
    <motion.div
      className="mt-6 p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(59, 130, 246, 0.4)",
                "0 0 0 10px rgba(59, 130, 246, 0)",
                "0 0 0 0 rgba(59, 130, 246, 0.4)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <Activity className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              실시간 풀이 현황
            </h4>
            {challengeInfo && (
              <p className="text-sm text-gray-400">
                {challengeInfo.title} • {challengeInfo.category}
              </p>
            )}
          </div>
        </div>

        {challengeInfo && (
          <div className="flex items-center gap-2">
            <Badge
              className={`bg-gradient-to-r ${getLevelColor(challengeInfo.level)} text-white border-0 shadow-lg font-bold px-3 py-1`}
            >
              Lv.{challengeInfo.level}
            </Badge>
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              {challengeInfo.difficulty}
            </Badge>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-gray-400">활성 사용자 정보를 불러오는 중...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">
                {activeUsers.length > 0 ? `${activeUsers.length}명이 현재 풀이 중` : "현재 풀이 중인 사용자 없음"}
              </span>
              {activeUsers.length > 0 && (
                <motion.div
                  className="w-2 h-2 bg-emerald-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
            </motion.div>
          </div>

          {activeUsers.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-500 text-sm">아직 이 문제를 풀고 있는 사용자가 없습니다.</div>
              <div className="text-gray-600 text-xs mt-1">첫 번째 도전자가 되어보세요!</div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <AnimatePresence mode="popLayout">
                  {activeUsers.map((user, index) => {
                    const timeAgo = Math.floor((Date.now() - user.lastActive.toDate().getTime()) / 1000)
                    const timeText =
                      timeAgo < 60
                        ? "방금 전"
                        : timeAgo < 3600
                          ? `${Math.floor(timeAgo / 60)}분 전`
                          : `${Math.floor(timeAgo / 3600)}시간 전`

                    return (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0, rotate: 180 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                        }}
                        whileHover={{
                          scale: 1.2,
                          y: -5,
                          transition: { duration: 0.2 },
                        }}
                        className="relative group"
                      >
                        <Avatar className="h-12 w-12 border-2 border-emerald-500/50 transition-all duration-200 group-hover:border-emerald-400 shadow-lg">
                          <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                          <AvatarFallback className="bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold">
                            {user.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <motion.div
                          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900"
                          animate={{
                            scale: [1, 1.3, 1],
                            boxShadow: [
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                              "0 0 0 8px rgba(34, 197, 94, 0)",
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        />

                        <motion.div
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-800/95 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 backdrop-blur-sm border border-gray-600 shadow-xl"
                          initial={{ opacity: 0, y: 10 }}
                          whileHover={{ opacity: 1, y: 0 }}
                        >
                          <div className="font-semibold text-emerald-400">{user.username}</div>
                          <div className="text-gray-400 text-xs">{timeText} 활동</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </motion.div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {activeUsers.length > 8 && (
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 text-sm font-bold text-gray-300 border-2 border-gray-600 shadow-lg"
                    whileHover={{ scale: 1.1, backgroundColor: "#4b5563" }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    +{activeUsers.length - 8}
                  </motion.div>
                )}
              </div>

              {activeUsers.length > 0 && (
                <motion.div
                  className="mt-4 pt-4 border-t border-gray-700/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    최근 활동 순
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {activeUsers.slice(0, 5).map((user, index) => {
                      const timeAgo = Math.floor((Date.now() - user.lastActive.toDate().getTime()) / 1000)
                      const timeText =
                        timeAgo < 60
                          ? "방금 전"
                          : timeAgo < 3600
                            ? `${Math.floor(timeAgo / 60)}분 전`
                            : `${Math.floor(timeAgo / 3600)}시간 전`

                      return (
                        <motion.div
                          key={user.uid}
                          className="flex items-center gap-2 text-xs py-1"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                        >
                          <motion.div
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <span className="text-gray-300 font-medium truncate flex-1">{user.username}</span>
                          <span className="text-gray-500">{timeText}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  )
}
