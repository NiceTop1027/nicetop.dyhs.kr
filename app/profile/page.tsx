"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building,
  Save,
  Crown,
  Palette,
  Users,
  UserPlus,
  Camera,
  Settings,
  Shield,
  MapPin,
  Link,
  ChevronRight,
  Sparkles,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Database,
  Download,
  Plus,
  Edit,
  Calendar,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { doc, updateDoc, getFirestore, Timestamp, getDoc } from "firebase/firestore"
import type { Affiliation, ProfileBanner } from "@/lib/user-types"
import { isSuperAdmin } from "@/lib/admin-utils"
import { motion, AnimatePresence } from "framer-motion"
import { FollowListModal } from "@/components/follow-list-modal"
import ProfileImageUploader from "@/components/profile-image-uploader"
import { toast } from "@/hooks/use-toast"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"

// 섹션 타입 정의
type SectionType = "profile" | "image" | "banner" | "affiliations" | "account" | "privacy"

interface Section {
  id: SectionType
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  darkGradient: string
}

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, checkUsernameExists, checkEmailExists } = useAuth()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeSection, setActiveSection] = useState<SectionType>("profile")

  // 계정 정보 상태
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 프로필 정보 상태
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")

  // 소속 정보 관련 상태
  const [affiliations, setAffiliations] = useState<Affiliation[]>([])
  const [isRequestingVerification, setIsRequestingVerification] = useState(false)

  // 새 소속 추가 다이얼로그 상태
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAffiliation, setNewAffiliation] = useState({
    name: "",
    department: "",
    startDate: "",
    endDate: "",
  })

  // 소속 편집 상태
  const [editingAffiliationId, setEditingAffiliationId] = useState<string | null>(null)
  const [editedAffiliation, setEditedAffiliation] = useState({
    name: "",
    department: "",
    startDate: "",
    endDate: "",
  })

  // 프로필 이미지 상태
  const [photoURL, setPhotoURL] = useState("")

  // 프로필 배너 상태
  const [bannerUrl, setBannerUrl] = useState("")
  const [selectedBannerId, setSelectedBannerId] = useState("")
  const [availableBanners, setAvailableBanners] = useState<ProfileBanner[]>([])

  // 유효성 검사 상태
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")

  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState<"following" | "followers">("following")

  // 비밀번호 표시 상태
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 섹션 정의 - 다크 테마에 맞게 조정
  const sections: Section[] = [
    {
      id: "profile",
      title: "프로필 정보",
      description: "기본 프로필 정보를 관리하세요",
      icon: <User className="h-5 w-5" />,
      color: "text-cyan-400",
      gradient: "from-cyan-600 to-blue-600",
      darkGradient: "from-cyan-500/80 to-blue-500/80",
    },
    {
      id: "image",
      title: "프로필 이미지",
      description: "프로필 사진을 업로드하고 관리하세요",
      icon: <Camera className="h-5 w-5" />,
      color: "text-violet-400",
      gradient: "from-violet-600 to-purple-600",
      darkGradient: "from-violet-500/80 to-purple-500/80",
    },
    {
      id: "banner",
      title: "프로필 배너",
      description: "프로필 상단 배너를 설정하세요",
      icon: <Palette className="h-5 w-5" />,
      color: "text-emerald-400",
      gradient: "from-emerald-600 to-teal-600",
      darkGradient: "from-emerald-500/80 to-teal-500/80",
    },
    {
      id: "affiliations",
      title: "경력 및 학력",
      description: "소속 기관과 경력을 관리하세요",
      icon: <Building className="h-5 w-5" />,
      color: "text-amber-400",
      gradient: "from-amber-600 to-orange-600",
      darkGradient: "from-amber-500/80 to-orange-500/80",
    },
    {
      id: "account",
      title: "계정 설정",
      description: "계정 정보와 보안을 관리하세요",
      icon: <Settings className="h-5 w-5" />,
      color: "text-slate-400",
      gradient: "from-slate-600 to-gray-600",
      darkGradient: "from-slate-500/80 to-gray-500/80",
    },
    {
      id: "privacy",
      title: "개인정보 보호",
      description: "프라이버시 설정을 관리하세요",
      icon: <Shield className="h-5 w-5" />,
      color: "text-indigo-400",
      gradient: "from-indigo-600 to-blue-600",
      darkGradient: "from-indigo-500/80 to-blue-500/80",
    },
  ]

  // Firebase에서 사용자 데이터 로드
  const loadUserData = async () => {
    if (!user) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // 기본 정보 설정
        setDisplayName(userData.username || user.displayName || "")
        setEmail(userData.email || user.email || "")
        setBio(userData.bio || "")
        setLocation(userData.location || "")
        setWebsite(userData.website || "")
        setPhotoURL(userData.photoURL || user.photoURL || "")
        setBannerUrl(userData.bannerUrl || "")
        setSelectedBannerId(userData.bannerId || "default")

        // 소속 정보 설정
        if (userData.affiliations && Array.isArray(userData.affiliations)) {
          setAffiliations(userData.affiliations)
        }
      }
    } catch (error) {
      console.error("사용자 데이터 로드 오류:", error)
      toast({
        title: "오류",
        description: "사용자 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 사용자 정보가 변경될 때 상태 업데이트
  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const validateDisplayName = (name: string) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: "표시 이름을 입력해주세요." }
    }

    if (name.length > 30) {
      return { valid: false, message: "표시 이름은 30자 이하로 입력해주세요." }
    }

    // 관리자인지 확인
    const isAdmin = userProfile?.role === "admin" || isSuperAdmin(userProfile)

    // 일반 사용자는 [관리자], [ADMIN], [운영자] 등의 태그 사용 불가
    if (!isAdmin) {
      const adminTags = /\[(관리자|admin|운영자|moderator|mod|staff|스태프|ADMIN|MODERATOR|MOD|STAFF)\]/gi
      if (adminTags.test(name)) {
        return { valid: false, message: "관리자 전용 태그는 사용할 수 없습니다." }
      }
    }

    // 한글, 영어, 숫자, 공백, 일부 특수문자만 허용
    const nameRegex = /^[가-힣a-zA-Z0-9\s\-_.!@#$%^&*()+=[\]{}|;:,.<>?~`'"]*$/
    if (!nameRegex.test(name)) {
      return { valid: false, message: "한글, 영어, 숫자 및 일반적인 특수문자만 사용할 수 있습니다." }
    }

    return { valid: true, message: "" }
  }

  const addAdminTagIfNeeded = (name: string) => {
    const isAdmin = userProfile?.role === "admin" || isSuperAdmin(userProfile)

    if (isAdmin) {
      // 이미 관리자 태그가 있는지 확인
      const hasAdminTag = /\[(관리자|admin|ADMIN)\]/gi.test(name)

      if (!hasAdminTag) {
        // 관리자 태그가 없으면 자동으로 추가
        return `${name.trim()} [관리자]`
      }
    }

    return name.trim()
  }

  useEffect(() => {
    const banners = [
      {
        id: "default",
        name: "기본 그라데이션",
        description: "사이버 블루 그라데이션",
        imageUrl: "",
        adminOnly: false,
      },
      {
        id: "cyber-neon",
        name: "사이버 네온",
        description: "네온 사이버펑크 스타일",
        imageUrl: "/cyberpunk-neon-matrix.png",
        adminOnly: false,
      },
      {
        id: "matrix-code",
        name: "매트릭스 코드",
        description: "디지털 매트릭스 코드 배경",
        imageUrl: "/matrix-digital-rain.png",
        adminOnly: false,
      },
      {
        id: "hacker-terminal",
        name: "해커 터미널",
        description: "다크 터미널 인터페이스",
        imageUrl: "/placeholder-rvnsp.png",
        adminOnly: false,
      },
      {
        id: "circuit-board",
        name: "회로 기판",
        description: "전자 회로 패턴",
        imageUrl: "/placeholder-o9cge.png",
        adminOnly: false,
      },
      {
        id: "data-stream",
        name: "데이터 스트림",
        description: "흐르는 데이터 시각화",
        imageUrl: "/blue-data-stream.png",
        adminOnly: false,
      },
      {
        id: "neural-network",
        name: "신경망",
        description: "AI 신경망 구조",
        imageUrl: "/neural-network-ai-purple.png",
        adminOnly: false,
      },
      {
        id: "quantum-field",
        name: "양자 필드",
        description: "양자 컴퓨팅 시각화",
        imageUrl: "/quantum-computing-particles.png",
        adminOnly: false,
      },
      {
        id: "admin-crown",
        name: "관리자 크라운",
        description: "황금 크라운과 권위",
        imageUrl: "/golden-crown-authority.png",
        adminOnly: true,
      },
      {
        id: "admin-shield",
        name: "관리자 실드",
        description: "보안 방패 엠블럼",
        imageUrl: "/placeholder-lwnku.png",
        adminOnly: true,
      },
      {
        id: "admin-matrix",
        name: "관리자 매트릭스",
        description: "특별한 황금 매트릭스",
        imageUrl: "/golden-matrix-admin.png",
        adminOnly: true,
      },
    ]

    // 관리자가 아닌 경우 관리자 전용 배너 필터링
    const isAdmin = userProfile?.role === "admin" || isSuperAdmin(userProfile)
    const filteredBanners = isAdmin ? banners : banners.filter((banner) => !banner.adminOnly)

    setAvailableBanners(filteredBanners)
  }, [userProfile])

  // 배너 선택 핸들러
  const handleBannerSelect = (bannerId: string) => {
    const selectedBanner = availableBanners.find((b) => b.id === bannerId)
    if (selectedBanner) {
      setSelectedBannerId(bannerId)
      setBannerUrl(selectedBanner.imageUrl)
    }
  }

  // 프로필 이미지 업로드 핸들러
  const handleImageUpdate = async (imageUrl: string) => {
    setPhotoURL(imageUrl)
    if (user) {
      try {
        const db = getFirestore()
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          photoURL: imageUrl,
          updatedAt: Timestamp.now(),
        })

        setSuccess("프로필 사진이 업데이트되었습니다.")
        toast({
          title: "성공",
          description: "프로필 사진이 업데이트되었습니다.",
        })
      } catch (error) {
        console.error("Profile image update error:", error)
        setError("프로필 사진 업데이트 중 오류가 발생했습니다.")
        toast({
          title: "오류",
          description: "프로필 사진 업데이트 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  const handleProfileUpdate = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // 표시이름 검증
      const displayNameValidation = validateDisplayName(displayName)
      if (!displayNameValidation.valid) {
        setError(displayNameValidation.message)
        setIsLoading(false)
        return
      }

      if (!user) throw new Error("사용자 정보를 찾을 수 없습니다.")

      // 관리자 자동 태그 추가
      const finalDisplayName = addAdminTagIfNeeded(displayName)

      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      const updateData = {
        username: finalDisplayName,
        bio,
        location,
        website: website.startsWith("http") ? website : website ? `https://${website}` : "",
        photoURL,
        bannerUrl,
        bannerId: selectedBannerId,
        affiliations,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(userRef, updateData)

      // AuthContext의 updateUserProfile도 호출
      await updateUserProfile({
        displayName: finalDisplayName,
        bio,
        location,
        website: updateData.website,
        photoURL,
      })

      // 표시이름이 자동으로 변경된 경우 상태 업데이트
      if (finalDisplayName !== displayName) {
        setDisplayName(finalDisplayName)
      }

      setSuccess("프로필 정보가 성공적으로 업데이트되었습니다.")
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)

      if (error.code === "permission-denied") {
        setError("프로필 업데이트 권한이 없습니다.")
      } else if (error.message) {
        setError(error.message)
      } else {
        setError("프로필 업데이트 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrivacyUpdate = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      if (!user) throw new Error("사용자 정보를 찾을 수 없습니다.")

      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      // 개인정보 보호 설정 업데이트 (실제 구현에서는 상태 변수들을 추가해야 함)
      await updateDoc(userRef, {
        privacySettings: {
          profilePublic: true, // 실제로는 상태 변수에서 가져와야 함
          emailPublic: false,
          activityPublic: true,
          emailNotifications: true,
          followNotifications: true,
          marketingNotifications: false,
        },
        updatedAt: Timestamp.now(),
      })

      setSuccess("개인정보 보호 설정이 성공적으로 저장되었습니다.")
      toast({
        title: "성공",
        description: "개인정보 보호 설정이 성공적으로 저장되었습니다.",
      })
    } catch (error: any) {
      console.error("Privacy update error:", error)
      const errorMessage = error.message || "개인정보 보호 설정 저장 중 오류가 발생했습니다."
      setError(errorMessage)
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 소속 관리 함수들
  const handleAddAffiliation = async () => {
    if (!newAffiliation.name || !newAffiliation.startDate) return

    const newAff: Affiliation = {
      id: Date.now().toString(),
      name: newAffiliation.name,
      department: newAffiliation.department,
      startDate: newAffiliation.startDate,
      endDate: newAffiliation.endDate,
    }

    const updatedAffiliations = [...affiliations, newAff]
    setAffiliations(updatedAffiliations)
    setNewAffiliation({ name: "", department: "", startDate: "", endDate: "" })
    setShowAddDialog(false)

    // Firebase에 저장
    if (user) {
      try {
        const db = getFirestore()
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
          updatedAt: Timestamp.now(),
        })
      } catch (error) {
        console.error("소속 추가 오류:", error)
      }
    }

    toast({
      title: "성공",
      description: "소속이 추가되었습니다.",
    })
  }

  const handleEditAffiliation = (affiliation: Affiliation) => {
    setEditingAffiliationId(affiliation.id)
    setEditedAffiliation({
      name: affiliation.name,
      department: affiliation.department || "",
      startDate: affiliation.startDate,
      endDate: affiliation.endDate || "",
    })
  }

  const handleSaveAffiliation = async (id: string) => {
    if (!editedAffiliation.name || !editedAffiliation.startDate) return

    const updatedAffiliations = affiliations.map((aff) =>
      aff.id === id
        ? {
            ...aff,
            name: editedAffiliation.name,
            department: editedAffiliation.department,
            startDate: editedAffiliation.startDate,
            endDate: editedAffiliation.endDate,
          }
        : aff,
    )

    setAffiliations(updatedAffiliations)
    setEditingAffiliationId(null)

    // Firebase에 저장
    if (user) {
      try {
        const db = getFirestore()
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
          updatedAt: Timestamp.now(),
        })
      } catch (error) {
        console.error("소속 수정 오류:", error)
      }
    }

    toast({
      title: "성공",
      description: "소속 정보가 수정되었습니다.",
    })
  }

  const handleDeleteAffiliation = async (id: string) => {
    const updatedAffiliations = affiliations.filter((aff) => aff.id !== id)
    setAffiliations(updatedAffiliations)

    // Firebase에 저장
    if (user) {
      try {
        const db = getFirestore()
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          affiliations: updatedAffiliations,
          updatedAt: Timestamp.now(),
        })
      } catch (error) {
        console.error("소속 삭제 오류:", error)
      }
    }

    toast({
      title: "성공",
      description: "소속이 삭제되었습니다.",
    })
  }

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("모든 비밀번호 필드를 입력해주세요.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.")
      return
    }

    if (newPassword.length < 6) {
      setError("새 비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    if (newPassword === currentPassword) {
      setError("새 비밀번호는 현재 비밀번호와 달라야 합니다.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (!user || !user.email) {
        throw new Error("사용자 정보를 찾을 수 없습니다.")
      }

      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // 비밀번호 업데이트
      await updatePassword(user, newPassword)

      // 입력 필드 초기화
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setSuccess("비밀번호가 성공적으로 변경되었습니다.")
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)

      if (error.code === "auth/wrong-password") {
        setError("현재 비밀번호가 올바르지 않습니다.")
      } else if (error.code === "auth/weak-password") {
        setError("새 비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.")
      } else if (error.code === "auth/requires-recent-login") {
        setError("보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.")
      } else {
        setError("비밀번호 변경 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 섹션 렌더링 함수
  const renderSectionContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-cyan-600/90 to-blue-600/90 rounded-3xl p-8 text-white border border-cyan-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">프로필 정보</h2>
                  <p className="text-cyan-100/90 text-lg">다른 사용자에게 표시될 프로필 정보를 관리하세요</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8">
                <form onSubmit={handleProfileUpdate} className="space-y-8">
                  <div className="space-y-4">
                    <Label htmlFor="bio" className="text-lg font-semibold flex items-center gap-3 text-gray-200">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                      자기소개
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="자신에 대해 간단히 소개해주세요"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={5}
                      maxLength={500}
                      className="resize-none border-2 border-gray-700/50 focus:border-cyan-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 placeholder:text-gray-400 rounded-xl text-base"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-400">최대 500자까지 입력 가능합니다</p>
                      <p className="text-sm text-gray-400 font-mono">{bio.length}/500</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label htmlFor="location" className="text-lg font-semibold flex items-center gap-3 text-gray-200">
                        <MapPin className="h-5 w-5 text-emerald-400" />
                        위치
                      </Label>
                      <Input
                        id="location"
                        placeholder="서울, 대한민국"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        maxLength={100}
                        className="border-2 border-gray-700/50 focus:border-emerald-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 placeholder:text-gray-400 rounded-xl h-12 text-base"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="website" className="text-lg font-semibold flex items-center gap-3 text-gray-200">
                        <Link className="h-5 w-5 text-violet-400" />
                        웹사이트
                      </Label>
                      <Input
                        id="website"
                        placeholder="https://example.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        maxLength={100}
                        className="border-2 border-gray-700/50 focus:border-violet-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 placeholder:text-gray-400 rounded-xl h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <motion.div
                      className="rounded-2xl border-2 border-cyan-500/20 p-6 bg-gray-800/40 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFollowModalType("following")
                        setShowFollowModal(true)
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
                          <UserPlus className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-cyan-400 uppercase tracking-wide">팔로잉</span>
                          <p className="text-3xl font-bold text-cyan-300">
                            {userProfile?.followingCount !== undefined
                              ? userProfile.followingCount.toLocaleString()
                              : "0"}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="rounded-2xl border-2 border-emerald-500/20 p-6 bg-gray-800/40 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFollowModalType("followers")
                        setShowFollowModal(true)
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                          <Users className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-emerald-400 uppercase tracking-wide">팔로워</span>
                          <p className="text-3xl font-bold text-emerald-300">
                            {userProfile?.followersCount !== undefined
                              ? userProfile.followersCount.toLocaleString()
                              : "0"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        업데이트 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-3 h-6 w-6" />
                        프로필 업데이트
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )

      case "image":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-violet-600/90 to-purple-600/90 rounded-3xl p-8 text-white border border-violet-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Camera className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">프로필 이미지</h2>
                  <p className="text-violet-100/90 text-lg">프로필 사진을 업로드하고 관리하세요</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8">
                <ProfileImageUploader
                  currentImage={photoURL}
                  userId={user?.uid || ""}
                  onImageUpdate={handleImageUpdate}
                />
              </CardContent>
            </Card>
          </motion.div>
        )

      case "banner":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-emerald-600/90 to-teal-600/90 rounded-3xl p-8 text-white border border-emerald-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Palette className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">프로필 배너</h2>
                  <p className="text-emerald-100/90 text-lg">프로필 상단에 표시될 배너를 선택하세요</p>
                  {(userProfile?.role === "admin" || isSuperAdmin(userProfile)) && (
                    <p className="text-yellow-200 font-medium mt-2 flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      관리자 전용 배너를 사용할 수 있습니다!
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8 space-y-8">
                {/* 현재 배너 미리보기 */}
                <div>
                  <Label className="text-lg font-semibold mb-4 block text-gray-200">현재 배너 미리보기</Label>
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-gray-700/50 shadow-2xl">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl || "/placeholder.svg"}
                        alt="Profile Banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          setBannerUrl("")
                          setError("배너 이미지를 불러올 수 없습니다.")
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-600 via-violet-600 to-emerald-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">기본 그라데이션 배너</span>
                      </div>
                    )}
                    {/* 프로필 사진 오버레이 */}
                    <div className="absolute bottom-6 left-6">
                      <div className="w-24 h-24 rounded-full border-4 border-white/90 overflow-hidden bg-gray-800 shadow-2xl">
                        {photoURL ? (
                          <img
                            src={photoURL || "/placeholder.svg"}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-700">
                            <User className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 사용자 이름 오버레이 */}
                    <div className="absolute bottom-6 left-36">
                      <h3 className="text-white font-bold text-2xl drop-shadow-2xl">{displayName || "사용자"}</h3>
                      {userProfile?.title && (
                        <Badge variant="secondary" className="mt-2 shadow-lg bg-white/20 text-white border-white/30">
                          {userProfile.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* 배너 선택 */}
                <div className="space-y-6">
                  <Label className="text-lg font-semibold text-gray-200">배너 선택</Label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {availableBanners.map((banner) => (
                      <motion.div key={banner.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className={`cursor-pointer transition-all duration-300 hover:shadow-2xl bg-gray-800/50 backdrop-blur-sm border-2 ${
                            selectedBannerId === banner.id
                              ? "ring-2 ring-emerald-400/70 border-emerald-400/70 shadow-2xl bg-gray-800/70"
                              : "border-gray-700/50 hover:border-emerald-300/50"
                          }`}
                          onClick={() => handleBannerSelect(banner.id)}
                        >
                          <CardContent className="p-6">
                            <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-600/50 mb-4">
                              {banner.imageUrl ? (
                                <img
                                  src={banner.imageUrl || "/placeholder.svg"}
                                  alt={banner.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-cyan-600 via-violet-600 to-emerald-600 flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">기본 배너</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-200 text-lg">{banner.name}</h4>
                                <p className="text-sm text-gray-400 mt-1">{banner.description}</p>
                              </div>
                              {selectedBannerId === banner.id && <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      배너 업데이트 중...
                    </>
                  ) : (
                    <>
                      <Save className="mr-3 h-6 w-6" />
                      배너 업데이트
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )

      case "affiliations":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-amber-600/90 to-orange-600/90 rounded-3xl p-8 text-white border border-amber-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Building className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">경력 및 학력</h2>
                  <p className="text-amber-100/90 text-lg">소속 기관과 경력 정보를 관리하세요</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-white">소속 정보</h3>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    소속 추가
                  </Button>
                </div>

                {affiliations.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Building className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">등록된 소속이 없습니다</p>
                    <p className="text-sm">첫 번째 소속을 추가해보세요</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {affiliations.map((affiliation) => (
                      <div
                        key={affiliation.id}
                        className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-amber-500/30 transition-all duration-200"
                      >
                        {editingAffiliationId === affiliation.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">기관명</label>
                                <Input
                                  value={editedAffiliation.name}
                                  onChange={(e) => setEditedAffiliation((prev) => ({ ...prev, name: e.target.value }))}
                                  className="bg-gray-900/50 border-gray-600 text-white focus:border-amber-500"
                                  placeholder="기관명을 입력하세요"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">부서/전공</label>
                                <Input
                                  value={editedAffiliation.department}
                                  onChange={(e) =>
                                    setEditedAffiliation((prev) => ({ ...prev, department: e.target.value }))
                                  }
                                  className="bg-gray-900/50 border-gray-600 text-white focus:border-amber-500"
                                  placeholder="부서 또는 전공을 입력하세요"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">시작일</label>
                                <Input
                                  type="date"
                                  value={editedAffiliation.startDate}
                                  onChange={(e) =>
                                    setEditedAffiliation((prev) => ({ ...prev, startDate: e.target.value }))
                                  }
                                  className="bg-gray-900/50 border-gray-600 text-white focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  종료일 (선택사항)
                                </label>
                                <Input
                                  type="date"
                                  value={editedAffiliation.endDate}
                                  onChange={(e) =>
                                    setEditedAffiliation((prev) => ({ ...prev, endDate: e.target.value }))
                                  }
                                  className="bg-gray-900/50 border-gray-600 text-white focus:border-amber-500"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setEditingAffiliationId(null)}
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                취소
                              </Button>
                              <Button
                                onClick={() => handleSaveAffiliation(affiliation.id)}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                              >
                                저장
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Building className="h-5 w-5 text-amber-400" />
                                <h4 className="text-xl font-semibold text-white">{affiliation.name}</h4>
                              </div>
                              {affiliation.department && <p className="text-gray-300 mb-2">{affiliation.department}</p>}
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {affiliation.startDate} ~ {affiliation.endDate || "현재"}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAffiliation(affiliation)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAffiliation(affiliation.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 소속 추가 다이얼로그 */}
                {showAddDialog && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
                      <h3 className="text-2xl font-bold text-white mb-6">새 소속 추가</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">기관명 *</label>
                          <Input
                            value={newAffiliation.name}
                            onChange={(e) => setNewAffiliation((prev) => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white focus:border-amber-500"
                            placeholder="대학교, 회사명 등"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">부서/전공</label>
                          <Input
                            value={newAffiliation.department}
                            onChange={(e) => setNewAffiliation((prev) => ({ ...prev, department: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white focus:border-amber-500"
                            placeholder="컴퓨터공학과, 개발팀 등"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">시작일 *</label>
                          <Input
                            type="date"
                            value={newAffiliation.startDate}
                            onChange={(e) => setNewAffiliation((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            종료일 (현재 소속인 경우 비워두세요)
                          </label>
                          <Input
                            type="date"
                            value={newAffiliation.endDate}
                            onChange={(e) => setNewAffiliation((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddDialog(false)
                            setNewAffiliation({ name: "", department: "", startDate: "", endDate: "" })
                          }}
                          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleAddAffiliation}
                          disabled={!newAffiliation.name || !newAffiliation.startDate}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50"
                        >
                          추가
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )

      case "account":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-slate-600/90 to-gray-600/90 rounded-3xl p-8 text-white border border-slate-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Settings className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">계정 설정</h2>
                  <p className="text-slate-100/90 text-lg">계정 정보와 보안 설정을 관리하세요</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-3">
                    <User className="h-6 w-6 text-slate-400" />
                    계정 정보
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label htmlFor="displayName" className="text-base font-medium text-gray-200">
                        표시 이름
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value)
                            const validation = validateDisplayName(e.target.value)
                            if (!validation.valid) {
                              setError(validation.message)
                            } else {
                              setError("")
                            }
                          }}
                          className="border-2 border-gray-700/50 focus:border-slate-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 rounded-xl h-12"
                          placeholder="한글, 영어, 숫자 사용 가능"
                        />
                        <p className="text-xs text-gray-400">
                          한글, 영어, 숫자 및 일반적인 특수문자 사용 가능 (최대 30자)
                          {!(userProfile?.role === "admin" || isSuperAdmin(userProfile)) && (
                            <span className="block text-yellow-400 mt-1">
                              ⚠️ 관리자 전용 태그([관리자], [ADMIN] 등)는 사용할 수 없습니다
                            </span>
                          )}
                          {(userProfile?.role === "admin" || isSuperAdmin(userProfile)) && (
                            <span className="block text-green-400 mt-1">
                              ✅ 관리자 계정은 자동으로 [관리자] 태그가 추가됩니다
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="email" className="text-base font-medium text-gray-200">
                        이메일 주소
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="border-2 border-gray-700/50 focus:border-slate-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 rounded-xl h-12"
                        />
                        {emailValid === true && (
                          <CheckCircle2 className="absolute right-3 top-3 h-6 w-6 text-emerald-400" />
                        )}
                        {emailValid === false && (
                          <AlertCircle className="absolute right-3 top-3 h-6 w-6 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t border-gray-700/50 pt-8">
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-3">
                    <Lock className="h-6 w-6 text-slate-400" />
                    비밀번호 변경
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="currentPassword" className="text-base font-medium text-gray-200">
                        현재 비밀번호
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="border-2 border-gray-700/50 focus:border-slate-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 rounded-xl h-12 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label htmlFor="newPassword" className="text-base font-medium text-gray-200">
                          새 비밀번호
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border-2 border-gray-700/50 focus:border-slate-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 rounded-xl h-12 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label htmlFor="confirmPassword" className="text-base font-medium text-gray-200">
                          비밀번호 확인
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-2 border-gray-700/50 focus:border-slate-400/70 transition-all duration-300 bg-gray-800/50 text-gray-100 rounded-xl h-12 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      비밀번호 변경
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )

      case "privacy":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-indigo-600/90 to-blue-600/90 rounded-3xl p-8 text-white border border-indigo-500/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">개인정보 보호</h2>
                  <p className="text-indigo-100/90 text-lg">프라이버시 설정과 데이터 관리를 설정하세요</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-3">
                    <Eye className="h-6 w-6 text-indigo-400" />
                    프로필 공개 설정
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">프로필 공개</h4>
                        <p className="text-sm text-gray-400">다른 사용자가 내 프로필을 볼 수 있습니다</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">이메일 공개</h4>
                        <p className="text-sm text-gray-400">프로필에서 이메일 주소를 표시합니다</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">활동 기록 공개</h4>
                        <p className="text-sm text-gray-400">최근 활동과 참여 기록을 표시합니다</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t border-gray-700/50 pt-8">
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-3">
                    <Bell className="h-6 w-6 text-indigo-400" />
                    알림 설정
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">이메일 알림</h4>
                        <p className="text-sm text-gray-400">중요한 업데이트를 이메일로 받습니다</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">팔로우 알림</h4>
                        <p className="text-sm text-gray-400">새로운 팔로워나 팔로잉 활동을 알립니다</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div>
                        <h4 className="font-medium text-gray-200">마케팅 알림</h4>
                        <p className="text-sm text-gray-400">새로운 기능과 이벤트 소식을 받습니다</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t border-gray-700/50 pt-8">
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-3">
                    <Database className="h-6 w-6 text-indigo-400" />
                    데이터 관리
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-6 border-indigo-400/50 text-indigo-400 hover:bg-indigo-400/10 flex-col items-start bg-transparent"
                    >
                      <Download className="h-6 w-6 mb-2" />
                      <div className="text-left">
                        <h4 className="font-medium">데이터 다운로드</h4>
                        <p className="text-sm text-gray-400 mt-1">내 모든 데이터를 다운로드합니다</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-6 border-red-400/50 text-red-400 hover:bg-red-400/10 flex-col items-start bg-transparent"
                    >
                      <Trash2 className="h-6 w-6 mb-2" />
                      <div className="text-left">
                        <h4 className="font-medium">계정 삭제</h4>
                        <p className="text-sm text-gray-400 mt-1">계정과 모든 데이터를 삭제합니다</p>
                      </div>
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handlePrivacyUpdate}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      설정 저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="mr-3 h-6 w-6" />
                      개인정보 설정 저장
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )

      default:
        return null
    }
  }

  // 로그인하지 않은 사용자 처리
  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto bg-gray-900/80 border-gray-800/50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-200 mb-2">로그인이 필요합니다</h2>
              <p className="text-gray-400 mb-6">프로필 설정을 이용하려면 먼저 로그인해주세요.</p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                로그인하러 가기
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black font-sans">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-0 shadow-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {sections.map((section) => (
                    <motion.button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${
                        activeSection === section.id
                          ? `bg-gradient-to-r ${section.darkGradient} text-white shadow-lg`
                          : "hover:bg-gray-800/50 text-gray-300 hover:text-white"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${activeSection === section.id ? "text-white" : section.color}`}>
                          {section.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{section.title}</h3>
                          <p className={`text-sm ${activeSection === section.id ? "text-white/80" : "text-gray-400"}`}>
                            {section.description}
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 ml-auto transition-transform ${
                            activeSection === section.id ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <Alert className="border-red-500/50 bg-red-500/10 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <AlertDescription className="text-base">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {renderSectionContent()}
          </div>
        </div>
      </div>

      {/* 팔로우 모달 */}
      {showFollowModal && (
        <FollowListModal
          isOpen={showFollowModal}
          onClose={() => setShowFollowModal(false)}
          userId={user.uid}
          type={followModalType}
        />
      )}

      <Footer />
    </div>
  )
}
