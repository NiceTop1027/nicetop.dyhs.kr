"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Shield, User, Mail, Lock, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [isTemporary, setIsTemporary] = useState(false)
  const { signUp, checkUsernameExists, checkEmailExists, createTemporaryAccount, updateUserProfile, user } = useAuth()

  // 아이디 설정 모달 상태
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)

  // 컴포넌트 마운트 상태 추적
  const isMounted = useRef(true)

  // 유효성 검사 상태
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")

  // 컴포넌트 마운트/언마운트 처리
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 사용자 이름 유효성 검사
  const validateUsername = async (username: string) => {
    if (!username) {
      if (isMounted.current) setUsernameValid(null)
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      if (isMounted.current) {
        setUsernameValid(false)
        setError("사용자 이름은 3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.")
      }
      return
    }

    try {
      const exists = await checkUsernameExists(username)
      if (!isMounted.current) return

      if (exists) {
        setUsernameValid(false)
        setError("이미 사용 중인 사용자 이름입니다.")
      } else {
        setUsernameValid(true)
        setError("")
      }
    } catch (error) {
      if (isMounted.current) setUsernameValid(null)
    }
  }

  // 이메일 유효성 검사
  const validateEmail = async (email: string) => {
    if (!email) {
      if (isMounted.current) setEmailValid(null)
      return
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      if (isMounted.current) setEmailValid(false)
      return
    }

    try {
      const exists = await checkEmailExists(email)
      if (!isMounted.current) return
      if (isMounted.current) setEmailValid(!exists)
    } catch (error) {
      if (isMounted.current) setEmailValid(null)
    }
  }

  // 비밀번호 강도 검사
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      if (isMounted.current) {
        setPasswordStrength(0)
        setPasswordFeedback("")
      }
      return
    }

    if (password.length >= 8) {
      if (isMounted.current) {
        setPasswordStrength(5)
        setPasswordFeedback("사용 가능한 비밀번호")
      }
    } else {
      const strength = Math.min(Math.floor(password.length / 2), 2)
      if (isMounted.current) {
        setPasswordStrength(strength)
        setPasswordFeedback("비밀번호는 8자 이상이어야 합니다")
      }
    }
  }

  // 회원가입 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email || !username || !password || !confirmPassword) {
      setError("모든 필드를 입력해주세요.")
      return
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if (passwordStrength < 5) {
      setError("비밀번호는 8자 이상이어야 합니다.")
      return
    }

    if (usernameValid === false) {
      setError("사용자 이름을 확인해주세요.")
      return
    }

    if (emailValid === false) {
      setError("이메일 주소를 확인해주세요.")
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, username, isTemporary)
      setSuccess("회원가입이 완료되었습니다!")
      setTimeout(() => {
        router.push("/")
      }, 1500)
    } catch (error: any) {
      console.error("Registration error:", error)

      if (error.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일입니다.")
      } else if (error.code === "auth/invalid-email") {
        setError("유효하지 않은 이메일 주소입니다.")
      } else if (error.code === "auth/weak-password") {
        setError("비밀번호가 너무 약합니다. 최소 6자 이상 입력해주세요.")
      } else {
        setError(error.message || "회원가입 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)
    setTimeout(() => {
      if (isMounted.current) {
        validateUsername(value)
      }
    }, 500)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setTimeout(() => {
      if (isMounted.current) {
        validateEmail(value)
      }
    }, 500)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    checkPasswordStrength(value)
  }

  const handleTemporaryAccount = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      await createTemporaryAccount()
      setSuccess("일회용 계정이 생성되었습니다!")
      // 아이디 설정 모달 표시
      setShowUsernameModal(true)
    } catch (error: any) {
      setError(error.message || "일회용 계정 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 아이디 변경 처리
  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      setError("새 아이디를 입력해주세요.")
      return
    }

    setIsUpdatingUsername(true)
    setError("")

    try {
      await updateUserProfile({ displayName: newUsername })
      setShowUsernameModal(false)
      setTimeout(() => {
        router.push("/")
      }, 500)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  // 아이디 변경 건너뛰기
  const skipUsernameUpdate = () => {
    setShowUsernameModal(false)
    setTimeout(() => {
      router.push("/")
    }, 500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 md:px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 cyber-grid opacity-20"></div>
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>

        <div className="w-full max-w-md z-10">
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
                  회원가입
                </h1>
                <p className="text-sm text-gray-400">새로운 계정을 만들어 보안 챌린지를 시작하세요</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-900/20 border border-red-500/50 backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 bg-green-900/20 border border-green-500/50 backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-300">{success}</AlertDescription>
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
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          emailValid === false
                            ? "border-red-500 pr-10"
                            : emailValid === true
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={email}
                        onChange={handleEmailChange}
                        required
                      />
                      {emailValid !== null && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {emailValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-300">
                    사용자 이름
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="사용자 이름"
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          usernameValid === false
                            ? "border-red-500 pr-10"
                            : usernameValid === true
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={username}
                        onChange={handleUsernameChange}
                        required
                        maxLength={20}
                      />
                      {usernameValid !== null && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {usernameValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
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
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                  </div>
                  {password && (
                    <>
                      <div className="relative mt-2">
                        <Progress
                          value={passwordStrength * 20}
                          className="h-1.5 rounded-full overflow-hidden bg-gray-800"
                        >
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength <= 2
                                ? "bg-red-500"
                                : passwordStrength === 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${passwordStrength * 20}%` }}
                          />
                        </Progress>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          passwordStrength <= 2
                            ? "text-red-400"
                            : passwordStrength === 3
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {passwordFeedback}
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                    비밀번호 확인
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="비밀번호를 다시 입력하세요"
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          confirmPassword && password !== confirmPassword
                            ? "border-red-500 pr-10"
                            : confirmPassword && password === confirmPassword
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      {confirmPassword && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {password === confirmPassword ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="temporary-account"
                      checked={isTemporary}
                      onCheckedChange={(checked) => setIsTemporary(checked as boolean)}
                      className="data-[state=checked]:bg-blue-600 border-gray-600"
                    />
                    <label
                      htmlFor="temporary-account"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
                    >
                      일회용 계정 (로그아웃 시 자동 삭제)
                    </label>
                  </div>

                  {isTemporary && (
                    <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/50">
                      <p className="text-sm text-yellow-300">
                        ⚠️ 일회용 계정은 로그아웃 시 모든 데이터가 영구적으로 삭제됩니다.
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-black px-2 text-gray-400">또는</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleTemporaryAccount}
                    className="w-full h-12 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg text-white font-medium text-lg shadow-lg shadow-yellow-900/20 transition-all duration-300 hover:shadow-yellow-900/40"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        생성 중...
                      </div>
                    ) : (
                      "일회용 계정으로 빠른 시작"
                    )}
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 rounded-lg text-white font-medium text-lg shadow-lg shadow-blue-900/20 transition-all duration-300 hover:shadow-blue-900/40"
                  disabled={
                    isLoading ||
                    usernameValid === false ||
                    emailValid === false ||
                    passwordStrength < 5 ||
                    password !== confirmPassword
                  }
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      계정 생성 중...
                    </div>
                  ) : (
                    "계정 생성"
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm">
                <span className="text-gray-400">이미 계정이 있으신가요?</span>{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary/90 underline-offset-4 hover:text-primary transition-colors"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 아이디 설정 모달 */}
      <Dialog open={showUsernameModal} onOpenChange={setShowUsernameModal}>
        <DialogContent className="sm:max-w-md bg-black/90 border border-primary/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">아이디 설정</DialogTitle>
            <DialogDescription className="text-gray-400">
              일회용 계정이 생성되었습니다. 원하는 아이디로 변경하거나 그대로 사용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {user && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">현재 아이디</p>
                <p className="font-medium text-white">{user.displayName}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newUsername" className="text-sm font-medium text-gray-300">
                새 아이디 (선택사항)
              </Label>
              <Input
                id="newUsername"
                type="text"
                placeholder="새 아이디를 입력하세요"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-black/60 border-gray-600 text-white focus:border-primary/50"
              />
              <p className="text-xs text-gray-400">3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={skipUsernameUpdate}
                className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50"
                disabled={isUpdatingUsername}
              >
                그대로 사용
              </Button>
              <Button
                onClick={handleUsernameUpdate}
                className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
                disabled={isUpdatingUsername || !newUsername.trim()}
              >
                {isUpdatingUsername ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  "아이디 변경"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
