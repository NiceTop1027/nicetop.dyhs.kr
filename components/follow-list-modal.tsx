"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Users, UserPlus, Calendar } from "lucide-react"
import { followSystem, type FollowData } from "@/lib/follow-system"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface FollowListModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  username: string
  type: "following" | "followers"
}

export function FollowListModal({ isOpen, onClose, userId, username, type }: FollowListModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [followList, setFollowList] = useState<FollowData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())

  // 팔로우 목록 불러오기
  useEffect(() => {
    if (isOpen && userId) {
      fetchFollowList()
    }
  }, [isOpen, userId, type])

  // 현재 사용자가 팔로우하는 사용자들 확인
  useEffect(() => {
    if (user && isOpen) {
      checkFollowingStatus()
    }
  }, [user, isOpen, followList])

  const fetchFollowList = async () => {
    setIsLoading(true)
    try {
      let list: FollowData[] = []
      if (type === "following") {
        list = await followSystem.getFollowing(userId)
      } else {
        list = await followSystem.getFollowers(userId)
      }

      // userId를 기준으로 중복 제거
      const uniqueList = list.filter((item, index, self) => index === self.findIndex((t) => t.userId === item.userId))

      // 최신순으로 정렬
      uniqueList.sort((a, b) => b.followedAt.toMillis() - a.followedAt.toMillis())
      setFollowList(uniqueList)
    } catch (error) {
      console.error("Error fetching follow list:", error)
      toast({
        title: "오류 발생",
        description: "목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkFollowingStatus = async () => {
    if (!user) return

    const followingSet = new Set<string>()
    for (const followData of followList) {
      if (followData.userId !== user.uid) {
        const isFollowing = await followSystem.isFollowing(user.uid, followData.userId)
        if (isFollowing) {
          followingSet.add(followData.userId)
        }
      }
    }
    setFollowingUsers(followingSet)
  }

  const handleFollow = async (targetUserId: string) => {
    if (!user) return

    try {
      const success = await followSystem.followUser(user.uid, targetUserId)
      if (success) {
        setFollowingUsers((prev) => new Set([...prev, targetUserId]))
        toast({
          title: "팔로우 완료",
          description: "사용자를 팔로우했습니다.",
        })
        // 목록 새로고침
        await fetchFollowList()
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "팔로우 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return

    try {
      const success = await followSystem.unfollowUser(user.uid, targetUserId)
      if (success) {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(targetUserId)
          return newSet
        })
        toast({
          title: "언팔로우 완료",
          description: "사용자를 언팔로우했습니다.",
        })
        // 목록 새로고침
        await fetchFollowList()
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "언팔로우 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUserClick = (targetUserId: string) => {
    onClose()
    router.push(`/user/${targetUserId}`)
  }

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate()
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "날짜 정보 없음"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "following" ? <UserPlus className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            {username}님의 {type === "following" ? "팔로잉" : "팔로워"}
          </DialogTitle>
          <DialogDescription>
            {type === "following"
              ? `${username}님이 팔로우하는 사용자 목록입니다.`
              : `${username}님을 팔로우하는 사용자 목록입니다.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : followList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {type === "following" ? "팔로잉이 없습니다" : "팔로워가 없습니다"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {type === "following" ? "아직 팔로우하는 사용자가 없습니다." : "아직 팔로워가 없습니다."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {followList.map((followData, index) => (
                  <motion.div
                    key={`${followData.userId}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => handleUserClick(followData.userId)}
                    >
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={followData.photoURL || "/placeholder.svg"} alt={followData.username} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{followData.username}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(followData.followedAt)}</span>
                        </div>
                      </div>

                      {/* 팔로우 버튼 (자신이 아닌 경우에만 표시) */}
                      {user && followData.userId !== user.uid && (
                        <div className="ml-2">
                          {followingUsers.has(followData.userId) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnfollow(followData.userId)}
                              className="text-xs"
                            >
                              언팔로우
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleFollow(followData.userId)}
                              className="text-xs"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              팔로우
                            </Button>
                          )}
                        </div>
                      )}

                      {/* 자신인 경우 표시 */}
                      {user && followData.userId === user.uid && (
                        <Badge variant="secondary" className="text-xs">
                          나
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {followList.length > 0 && (
          <>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">총 {followList.length}명</div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
