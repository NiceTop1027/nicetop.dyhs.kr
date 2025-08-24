"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserMinus, Loader2 } from "lucide-react"
import { followSystem } from "@/lib/follow-system"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface FollowButtonProps {
  targetUserId: string
  targetUsername: string
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary"
}

export function FollowButton({
  targetUserId,
  targetUsername,
  className,
  size = "default",
  variant = "default",
}: FollowButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // 팔로우 상태 확인
  useEffect(() => {
    if (user && targetUserId && user.uid !== targetUserId) {
      checkFollowStatus()
    } else {
      setIsCheckingStatus(false)
    }
  }, [user, targetUserId])

  const checkFollowStatus = async () => {
    if (!user) return

    try {
      const following = await followSystem.isFollowing(user.uid, targetUserId)
      setIsFollowing(following)
    } catch (error) {
      console.error("Error checking follow status:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "팔로우하려면 로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const success = await followSystem.followUser(user.uid, targetUserId)
      if (success) {
        setIsFollowing(true)
        toast({
          title: "팔로우 완료",
          description: `${targetUsername}님을 팔로우했습니다.`,
        })
      } else {
        toast({
          title: "팔로우 실패",
          description: "팔로우 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error following user:", error)
      toast({
        title: "오류 발생",
        description: "팔로우 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const success = await followSystem.unfollowUser(user.uid, targetUserId)
      if (success) {
        setIsFollowing(false)
        toast({
          title: "언팔로우 완료",
          description: `${targetUsername}님을 언팔로우했습니다.`,
        })
      } else {
        toast({
          title: "언팔로우 실패",
          description: "언팔로우 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error unfollowing user:", error)
      toast({
        title: "오류 발생",
        description: "언팔로우 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 자신의 프로필인 경우 버튼 표시하지 않음
  if (!user || user.uid === targetUserId) {
    return null
  }

  // 로딩 중인 경우
  if (isCheckingStatus) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Button
        variant={isFollowing ? "outline" : variant}
        size={size}
        className={className}
        onClick={isFollowing ? handleUnfollow : handleFollow}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : isFollowing ? (
          <UserMinus className="h-4 w-4 mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {isLoading ? "처리 중..." : isFollowing ? "언팔로우" : "팔로우"}
      </Button>
    </motion.div>
  )
}
