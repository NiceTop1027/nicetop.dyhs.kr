import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics } from "firebase/analytics"

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

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics only in browser environment
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null

export default app
