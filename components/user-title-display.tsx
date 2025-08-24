"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Award, Crown, Shield, Star, Trophy, Zap } from "lucide-react"

interface Title {
  id: string
  name: string
  description: string
  color: string
  backgroundColor?: string
  borderColor?: string
  icon?: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

interface UserTitleDisplayProps {
  title?: Title
  showTooltip?: boolean
  size?: "sm" | "md" | "lg"
}

export function UserTitleDisplay({ title, showTooltip = true, size = "md" }: UserTitleDisplayProps) {
  if (!title) return null

  // 아이콘 매핑
  const iconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
    award: <Award className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
    zap: <Zap className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
    user: <Shield className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
    users: <Star className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
    crown: <Crown className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />,
  }

  // 희귀도에 따른 애니메이션 효과
  const rarityAnimation = {
    common: "",
    uncommon: "",
    rare: "animate-pulse",
    epic: "animate-pulse",
    legendary: "animate-pulse shadow-glow",
  }

  // 희귀도에 따른 배지 스타일
  const rarityStyle = {
    common: "bg-slate-100 text-slate-800 border-slate-200",
    uncommon: "bg-green-50 text-green-700 border-green-200",
    rare: "bg-blue-50 text-blue-700 border-blue-200",
    epic: "bg-purple-50 text-purple-700 border-purple-200",
    legendary: "bg-amber-50 text-amber-700 border-amber-200",
  }

  // 크기에 따른 패딩 조정
  const sizeStyle = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-0.5 text-sm",
    lg: "px-3 py-1 text-base",
  }

  const titleBadge = (
    <Badge
      variant="outline"
      className={`
        ${rarityStyle[title.rarity]} 
        ${rarityAnimation[title.rarity]}
        ${sizeStyle[size]}
        inline-flex items-center gap-1
      `}
      style={{
        color: title.color,
        backgroundColor: title.backgroundColor,
        borderColor: title.borderColor,
      }}
    >
      {title.icon && iconMap[title.icon]}
      <span>{title.name}</span>
    </Badge>
  )

  if (!showTooltip) return titleBadge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{titleBadge}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 max-w-xs">
            <div className="font-medium">{title.name}</div>
            <p className="text-xs">{title.description}</p>
            <div className="text-xs text-muted-foreground">
              희귀도:{" "}
              {title.rarity === "legendary"
                ? "전설급"
                : title.rarity === "epic"
                  ? "서사급"
                  : title.rarity === "rare"
                    ? "희귀급"
                    : title.rarity === "uncommon"
                      ? "고급"
                      : "일반"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
