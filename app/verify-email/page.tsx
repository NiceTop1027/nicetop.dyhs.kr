"use client"

import { type FC, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { signIn } from "next-auth/react"

type VerifyEmailPageProps = {}

const VerifyEmailPage: FC<VerifyEmailPageProps> = ({}) => {
  const [email, setEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const searchParams = useSearchParams()

  useEffect(() => {
    setEmail(searchParams?.get("email") || "")
  }, [searchParams])

  const handleSendVerification = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        toast.success("인증 이메일을 보냈습니다.")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "인증 이메일 전송에 실패했습니다.")
      }
    } catch (error) {
      setError("인증 이메일 전송에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationComplete = async () => {
    if (isLoginMode) {
      // 로그인 모드일 때는 실제 로그인 진행
      const savedEmail = window.sessionStorage.getItem("loginEmail")
      const savedPassword = window.sessionStorage.getItem("loginPassword")

      if (savedEmail && savedPassword) {
        try {
          await signIn("credentials", {
            email: savedEmail,
            password: savedPassword,
            redirect: false,
          })
          window.sessionStorage.removeItem("loginEmail")
          window.sessionStorage.removeItem("loginPassword")
          router.push("/")
        } catch (error) {
          setError("로그인에 실패했습니다.")
        }
      }
    } else {
      // 회원가입 모드일 때는 회원가입 페이지로
      router.push(`/register?step=2&email=${encodeURIComponent(verifiedEmail || "")}`)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get("mode")
    const emailParam = urlParams.get("email")

    if (mode === "login") {
      setIsLoginMode(true)
      if (emailParam) {
        setEmail(emailParam)
      }

      // 자동으로 이메일 인증 링크 발송
      handleSendVerification()
    }
  }, [])

  // 로그인 모드 상태 추가
  const [isLoginMode, setIsLoginMode] = useState(false)

  return (
    <div className="container relative flex h-screen w-screen flex-col items-center justify-center lg:max-w-none">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {isLoginMode ? "로그인 인증" : "이메일 인증"}
          </h1>
          <p className="text-sm text-gray-400">
            {isLoginMode ? "로그인을 위해 이메일 인증이 필요합니다" : "회원가입을 위해 이메일 인증을 완료해주세요"}
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일 주소</Label>
            <Input id="email" placeholder="name@example.com" type="email" value={email} disabled />
          </div>
          <Button disabled={isLoading} onClick={handleSendVerification}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            이메일 인증 링크 다시 보내기
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {verifiedEmail && (
            <div className="grid gap-2">
              <p className="text-sm text-green-500">이메일이 인증되었습니다.</p>
              <Button onClick={handleVerificationComplete}>{isLoginMode ? "로그인하기" : "회원가입 계속하기"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
