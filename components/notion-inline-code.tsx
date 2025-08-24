"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface NotionInlineCodeProps {
  children: React.ReactNode
  copyable?: boolean
  className?: string
}

export function NotionInlineCode({ children, copyable = false, className = "" }: NotionInlineCodeProps) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const handleCopy = useCallback(async () => {
    if (!codeRef.current) return

    try {
      const text = codeRef.current.textContent || ""
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("복사 실패:", err)
    }
  }, [])

  return (
    <span
      className={`group relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <code
        ref={codeRef}
        className="inline-flex items-center px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm font-mono border border-red-200 dark:border-red-800 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
      >
        {children}
      </code>

      {copyable && isHovered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="absolute -right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      )}
    </span>
  )
}
