"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ProfileFrame } from "@/lib/user-types"
import { User } from "lucide-react"

interface ProfileFrameDisplayProps {
  user: {
    photoURL?: string
    username: string
    title?: string
    level?: number
  }
  frame?: ProfileFrame
  size?: "sm" | "md" | "lg" | "xl"
  showLevel?: boolean
  showTitle?: boolean
}

export function ProfileFrameDisplay({
  user,
  frame,
  size = "md",
  showLevel = true,
  showTitle = true,
}: ProfileFrameDisplayProps) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  }

  const getAnimationProps = () => {
    if (!frame?.animationType || frame.animationType === "none") return {}

    switch (frame.animationType) {
      case "glow":
        return {
          animate: {
            boxShadow: [
              `0 0 0px ${frame.glowColor || frame.color}`,
              `0 0 20px ${frame.glowColor || frame.color}`,
              `0 0 0px ${frame.glowColor || frame.color}`,
            ],
          },
          transition: {
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }
      case "pulse":
        return {
          animate: {
            scale: [1, 1.05, 1],
          },
          transition: {
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }
      case "rotate":
        return {
          animate: {
            rotate: 360,
          },
          transition: {
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          },
        }
      case "rainbow":
        return {
          animate: {
            borderColor: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#FF0000"],
          },
          transition: {
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          },
        }
      default:
        return {}
    }
  }

  return (
    <div className="relative inline-block">
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden`}
        style={{
          border: frame ? `3px solid ${frame.color}` : "3px solid transparent",
        }}
        {...getAnimationProps()}
      >
        {/* 프레임 이미지 (있는 경우) */}
        {frame?.imageUrl && (
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              backgroundImage: `url(${frame.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        {/* 사용자 아바타 */}
        <Avatar className={`${sizeClasses[size]} border-0`}>
          <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
          <AvatarFallback>
            <User className={size === "sm" ? "h-4 w-4" : size === "md" ? "h-6 w-6" : "h-8 w-8"} />
          </AvatarFallback>
        </Avatar>

        {/* 레벨 표시 */}
        {showLevel && user.level && (
          <motion.div
            className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-background"
            whileHover={{ scale: 1.1 }}
          >
            {user.level}
          </motion.div>
        )}
      </motion.div>

      {/* 칭호 표시 */}
      {showTitle && user.title && (
        <motion.div
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge
            variant="secondary"
            className="text-xs whitespace-nowrap"
            style={{
              backgroundColor: frame?.color ? `${frame.color}20` : undefined,
              borderColor: frame?.color || undefined,
            }}
          >
            {user.title}
          </Badge>
        </motion.div>
      )}

      {/* 희귀도 표시 */}
      {frame && frame.rarity !== "common" && (
        <motion.div
          className="absolute -top-1 -left-1"
          animate={{
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <div
            className={`h-3 w-3 rounded-full ${
              frame.rarity === "legendary"
                ? "bg-yellow-400"
                : frame.rarity === "epic"
                  ? "bg-purple-400"
                  : frame.rarity === "rare"
                    ? "bg-blue-400"
                    : frame.rarity === "uncommon"
                      ? "bg-green-400"
                      : "bg-gray-400"
            }`}
          />
        </motion.div>
      )}
    </div>
  )
}
