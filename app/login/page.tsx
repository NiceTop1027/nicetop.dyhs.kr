"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Shield,
  Mail,
  Lock,
  AlertCircle,
  Terminal,
  Cpu,
  Server,
  Database,
  Code,
  Fingerprint,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { Checkbox } from "@/components/ui/checkbox"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [securityTips, setSecurityTips] = useState<string[]>([
    "🔒 강력한 비밀번호로 계정을 보호하세요",
    "🛡️ 정기적으로 비밀번호를 변경하는 것이 좋습니다",
    "📧 의심스러운 이메일 링크는 클릭하지 마세요",
    "🚫 공용 컴퓨터에서는 로그인 상태를 유지하지 마세요",
    "🔐 2단계 인증을 활성화하여 보안을 강화하세요",
    "⚡ 안전한 네트워크에서만 로그인하세요",
  ])
  const [currentTip, setCurrentTip] = useState(0)
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; speed: number }>>([])

  const router = useRouter()
  const { signIn, user } = useAuth()

  // 이미 로그인된 사용자는 메인 페이지로 리디렉션
  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  // 보안 팁 자동 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % securityTips.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [securityTips.length])

  // 배경 파티클 생성
  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.3 + 0.1,
    }))
    setParticles(newParticles)

    const moveParticles = setInterval(() => {
      setParticles((prev) =>
        prev.map((particle) => ({
          ...particle,
          y: particle.y + particle.speed > 100 ? 0 : particle.y + particle.speed,
        })),
      )
    }, 50)

    return () => clearInterval(moveParticles)
  }, [])

  // 타이핑 효과
  const [typedText, setTypedText] = useState("")
  const fullText = "NT Security Challenge에 오신 것을 환영합니다"

  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1))
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [typedText, fullText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      await signIn(email, password)
      setSuccess("로그인이 완료되었습니다!")
      setTimeout(() => {
        router.push("/")
      }, 1000)
    } catch (error: any) {
      console.error("Login error:", error)

      if (error.code === "auth/user-not-found") {
        setError("등록되지 않은 이메일입니다.")
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.")
      } else if (error.code === "auth/too-many-requests") {
        setError("너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.")
      } else if (error.code === "auth/user-disabled") {
        setError("계정이 비활성화되었습니다. 관리자에게 문의하세요.")
      } else {
        setError("로그인 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 랜덤 사이버 보안 아이콘
  const securityIcons = [
    <Shield key="shield" className="h-6 w-6 text-blue-400" />,
    <Mail key="mail" className="h-6 w-6 text-green-400" />,
    <Terminal key="terminal" className="h-6 w-6 text-purple-400" />,
    <Cpu key="cpu" className="h-6 w-6 text-red-400" />,
    <Server key="server" className="h-6 w-6 text-yellow-400" />,
    <Database key="database" className="h-6 w-6 text-cyan-400" />,
    <Code key="code" className="h-6 w-6 text-pink-400" />,
    <Fingerprint key="fingerprint" className="h-6 w-6 text-indigo-400" />,
  ]

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 md:px-6 relative overflow-hidden">
        {/* 배경 파티클 */}
        <div className="absolute inset-0 cyber-grid opacity-20"></div>
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-500/30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.size}px rgba(59, 130, 246, 0.3)`,
            }}
          />
        ))}

        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>

        <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center">
          {/* 왼쪽 정보 섹션 */}
          <div className="w-full lg:w-1/2 space-y-6 lg:space-y-8 text-center lg:text-left px-4 lg:px-0">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-300 to-purple-300 bg-clip-text text-transparent">
                {typedText}
                <span className="animate-pulse">|</span>
              </h1>
              <p className="text-base lg:text-lg text-gray-400 max-w-md mx-auto lg:mx-0">
                최고의 사이버 보안 전문가가 되기 위한 여정을 시작하세요. 실전 문제와 도전 과제로 실력을 향상시키세요.
              </p>
            </div>

            {/* 보안 팁 섹션 */}
            <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-black/40 p-4 backdrop-blur-sm h-32 lg:h-36">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
              <h3 className="text-base lg:text-lg font-semibold text-blue-400 mb-2 flex items-center justify-center lg:justify-start">
                <Terminal className="mr-2 h-4 w-4 lg:h-5 lg:w-5" /> 보안 팁
              </h3>
              <p className="text-sm lg:text-base text-gray-300 transition-all duration-500 animate-fade-in leading-relaxed">
                {securityTips[currentTip]}
              </p>
            </div>

            {/* 아이콘 그리드 */}
            <div className="grid grid-cols-4 gap-3 lg:gap-4 max-w-sm mx-auto lg:mx-0">
              {securityIcons.map((icon, index) => (
                <div
                  key={index}
                  className="aspect-square flex items-center justify-center rounded-lg border border-gray-800 bg-black/50 backdrop-blur-sm hover:bg-gray-900/50 transition-all duration-300 group"
                >
                  <div className="transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽 로그인 폼 */}
          <div className="w-full lg:w-1/2 max-w-md mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/40 p-1 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 animate-gradient-slow"></div>
              <div className="absolute inset-px rounded-xl bg-gradient-to-br from-primary/5 to-blue-500/5 opacity-50"></div>
              <div className="relative rounded-xl bg-black/60 p-8">
                <div className="mb-8 flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-blue-500/70 shadow-lg">
                    <Shield className="h-8 w-8 text-primary-foreground" />
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary to-blue-500/70 opacity-30 blur-sm animate-pulse"></div>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    로그인
                  </h1>
                  <p className="text-sm text-gray-400">계정에 로그인하여 보안 챌린지를 시작하세요</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6 bg-red-900/20 border border-red-500/50 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 bg-green-900/20 border border-green-500/50 backdrop-blur-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-green-400">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                      이메일 주소
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                      비밀번호
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          className="pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="data-[state=checked]:bg-blue-600 border-gray-600"
                    />
                    <label
                      htmlFor="remember-me"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
                    >
                      로그인 상태 유지
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 rounded-lg text-white font-medium text-lg shadow-lg shadow-blue-900/20 transition-all duration-300 hover:shadow-blue-900/40"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        로그인 중...
                      </div>
                    ) : (
                      "로그인"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-gray-400">계정이 없으신가요?</span>{" "}
                  <Link
                    href="/register"
                    className="font-medium text-primary/90 underline-offset-4 hover:text-primary transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
