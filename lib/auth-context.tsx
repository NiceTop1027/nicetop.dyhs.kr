"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

// 사용자 타입 정의
type User = FirebaseUser | null

// 프로필 업데이트 타입 정의
type ProfileUpdateData = {
  displayName?: string
  email?: string
  currentPassword?: string
  newPassword?: string
  bio?: string
  location?: string
  website?: string
  photoURL?: string
}

// 인증 컨텍스트 타입 정의
type AuthContextType = {
  user: User
  userProfile: UserProfile | null
  signUp: (email: string, password: string, username: string, isTemporary?: boolean) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: ProfileUpdateData) => Promise<void>
  loading: boolean
  checkUsernameExists: (username: string) => Promise<boolean>
  checkEmailExists: (email: string) => Promise<boolean>
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>
  isEmailVerified: boolean
  createTemporaryAccount: () => Promise<void> // 일회용 계정 생성 함수 추가
}

// 사용자 프로필 타입 정의
type UserProfile = {
  uid: string
  email: string
  username: string
  bio?: string
  location?: string
  website?: string
  photoURL?: string
  createdAt: Timestamp | string
  updatedAt?: Timestamp
  points: number
  solvedChallenges: string[]
  role: string
  lastLogin?: Timestamp
  title?: string
  emailVerified: boolean
  isTemporary?: boolean // 일회용 계정 여부 추가
}

// 입력 검증 함수
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  return usernameRegex.test(username)
}

const validatePassword = (password: string): boolean => {
  return password.length >= 8
}

// 랜덤 닉네임 생성 함수를 간단하게 변경하되 타임스탬프로 유니크성 보장
const generateRandomUsername = (): string => {
  const prefixes = ["user", "guest", "temp", "anon", "player", "hacker", "coder", "ninja", "cyber", "ghost"]
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const timestamp = Date.now().toString().slice(-6) // 마지막 6자리 타임스탬프
  const randomSuffix = Math.floor(Math.random() * 999) + 1 // 1-999 랜덤 숫자
  return `${randomPrefix}${timestamp}${randomSuffix}`
}

// 유니크한 임시 이메일 생성 함수
const generateTempEmail = (): string => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 10)
  return `temp${timestamp}${randomId}@tempuser.dev`
}

// 강력한 임시 비밀번호 생성 함수
const generateTempPassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 인증 제공자 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  // 사용자 로그인 상태 감지
  useEffect(() => {
    if (typeof window === "undefined" || !auth) return

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setIsEmailVerified(user?.emailVerified || false)

      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserProfile

            // 이메일 인증 상태 업데이트
            if (userData.emailVerified !== user.emailVerified) {
              await updateDoc(userDocRef, {
                emailVerified: user.emailVerified,
                lastLogin: serverTimestamp(),
              })
              userData.emailVerified = user.emailVerified
            }

            // 특정 이메일을 가진 사용자를 관리자로 설정
            if (user.email === "mistarcodm@gmail.com" && userData.role !== "admin") {
              await updateDoc(userDocRef, {
                role: "admin",
                title: "관리자",
                lastLogin: serverTimestamp(),
              })
              userData.role = "admin"
              userData.title = "관리자"
            } else {
              try {
                await updateDoc(userDocRef, {
                  lastLogin: serverTimestamp(),
                })
              } catch (updateError) {
                // 업데이트 실패해도 계속 진행
              }
            }

            setUserProfile(userData)
          } else {
            // 새 사용자 프로필 생성
            const isAdmin = user.email === "mistarcodm@gmail.com"
            const newUserProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              username: user.displayName || "사용자",
              bio: "",
              location: "",
              website: "",
              photoURL: user.photoURL || "",
              createdAt: serverTimestamp() as Timestamp,
              updatedAt: serverTimestamp() as Timestamp,
              points: 0,
              solvedChallenges: [],
              role: isAdmin ? "admin" : "user",
              lastLogin: serverTimestamp() as Timestamp,
              title: isAdmin ? "관리자" : undefined,
              emailVerified: user.emailVerified,
              isTemporary: false,
            }

            try {
              await setDoc(userDocRef, newUserProfile)
            } catch (setDocError) {
              // 문서 생성 실패해도 UI는 계속 표시
            }

            setUserProfile(newUserProfile)
          }
        } catch (error) {
          // 기본 사용자 프로필 설정
          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            username: user.displayName || "사용자",
            bio: "",
            location: "",
            website: "",
            photoURL: user.photoURL || "",
            createdAt: new Date().toISOString(),
            points: 0,
            solvedChallenges: [],
            role: user.email === "mistarcodm@gmail.com" ? "admin" : "user",
            title: user.email === "mistarcodm@gmail.com" ? "관리자" : undefined,
            emailVerified: user.emailVerified,
            isTemporary: false,
          }

          setUserProfile(defaultProfile)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 이메일 중복 확인
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      return false // Firebase Auth에서 자체적으로 중복 검사
    } catch (error) {
      return false
    }
  }

  // 사용자 이름 중복 확인
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      if (typeof window === "undefined" || !db) {
        return false
      }

      if (!username || username.trim() === "") {
        return false
      }

      const usersRef = collection(db, "users")
      const q = query(usersRef, where("username", "==", username))

      try {
        const querySnapshot = await getDocs(q)
        return !querySnapshot.empty
      } catch (queryError) {
        return false
      }
    } catch (error) {
      return false
    }
  }

  // 회원가입 함수 - 이메일 인증된 사용자만 계정 생성
  const signUp = async (email: string, password: string, username: string, isTemporary = false) => {
    try {
      // 입력 검증
      if (!validateEmail(email)) {
        throw new Error("유효하지 않은 이메일 형식입니다.")
      }

      if (!validateUsername(username)) {
        throw new Error("사용자 이름은 3-20자의 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다.")
      }

      if (!validatePassword(password)) {
        throw new Error("비밀번호는 최소 8자 이상이어야 합니다.")
      }

      // 사용자 이름 중복 확인
      const usernameExists = await checkUsernameExists(username)
      if (usernameExists) {
        throw new Error("이미 사용 중인 사용자 이름입니다.")
      }

      // 계정 생성 (이미 이메일 인증이 완료된 상태)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 사용자 프로필 업데이트
      await updateProfile(user, {
        displayName: username,
      })

      // Firestore에 사용자 정보 저장
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        username: username,
        bio: "",
        location: "",
        website: "",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        points: 0,
        solvedChallenges: [],
        role: "user",
        lastLogin: serverTimestamp() as Timestamp,
        emailVerified: true,
        isTemporary: isTemporary, // 일회용 계정 여부 설정
      }

      await setDoc(doc(db, "users", user.uid), userProfile)
      setUserProfile(userProfile)

      return
    } catch (error: any) {
      // Firebase 오류 메시지 한글화
      if (error.code === "auth/email-already-in-use") {
        throw new Error("이미 사용 중인 이메일입니다.")
      } else if (error.code === "auth/invalid-email") {
        throw new Error("유효하지 않은 이메일 형식입니다.")
      } else if (error.code === "auth/weak-password") {
        throw new Error("비밀번호가 너무 약합니다.")
      } else {
        throw error
      }
    }
  }

  // 로그인 함수 - 이메일 인증은 별도 페이지에서 처리
  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        throw new Error("이메일과 비밀번호를 모두 입력해주세요.")
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 이메일 인증 확인은 별도 페이지에서 이미 처리됨
      return
    } catch (error: any) {
      // Firebase 오류 메시지 한글화
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.")
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.")
      } else if (error.code === "auth/user-disabled") {
        throw new Error("계정이 비활성화되었습니다. 관리자에게 문의하세요.")
      } else {
        throw error
      }
    }
  }

  // 로그아웃 함수
  const signOut = async () => {
    try {
      const currentUser = auth.currentUser
      const isTemporaryAccount = userProfile?.isTemporary

      await firebaseSignOut(auth)

      // 일회용 계정인 경우 계정 삭제
      if (isTemporaryAccount && currentUser) {
        try {
          // Firestore에서 사용자 데이터 삭제
          await deleteDoc(doc(db, "users", currentUser.uid))

          // Firebase Auth에서 계정 삭제
          await currentUser.delete()
        } catch (deleteError) {
          console.error("일회용 계정 삭제 중 오류:", deleteError)
          // 삭제 실패해도 로그아웃은 완료된 상태
        }
      }

      return
    } catch (error) {
      throw new Error("로그아웃 중 오류가 발생했습니다.")
    }
  }

  // 프로필 업데이트 함수
  const updateUserProfile = async (data: ProfileUpdateData) => {
    if (!user) throw new Error("사용자가 로그인되어 있지 않습니다.")

    try {
      const updates: Partial<UserProfile> = {
        updatedAt: serverTimestamp() as Timestamp,
      }

      // 이름 업데이트
      if (data.displayName && data.displayName !== user.displayName) {
        const usernameExists = await checkUsernameExists(data.displayName)
        if (usernameExists) {
          throw new Error("이미 사용 중인 사용자 이름입니다.")
        }

        if (!validateUsername(data.displayName)) {
          throw new Error("사용자 이름은 3-20자의 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다.")
        }

        await updateProfile(user, { displayName: data.displayName })
        updates.username = data.displayName
      }

      // 추가 프로필 정보 업데이트
      if (data.bio !== undefined) updates.bio = data.bio
      if (data.location !== undefined) updates.location = data.location
      if (data.website !== undefined) {
        if (data.website && !data.website.startsWith("http")) {
          updates.website = `https://${data.website}`
        } else {
          updates.website = data.website
        }
      }

      // 프로필 사진 URL 업데이트
      if (data.photoURL) {
        try {
          await updateProfile(user, { photoURL: data.photoURL })
          updates.photoURL = data.photoURL
        } catch (photoError) {
          // 프로필 사진 업데이트 실패해도 계속 진행
        }
      }

      // Firestore 업데이트
      if (Object.keys(updates).length > 0) {
        try {
          const userRef = doc(db, "users", user.uid)
          await updateDoc(userRef, updates)
        } catch (updateError) {
          // Firestore 업데이트 실패해도 로컬 상태는 업데이트
        }

        // 로컬 상태 업데이트
        if (userProfile) {
          const updatedProfile = {
            ...userProfile,
            ...updates,
            updatedAt: updates.updatedAt || userProfile.updatedAt,
          }
          setUserProfile(updatedProfile)
        }

        // 현재 사용자 객체 새로고침
        try {
          const currentUser = auth.currentUser
          if (currentUser) {
            await currentUser.reload()
            setUser({ ...currentUser })
          }
        } catch (reloadError) {
          // 사용자 새로고침 실패해도 계속 진행
        }
      }

      return
    } catch (error: any) {
      throw error
    }
  }

  const sendVerificationEmail = async () => {
    return { success: false, error: "이 기능은 회원가입 과정에서만 사용됩니다." }
  }

  // createTemporaryAccount 함수를 간단하게 수정
  const createTemporaryAccount = async () => {
    try {
      // 간단한 임시 계정 정보 생성
      const tempUsername = generateRandomUsername()
      const tempEmail = generateTempEmail()
      const tempPassword = generateTempPassword()

      await signUp(tempEmail, tempPassword, tempUsername, true)
    } catch (error: any) {
      console.error("Temporary account creation error:", error)

      if (error.code === "auth/email-already-in-use") {
        // 이메일 중복 시 재시도
        return await createTemporaryAccount()
      } else {
        throw new Error("일회용 계정 생성 중 오류가 발생했습니다.")
      }
    }
  }

  const value = {
    user,
    userProfile,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    loading,
    checkUsernameExists,
    checkEmailExists,
    sendVerificationEmail,
    isEmailVerified,
    createTemporaryAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 인증 컨텍스트 사용 훅
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
