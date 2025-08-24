import { format } from "date-fns"
import { ko } from "date-fns/locale"

export function cn(...inputs: any) {
  return inputs.filter(Boolean).join(" ")
}

export const formatDate = (date: any) => {
  if (!date) return "날짜 없음"

  try {
    let jsDate
    if (typeof date === "string") {
      jsDate = new Date(date)
    } else {
      jsDate = date.toDate()
    }
    return format(jsDate, "yyyy년 MM월 dd일", { locale: ko })
  } catch (error) {
    console.error("Date formatting error:", error)
    return "날짜 형식 오류"
  }
}
