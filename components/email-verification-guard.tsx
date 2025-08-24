"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { sendVerificationEmail } from "@/lib/email-verification"

interface EmailVerificationGuardProps {
  children: React.ReactNode
  requireVerification?: boolean
}

export function EmailVerificationGuard({ children, requireVerification = false }: EmailVerificationGuardProps) {
  const { user, loading } = useAuth()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  // 이메일 인증이 필요한 페이지에서 미인증 사용자 체크
  useEffect(() => {
    if (!loading && user && requireVerification && !user.emailVerified) {
      // 이메일 미인증 사용자는 인증 페이지로 리디렉션하지 않고 경고만 표시
    }
  }, [user, loading, requireVerification])

  const handleResendVerification = async () => {
    if (!user) return

    setIsResending(true)
    setError("")
    setMessage("")

    try {
      const result = await sendVerificationEmail(user)

      if (result.success) {
        setMessage("인증 메일이 재발송되었습니다. 이메일을 확인해주세요.")
      } else {
        setError(result.error || "인증 메일 발송에 실패했습니다.")
      }
    } catch (error) {
      setError("인증 메일 발송 중 오류가 발생했습니다.")
    } finally {
      setIsResending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 로그인하지 않은 사용자는 그대로 children 렌더링
  if (!user) {
    return <>{children}</>
  }

  // 이메일이 인증된 사용자는 그대로 children 렌더링
  if (user.emailVerified) {
    return <>{children}</>
  }

  // 이메일 인증이 필요하지 않은 페이지는 경고만 표시하고 children 렌더링
  if (!requireVerification) {
    return (
      <>
        <Alert className="m-4 bg-yellow-900/20 border border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            이메일 인증이 완료되지 않았습니다.
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-300 underline ml-1"
              onClick={() => router.push("/verify-email")}
            >
              지금 인증하기
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </>
    )
  }

  // 이메일 인증이 필요한 페이지에서 미인증 사용자에게 표시할 내용
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/40 p-1 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10"></div>
          <div className="relative rounded-xl bg-black/60 p-8 text-center">
            <Mail className="h-16 w-16 text-primary mx-auto mb-6" />

            <h1 className="text-2xl font-bold text-white mb-4">이메일 인증이 필요합니다</h1>

            <p className="text-gray-300 mb-6">
              이 기능을 사용하려면 먼저 이메일 인증을 완료해주세요.
              <br />
              <span className="text-primary font-medium">{user.email}</span>로 인증 링크를 발송해드립니다.
            </p>

            {message && (
              <Alert className="mb-4 bg-green-900/20 border border-green-500/50">
                <AlertDescription className="text-green-300">{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border border-red-500/50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
              >
                {isResending ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    발송 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Mail className="mr-2 h-4 w-4" />
                    인증 메일 발송
                  </div>
                )}
              </Button>

              <Button
                onClick={() => router.push("/verify-email")}
                variant="outline"
                className="w-full bg-transparent border-primary/50 text-primary hover:bg-primary/10"
              >
                인증 페이지로 이동
              </Button>

              <Button
                onClick={() => router.push("/")}
                variant="ghost"
                className="w-full text-gray-400 hover:text-white"
              >
                메인 페이지로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
