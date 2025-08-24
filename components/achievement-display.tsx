"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Crown, Shield, Zap } from "lucide-react"
import type { Achievement } from "@/lib/user-types"

interface AchievementDisplayProps {
  achievements: Achievement[]
  unlockedAchievements: string[]
  showProgress?: boolean
}

export function AchievementDisplay({
  achievements,
  unlockedAchievements,
  showProgress = true,
}: AchievementDisplayProps) {
  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case "diamond":
        return <Crown className="h-4 w-4" />
      case "platinum":
        return <Star className="h-4 w-4" />
      case "gold":
        return <Trophy className="h-4 w-4" />
      case "silver":
        return <Shield className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "diamond":
        return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30"
      case "platinum":
        return "text-gray-300 bg-gray-300/10 border-gray-300/30"
      case "gold":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
      case "silver":
        return "text-gray-400 bg-gray-400/10 border-gray-400/30"
      default:
        return "text-amber-600 bg-amber-600/10 border-amber-600/30"
    }
  }

  const unlockedCount = achievements.filter((a) => unlockedAchievements.includes(a.id)).length
  const totalCount = achievements.length
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  return (
    <div className="space-y-6">
      {/* 진행률 표시 */}
      {showProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              업적 진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>달성한 업적</span>
                <span className="font-medium">
                  {unlockedCount} / {totalCount}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{progressPercentage.toFixed(1)}% 완료</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업적 목록 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement, index) => {
          const isUnlocked = unlockedAchievements.includes(achievement.id)

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 ${
                  isUnlocked ? "border-primary/50 bg-primary/5" : "border-muted bg-muted/20 opacity-60"
                }`}
              >
                {/* 희귀도 표시 */}
                <div className={`absolute top-2 right-2 p-1 rounded-full ${getRarityColor(achievement.rarity)}`}>
                  {getRarityIcon(achievement.rarity)}
                </div>

                {/* 잠금 해제 효과 */}
                {isUnlocked && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 3,
                    }}
                  />
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={achievement.iconUrl || "/placeholder.svg"}
                      alt={achievement.name}
                      className="h-8 w-8 rounded"
                    />
                    <div>
                      <CardTitle className="text-sm">{achievement.name}</CardTitle>
                      <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>

                  {achievement.reward && (
                    <div className="text-xs space-y-1">
                      <p className="font-medium">보상:</p>
                      <div className="flex flex-wrap gap-1">
                        {achievement.reward.points && (
                          <Badge variant="secondary" className="text-xs">
                            +{achievement.reward.points} 점수
                          </Badge>
                        )}
                        {achievement.reward.exp && (
                          <Badge variant="secondary" className="text-xs">
                            +{achievement.reward.exp} EXP
                          </Badge>
                        )}
                        {achievement.reward.title && (
                          <Badge variant="secondary" className="text-xs">
                            칭호: {achievement.reward.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {!isUnlocked && !achievement.isHidden && (
                    <p className="text-xs text-muted-foreground mt-2 italic">조건: {achievement.condition}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
