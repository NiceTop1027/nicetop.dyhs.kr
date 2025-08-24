"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { sendNotificationToUser } from "@/lib/notification-utils"
import { useToast } from "@/hooks/use-toast"

export function NotificationDebug() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [rawNotifications, setRawNotifications] = useState<any[]>([])

  // 알림 데이터 가져오기
  const fetchNotifications = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const notificationsRef = collection(db, "notifications")
      const q = query(notificationsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(10))

      const snapshot = await getDocs(q)
      const notificationsData: any[] = []

      snapshot.forEach((doc) => {
        notificationsData.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setRawNotifications(notificationsData)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "알림 데이터 가져오기 실패",
        description: "알림 데이터를 가져오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 테스트 알림 보내기
  const sendTestNotification = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const result = await sendNotificationToUser(
        user.uid,
        "info",
        "테스트 알림",
        "이것은 테스트 알림입니다. 알림 시스템이 정상적으로 작동하는지 확인합니다.",
        "/mypage",
        "high",
      )

      if (result) {
        toast({
          title: "테스트 알림 전송 성공",
          description: "테스트 알림이 성공적으로 전송되었습니다.",
          variant: "default",
        })
        // 알림 데이터 다시 가져오기
        fetchNotifications()
      } else {
        toast({
          title: "테스트 알림 전송 실패",
          description: "테스트 알림 전송 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "테스트 알림 전송 실패",
        description: "테스트 알림 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  if (!user) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>알림 디버그</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={fetchNotifications} disabled={isLoading}>
              알림 데이터 가져오기
            </Button>
            <Button onClick={sendTestNotification} disabled={isLoading} variant="outline">
              테스트 알림 보내기
            </Button>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">원시 알림 데이터</h3>
            {rawNotifications.length > 0 ? (
              <div className="space-y-4">
                {rawNotifications.map((notification) => (
                  <div key={notification.id} className="p-4 border rounded-md">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(notification, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">알림 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
