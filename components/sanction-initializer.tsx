"use client"

import { useEffect } from "react"

export function SanctionInitializer() {
  useEffect(() => {
    // 제재 시스템 관련 초기화는 필요시 여기서 처리
    console.log("제재 시스템 초기화됨")
  }, [])

  return null // 이 컴포넌트는 UI를 렌더링하지 않습니다
}
