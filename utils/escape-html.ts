/**
 * HTML 이스케이프 함수 - XSS 공격 방지
 */
export function escapeHtml(text: string): string {
  if (!text) return ""

  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }

  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * HTML 태그 제거 함수
 */
export function stripHtml(html: string): string {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "")
}

/**
 * 텍스트 길이 제한 함수
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}
