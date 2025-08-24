export function escapeHtml(text: string | null | undefined): string {
  if (typeof text !== "string") {
    return ""
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function sanitizeInput(text: string): string {
  return escapeHtml(text)
}

// CSRF 토큰 생성 (브라우저 환경에 안전한 방식으로 구현)
export function generateCSRFToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint32Array(4)
    window.crypto.getRandomValues(randomValues)
    return `${randomValues[0].toString(36)}${randomValues[1].toString(36)}${randomValues[2].toString(36)}${randomValues[3].toString(36)}`
  } else {
    // Node.js 환경일 경우 (또는 window.crypto를 사용할 수 없는 경우)에 대한 대체 로직
    // 이 예제에서는 Math.random()을 사용하지만, 더 안전한 방법을 사용하는 것이 좋습니다.
    console.warn("window.crypto를 사용할 수 없는 환경입니다. CSRF 토큰 생성을 위해 더 안전한 방법을 고려하세요.")
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

// CSRF 토큰 검증 (시간 공격에 안전한 방식으로 구현)
export function verifyCSRFToken(token1: string, token2: string): boolean {
  if (typeof token1 !== "string" || typeof token2 !== "string") {
    return false
  }

  // Constant-time 비교를 수행하여 타이밍 공격을 방지합니다.
  let result = true
  if (token1.length !== token2.length) {
    result = false
  }

  for (let i = 0; i < token1.length; i++) {
    if (token1[i] !== token2[i]) {
      result = false
    }
  }

  return result
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const key = `rate_limit:${identifier}`

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime <= now) {
        rateLimitStore.delete(k)
      }
    }
  }

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetTime <= now) {
    // First request or window expired, create new entry
    const resetTime = now + windowMs
    rateLimitStore.set(key, { count: 1, resetTime })

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    }
  }

  if (existing.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    }
  }

  // Increment count
  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetTime: existing.resetTime,
  }
}

export function validateInput(input: string): boolean {
  if (typeof input !== "string") {
    return false
  }

  // Check for common malicious patterns
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
    /data:text\/html/gi, // Data URLs with HTML
    /vbscript:/gi, // VBScript protocol
    /<iframe\b[^>]*>/gi, // Iframe tags
    /<object\b[^>]*>/gi, // Object tags
    /<embed\b[^>]*>/gi, // Embed tags
    /<link\b[^>]*>/gi, // Link tags
    /<meta\b[^>]*>/gi, // Meta tags
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(\s*javascript:/gi, // CSS with JavaScript URLs
    /import\s+/gi, // CSS imports
    /@import/gi, // CSS @import
    /binding\s*:/gi, // CSS binding
    /behavior\s*:/gi, // CSS behavior
    /mocha:/gi, // Mocha protocol
    /livescript:/gi, // LiveScript protocol
    /\beval\s*\(/gi, // eval() calls
    /\bFunction\s*\(/gi, // Function constructor
    /\bsetTimeout\s*\(/gi, // setTimeout with string
    /\bsetInterval\s*\(/gi, // setInterval with string
    /\bexecScript\s*\(/gi, // execScript
    /\bdocument\.write/gi, // document.write
    /\bdocument\.writeln/gi, // document.writeln
    /\bwindow\.location/gi, // window.location manipulation
    /\blocation\.href/gi, // location.href manipulation
    /\blocation\.replace/gi, // location.replace
    /\blocation\.assign/gi, // location.assign
    /\bhistory\.pushState/gi, // history manipulation
    /\bhistory\.replaceState/gi, // history manipulation
    /\bpostMessage/gi, // postMessage
    /\bmessage\s*:/gi, // message event
    /\bparent\./gi, // parent frame access
    /\btop\./gi, // top frame access
    /\bframes\[/gi, // frames access
    /\bwindow\[/gi, // window property access
    /\bdocument\[/gi, // document property access
    /\bthis\[/gi, // this property access with brackets
    /\b__proto__/gi, // prototype pollution
    /\bconstructor/gi, // constructor access
    /\bprototype/gi, // prototype access
    /\.\./gi, // Path traversal
    /\bfile:\/\//gi, // File protocol
    /\bftp:\/\//gi, // FTP protocol
    /\bgopher:\/\//gi, // Gopher protocol
    /\bldap:\/\//gi, // LDAP protocol
    /\bdict:\/\//gi, // Dict protocol
    /\bphp:\/\//gi, // PHP protocol
    /\bzlib:\/\//gi, // Zlib protocol
    /\bglob:\/\//gi, // Glob protocol
    /\brar:\/\//gi, // RAR protocol
    /\bogg:\/\//gi, // OGG protocol
    /\bexpect:\/\//gi, // Expect protocol
    /\bSSI/gi, // Server Side Includes
    /<!--\s*#/gi, // SSI comments
    /\binclude\s*=/gi, // Include directives
    /\bexec\s*=/gi, // Exec directives
    /\bconfig\s*=/gi, // Config directives
    /\becho\s*=/gi, // Echo directives
    /\bset\s*=/gi, // Set directives
    /\bif\s*=/gi, // If directives
    /\belif\s*=/gi, // Elif directives
    /\belse\s*=/gi, // Else directives
    /\bendif\s*=/gi, // Endif directives
    /\bexec\s+/gi, // Exec commands
    /\bsystem\s*\(/gi, // System calls
    /\bshell_exec\s*\(/gi, // Shell execution
    /\bpassthru\s*\(/gi, // Passthru
    /\bpopen\s*\(/gi, // Popen
    /\bproc_open\s*\(/gi, // Process open
    /\bfile_get_contents\s*\(/gi, // File operations
    /\bfile_put_contents\s*\(/gi, // File operations
    /\bfopen\s*\(/gi, // File operations
    /\bfwrite\s*\(/gi, // File operations
    /\bfread\s*\(/gi, // File operations
    /\bunlink\s*\(/gi, // File deletion
    /\bmkdir\s*\(/gi, // Directory creation
    /\brmdir\s*\(/gi, // Directory deletion
    /\bchmod\s*\(/gi, // Permission changes
    /\bchown\s*\(/gi, // Ownership changes
    /\bmove_uploaded_file\s*\(/gi, // File uploads
    /\bcopy\s*\(/gi, // File copying
    /\brename\s*\(/gi, // File renaming
    /\bsymlink\s*\(/gi, // Symbolic links
    /\breadlink\s*\(/gi, // Link reading
    /\bglob\s*\(/gi, // Glob patterns
    /\bscandir\s*\(/gi, // Directory scanning
    /\bopendir\s*\(/gi, // Directory opening
    /\breaddir\s*\(/gi, // Directory reading
    /\bclosedir\s*\(/gi, // Directory closing
    /\brewinddir\s*\(/gi, // Directory rewinding
    /\bis_dir\s*\(/gi, // Directory checking
    /\bis_file\s*\(/gi, // File checking
    /\bis_readable\s*\(/gi, // Readability checking
    /\bis_writable\s*\(/gi, // Writability checking
    /\bis_executable\s*\(/gi, // Executability checking
    /\bfile_exists\s*\(/gi, // File existence checking
    /\bfiletype\s*\(/gi, // File type checking
    /\bfilesize\s*\(/gi, // File size checking
    /\bfilemtime\s*\(/gi, // File modification time
    /\bfilectime\s*\(/gi, // File creation time
    /\bfileatime\s*\(/gi, // File access time
    /\bstat\s*\(/gi, // File statistics
    /\blstat\s*\(/gi, // Link statistics
    /\brealpath\s*\(/gi, // Real path resolution
    /\bpathinfo\s*\(/gi, // Path information
    /\bdirname\s*\(/gi, // Directory name
    /\bbasename\s*\(/gi, // Base name
  ]

  // Check against malicious patterns
  for (const pattern of maliciousPatterns) {
    if (pattern.test(input)) {
      return false
    }
  }

  // Check for excessive length (potential DoS)
  if (input.length > 10000) {
    return false
  }

  // Check for null bytes
  if (input.includes("\0")) {
    return false
  }

  // Check for control characters (except common whitespace)
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
  if (controlCharPattern.test(input)) {
    return false
  }

  return true
}
