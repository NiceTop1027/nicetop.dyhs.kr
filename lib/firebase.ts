import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics } from "firebase/analytics"

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCmrrk-OyHQef9mdjSRxo6zUwqvXQA9yYw",
  authDomain: "ntctf-1b330.firebaseapp.com",
  databaseURL: "https://ntctf-1b330-default-rtdb.firebaseio.com",
  projectId: "ntctf-1b330",
  storageBucket: "ntctf-1b330.firebasestorage.app",
  messagingSenderId: "125413562736",
  appId: "1:125413562736:web:a56a877a95b07d3bb717b5",
  measurementId: "G-MNB0MH99M7",
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// Firebase 서비스 초기화
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Analytics (클라이언트 사이드에서만)
let analytics: any = null
if (typeof window !== "undefined") {
  analytics = getAnalytics(app)
}
export { analytics }

// 개발 환경에서 에뮬레이터 연결 (선택사항)
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  // 에뮬레이터가 이미 연결되었는지 확인
  if (!auth.config.emulator) {
    // connectAuthEmulator(auth, "http://localhost:9099")
  }
  if (!db._delegate._databaseId.projectId.includes("demo-")) {
    // connectFirestoreEmulator(db, "localhost", 8080)
  }
  if (!storage._delegate._host.includes("localhost")) {
    // connectStorageEmulator(storage, "localhost", 9199)
  }
}

export default app

// Firebase 설정 확인 함수
export const checkFirebaseConfig = () => {
  console.log("🔥 Firebase Configuration Check:")
  console.log("✅ Project ID:", firebaseConfig.projectId)
  console.log("✅ Auth Domain:", firebaseConfig.authDomain)
  console.log("✅ API Key:", firebaseConfig.apiKey ? "Set" : "Missing")
  console.log("✅ App ID:", firebaseConfig.appId ? "Set" : "Missing")

  // Auth 상태 확인
  console.log("🔐 Auth Status:")
  console.log("- Current User:", auth.currentUser?.email || "Not logged in")
  console.log("- Auth Domain:", auth.config.apiHost)

  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    isConfigured: !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId),
  }
}
