import { type NextRequest, NextResponse } from "next/server"
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { DEFAULT_CATEGORIES } from "@/lib/community-types"
import { checkRateLimit } from "@/lib/security-utils"

export async function GET(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const rateLimit = checkRateLimit(ip, 100, 15 * 60 * 1000)

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const categoriesRef = collection(db, "community_categories")
    const categoriesSnapshot = await getDocs(categoriesRef)

    if (categoriesSnapshot.empty) {
      // 기본 카테고리 생성
      const categories = []
      for (const category of DEFAULT_CATEGORIES) {
        const docRef = await addDoc(categoriesRef, {
          ...category,
          createdAt: Timestamp.now(),
          createdBy: "system",
        })
        categories.push({ id: docRef.id, ...category })
      }
      return NextResponse.json(categories)
    }

    const categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
