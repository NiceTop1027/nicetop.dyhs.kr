import {
  sendEmailVerification,
  applyActionCode,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

// Firebase 이메일 링크 로그인 발송
export async function sendLoginVerificationEmail(email: string) {
  try {
    // 더 간단한 actionCodeSettings 설정
    const actionCodeSettings = {
      url: `${window.location.origin}/login?mode=emailLink&email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    }

    console.log("Sending email link to:", email)
    console.log("Action code settings:", actionCodeSettings)

    await sendSignInLinkToEmail(auth, email, actionCodeSettings)

    // 이메일을 로컬 스토리지에 저장
    if (typeof window !== "undefined") {
      window.localStorage.setItem("emailForSignIn", email)
    }

    console.log("Email link sent successfully")
    return {
      success: true,
      message: "Firebase 인증 링크를 발송했습니다.",
    }
  } catch (error: any) {
    console.error("Send login email error:", error)

    // 더 자세한 오류 메시지
    let errorMessage = "이메일 발송에 실패했습니다."

    if (error.code === "auth/invalid-email") {
      errorMessage = "유효하지 않은 이메일 주소입니다."
    } else if (error.code === "auth/unauthorized-domain") {
      errorMessage = "승인되지 않은 도메인입니다. Firebase Console에서 도메인을 승인해주세요."
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage = "이메일 링크 로그인이 활성화되지 않았습니다. Firebase Console에서 활성화해주세요."
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 회원가입용 Firebase 이메일 링크 발송
export async function sendRegistrationVerificationEmail(email: string) {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/register?mode=emailLink&email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    }

    console.log("Sending registration email link to:", email)
    console.log("Action code settings:", actionCodeSettings)

    await sendSignInLinkToEmail(auth, email, actionCodeSettings)

    if (typeof window !== "undefined") {
      window.localStorage.setItem("emailForSignIn", email)
      window.localStorage.setItem("registrationMode", "true")
    }

    console.log("Registration email link sent successfully")
    return { success: true }
  } catch (error: any) {
    console.error("Registration email link send error:", error)

    let errorMessage = "회원가입용 인증 메일 발송에 실패했습니다."

    if (error.code === "auth/invalid-email") {
      errorMessage = "유효하지 않은 이메일 주소입니다."
    } else if (error.code === "auth/unauthorized-domain") {
      errorMessage = "승인되지 않은 도메인입니다. Firebase Console에서 도메인을 승인해주세요."
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage = "이메일 링크 인증이 활성화되지 않았습니다. Firebase Console에서 활성화해주세요."
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 이메일 링크로 로그인 처리
export async function verifyAndSignInWithEmailLink() {
  try {
    const currentUrl = window.location.href
    console.log("Checking email link:", currentUrl)

    if (isSignInWithEmailLink(auth, currentUrl)) {
      let email = window.localStorage.getItem("emailForSignIn")

      // URL에서 이메일 가져오기
      if (!email) {
        const urlParams = new URLSearchParams(window.location.search)
        email = urlParams.get("email")
      }

      if (!email) {
        email = window.prompt("이메일을 입력해주세요:")
      }

      if (email) {
        console.log("Signing in with email link for:", email)
        const result = await signInWithEmailLink(auth, email, currentUrl)

        // 로컬 스토리지 정리
        window.localStorage.removeItem("emailForSignIn")
        window.localStorage.removeItem("registrationMode")

        console.log("Email link sign-in successful")
        return {
          success: true,
          user: result.user,
          message: "이메일 링크 로그인이 완료되었습니다.",
        }
      }
    }

    return {
      success: false,
      error: "유효하지 않은 로그인 링크입니다.",
    }
  } catch (error: any) {
    console.error("Email link sign-in error:", error)

    let errorMessage = "이메일 링크 로그인에 실패했습니다."

    if (error.code === "auth/invalid-action-code") {
      errorMessage = "인증 링크가 유효하지 않거나 만료되었습니다."
    } else if (error.code === "auth/expired-action-code") {
      errorMessage = "인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요."
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 회원가입용 이메일 링크 인증 확인
export async function verifyRegistrationEmailLink() {
  try {
    const currentUrl = window.location.href
    console.log("Checking registration email link:", currentUrl)

    if (isSignInWithEmailLink(auth, currentUrl)) {
      let email = window.localStorage.getItem("emailForSignIn")

      if (!email) {
        const urlParams = new URLSearchParams(window.location.search)
        email = urlParams.get("email")
      }

      if (!email) {
        return { success: false, error: "이메일 정보를 찾을 수 없습니다." }
      }

      console.log("Verifying registration email link for:", email)

      // 임시로 로그인하여 이메일 인증 완료 확인
      const result = await signInWithEmailLink(auth, email, currentUrl)

      // 회원가입 과정이므로 즉시 로그아웃
      await auth.signOut()

      // 인증된 이메일 저장
      saveVerifiedEmail(email)

      // 로컬 스토리지 정리
      window.localStorage.removeItem("emailForSignIn")
      window.localStorage.removeItem("registrationMode")

      console.log("Registration email verification successful")
      return {
        success: true,
        email: email,
        message: "이메일 인증이 완료되었습니다. 회원가입을 계속 진행하세요.",
      }
    }

    return { success: false, error: "유효하지 않은 인증 링크입니다." }
  } catch (error: any) {
    console.error("Registration email verification error:", error)

    let errorMessage = "이메일 인증에 실패했습니다."

    if (error.code === "auth/invalid-action-code") {
      errorMessage = "인증 링크가 유효하지 않거나 만료되었습니다."
    } else if (error.code === "auth/expired-action-code") {
      errorMessage = "인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요."
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 대체 방법: 일반 회원가입 후 이메일 인증
export async function createAccountWithEmailVerification(email: string, password: string, username: string) {
  try {
    console.log("Creating account for:", email)

    // Firebase 계정 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // 사용자 프로필 업데이트
    await updateProfile(user, {
      displayName: username,
    })

    // 이메일 인증 메일 발송
    await sendEmailVerification(user, {
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: false,
    })

    // 계정 생성 후 로그아웃 (인증 완료 후 로그인하도록)
    await auth.signOut()

    console.log("Account created and verification email sent")
    return {
      success: true,
      email: user.email,
      message: "회원가입이 완료되었습니다. Firebase에서 발송한 인증 메일을 확인해주세요.",
    }
  } catch (error: any) {
    console.error("Account creation error:", error)

    let errorMessage = "회원가입에 실패했습니다."

    if (error.code === "auth/email-already-in-use") {
      errorMessage = "이미 사용 중인 이메일입니다."
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "유효하지 않은 이메일 주소입니다."
    } else if (error.code === "auth/weak-password") {
      errorMessage = "비밀번호가 너무 약합니다. 최소 6자 이상 입력해주세요."
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// URL에서 이메일 인증 처리
export async function verifyEmailFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get("mode")
    const oobCode = urlParams.get("oobCode")

    console.log("Verifying email from URL:", { mode, oobCode })

    if (mode === "verifyEmail" && oobCode) {
      await applyActionCode(auth, oobCode)
      return {
        success: true,
        message: "이메일 인증이 완료되었습니다!",
      }
    }

    return {
      success: false,
      error: "유효하지 않은 인증 링크입니다.",
    }
  } catch (error: any) {
    console.error("Email verification error:", error)
    return {
      success: false,
      error: "이메일 인증 처리 중 오류가 발생했습니다.",
    }
  }
}

// 이메일 인증 상태 확인 (Register page 사용)
export function checkEmailVerificationStatus(email: string): boolean {
  if (typeof window === "undefined") return false
  const verifiedEmails = JSON.parse(window.localStorage.getItem("verifiedEmails") || "[]")
  return verifiedEmails.includes(email)
}

// 인증된 이메일 저장
export function saveVerifiedEmail(email: string) {
  if (typeof window === "undefined") return
  const verifiedEmails = JSON.parse(window.localStorage.getItem("verifiedEmails") || "[]")
  if (!verifiedEmails.includes(email)) {
    verifiedEmails.push(email)
    window.localStorage.setItem("verifiedEmails", JSON.stringify(verifiedEmails))
  }
}

// Firebase 설정 확인 함수 (더 자세한 정보)
export function checkFirebaseEmailLinkConfig() {
  console.log("🔥 Firebase Email Link Configuration Check:")
  console.log("✅ Firebase Auth instance:", auth)
  console.log("✅ Current domain:", window.location.origin)
  console.log("✅ Auth domain:", auth.app.options.authDomain)
  console.log("✅ Project ID:", auth.app.options.projectId)

  // 현재 사용자 상태
  console.log("👤 Current user:", auth.currentUser?.email || "Not logged in")

  // 로컬 스토리지 확인
  const emailForSignIn = window.localStorage.getItem("emailForSignIn")
  const verifiedEmails = window.localStorage.getItem("verifiedEmails")
  console.log("💾 Email for sign in:", emailForSignIn)
  console.log("💾 Verified emails:", verifiedEmails)

  // URL 확인
  console.log("🌐 Current URL:", window.location.href)
  console.log("🌐 Is sign-in link:", isSignInWithEmailLink(auth, window.location.href))

  return {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    currentDomain: window.location.origin,
    isSignInLink: isSignInWithEmailLink(auth, window.location.href),
    hasEmailForSignIn: !!emailForSignIn,
  }
}
