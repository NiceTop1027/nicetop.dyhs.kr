"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Crown, Shield, Star, Trophy, Zap } from "lucide-react"

// 타입 정의
interface Title {
  id: string
  name: string
  description: string
  color: string
  backgroundColor?: string
  borderColor?: string
  icon?: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  unlockCondition?: string
}

interface User {
  id: string
  username: string
  displayName: string
  titles: Title[]
  activeTitle?: Title
}

interface TitleEditorProps {
  user: User
  availableTitles: Title[]
  onSave: (titles: Title[], activeTitle?: Title) => void
}

// 아이콘 매핑
const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-4 w-4" />,
  award: <Award className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  user: <Shield className="h-4 w-4" />,
  users: <Star className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
}

export function TitleEditor({ user, availableTitles, onSave }: TitleEditorProps) {
  const [userTitles, setUserTitles] = useState<Title[]>(user.titles)
  const [activeTitle, setActiveTitle] = useState<Title | undefined>(user.activeTitle)
  const [activeTab, setActiveTab] = useState("assigned")

  // 사용자에게 할당되지 않은 칭호 필터링
  const unassignedTitles = availableTitles.filter((title) => !userTitles.some((ut) => ut.id === title.id))

  // 칭호 추가
  const addTitle = (title: Title) => {
    setUserTitles([...userTitles, title])
  }

  // 칭호 제거
  const removeTitle = (titleId: string) => {
    const newTitles = userTitles.filter((t) => t.id !== titleId)
    setUserTitles(newTitles)

    // 활성 칭호가 제거된 경우 활성 칭호 초기화
    if (activeTitle && activeTitle.id === titleId) {
      setActiveTitle(undefined)
    }
  }

  // 활성 칭호 설정
  const setAsActive = (title: Title) => {
    setActiveTitle(title)
  }

  // 변경사항 저장
  const handleSave = () => {
    onSave(userTitles, activeTitle)
  }

  // 칭호 렌더링
  const renderTitle = (title: Title, isAssigned = false) => {
    const rarityColors = {
      common: "bg-slate-100 text-slate-800 border-slate-200",
      uncommon: "bg-green-50 text-green-700 border-green-200",
      rare: "bg-blue-50 text-blue-700 border-blue-200",
      epic: "bg-purple-50 text-purple-700 border-purple-200",
      legendary: "bg-amber-50 text-amber-700 border-amber-200",
    }

    const isActive = activeTitle?.id === title.id

    return (
      <Card key={title.id} className={`mb-3 ${isActive ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${rarityColors[title.rarity]} px-2 py-0.5`}
                style={{
                  color: title.color,
                  backgroundColor: title.backgroundColor,
                  borderColor: title.borderColor,
                }}
              >
                {title.icon && iconMap[title.icon]}
                <span className="ml-1">{title.name}</span>
              </Badge>
              {isActive && (
                <Badge variant="secondary" className="ml-2">
                  활성 칭호
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {title.rarity === "legendary" && "전설급"}
              {title.rarity === "epic" && "서사급"}
              {title.rarity === "rare" && "희귀급"}
              {title.rarity === "uncommon" && "고급"}
              {title.rarity === "common" && "일반"}
            </div>
          </div>
          <CardDescription className="text-sm mt-1">{title.description}</CardDescription>
        </CardHeader>
        <CardFooter className="pt-0 pb-2">
          <div className="flex justify-between items-center w-full">
            {title.unlockCondition && (
              <div className="text-xs text-muted-foreground">획득 조건: {title.unlockCondition}</div>
            )}
            <div className="flex gap-2">
              {isAssigned ? (
                <>
                  {!isActive && (
                    <Button variant="outline" size="sm" onClick={() => setAsActive(title)}>
                      활성화
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => removeTitle(title.id)}>
                    제거
                  </Button>
                </>
              ) : (
                <Button variant="default" size="sm" onClick={() => addTitle(title)}>
                  추가
                </Button>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned">할당된 칭호</TabsTrigger>
          <TabsTrigger value="available">사용 가능한 칭호</TabsTrigger>
        </TabsList>
        <TabsContent value="assigned" className="space-y-4">
          {userTitles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">할당된 칭호가 없습니다.</div>
          ) : (
            <div className="space-y-2">{userTitles.map((title) => renderTitle(title, true))}</div>
          )}
        </TabsContent>
        <TabsContent value="available" className="space-y-4">
          {unassignedTitles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">모든 칭호가 이미 할당되었습니다.</div>
          ) : (
            <div className="space-y-2">{unassignedTitles.map((title) => renderTitle(title, false))}</div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onSave(user.titles, user.activeTitle)}>
          취소
        </Button>
        <Button onClick={handleSave}>변경사항 저장</Button>
      </div>
    </div>
  )
}
