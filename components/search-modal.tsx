"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, User, Terminal, Trophy, ChevronRight, Loader2, Clock, X } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { cn } from "@/lib/utils"

interface SearchResult {
  type: "user" | "wargame" | "ctf" | "curriculum"
  id: string
  title: string
  subtitle: string
  photoURL?: string
  href: string
  status?: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // 최근 검색어 로드
  useEffect(() => {
    const saved = localStorage.getItem("recent-searches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // 최근 검색어 저장
  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("recent-searches", JSON.stringify(updated))
  }

  // 검색 함수
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results: SearchResult[] = []
      const searchTerm = query.toLowerCase()

      // 사용자 검색 (displayName과 username 모두 검색)
      try {
        const usersRef = collection(db, "users")
        const usersSnapshot = await getDocs(usersRef)

        usersSnapshot.forEach((doc) => {
          const data = doc.data()
          const displayName = (data.displayName || "").toLowerCase()
          const username = (data.username || "").toLowerCase()
          const email = (data.email || "").toLowerCase()

          if (displayName.includes(searchTerm) || username.includes(searchTerm) || email.includes(searchTerm)) {
            results.push({
              type: "user",
              id: doc.id,
              title: data.displayName || data.username || "사용자",
              subtitle: `레벨 ${data.level || 1} • ${data.wargameScore || 0}점`,
              photoURL: data.photoURL,
              href: `/user/${doc.id}`,
            })
          }
        })
      } catch (error) {
        console.error("User search error:", error)
      }

      // 워게임 문제 검색
      try {
        const wargameRef = collection(db, "wargame_challenges")
        const wargameSnapshot = await getDocs(wargameRef)

        wargameSnapshot.forEach((doc) => {
          const data = doc.data()
          const title = (data.title || "").toLowerCase()
          const description = (data.description || "").toLowerCase()
          const category = (data.category || "").toLowerCase()

          if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            results.push({
              type: "wargame",
              id: doc.id,
              title: data.title,
              subtitle: `${data.category} • 레벨 ${data.level} • ${data.points}점`,
              href: `/wargame/${doc.id}`,
            })
          }
        })
      } catch (error) {
        console.error("Wargame search error:", error)
      }

      // CTF 대회 검색
      try {
        const ctfRef = collection(db, "ctf_contests")
        const ctfSnapshot = await getDocs(ctfRef)

        ctfSnapshot.forEach((doc) => {
          const data = doc.data()
          const title = (data.title || "").toLowerCase()
          const description = (data.description || "").toLowerCase()

          if (title.includes(searchTerm) || description.includes(searchTerm)) {
            const now = new Date()
            const startTime = data.startTime?.toDate()
            const endTime = data.endTime?.toDate()
            let status = "예정됨"
            if (startTime && endTime) {
              if (now >= startTime && now <= endTime) status = "진행중"
              else if (now > endTime) status = "종료됨"
            }

            results.push({
              type: "ctf",
              id: doc.id,
              title: data.title,
              subtitle: `${status} • ${data.participants?.length || 0}명 참가`,
              href: `/ctf/${doc.id}`,
              status,
            })
          }
        })
      } catch (error) {
        console.error("CTF search error:", error)
      }

      // 커리큘럼 검색
      try {
        const curriculumRef = collection(db, "curriculums")
        const curriculumSnapshot = await getDocs(curriculumRef)

        curriculumSnapshot.forEach((doc) => {
          const data = doc.data()
          const title = (data.title || "").toLowerCase()
          const description = (data.description || "").toLowerCase()
          const category = (data.category || "").toLowerCase()

          if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            results.push({
              type: "curriculum",
              id: doc.id,
              title: data.title,
              subtitle: `${data.category} • ${data.difficulty} • ${data.steps?.length || 0}단계`,
              href: `/curriculum/${doc.id}`,
            })
          }
        })
      } catch (error) {
        console.error("Curriculum search error:", error)
      }

      // 결과를 타입별로 정렬
      const sortedResults = results.sort((a, b) => {
        const typeOrder = { user: 0, wargame: 1, ctf: 2, curriculum: 3 }
        return typeOrder[a.type] - typeOrder[b.type]
      })

      setSearchResults(sortedResults.slice(0, 20)) // 최대 20개 결과
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // 디바운스된 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 검색 결과 클릭 핸들러
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(searchQuery)
    router.push(result.href)
    onClose()
    setSearchQuery("")
  }

  // 최근 검색어 클릭
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query)
  }

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      handleResultClick(searchResults[selectedIndex])
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  // 모달이 열릴 때 검색창에 포커스
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const input = document.getElementById("search-input")
        input?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-5 w-5 text-blue-500" />
      case "wargame":
        return <Terminal className="h-5 w-5 text-green-500" />
      case "ctf":
        return <Trophy className="h-5 w-5 text-purple-500" />
      case "curriculum":
        return <Search className="h-5 w-5 text-orange-500" />
      default:
        return <Search className="h-5 w-5" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case "user":
        return "사용자"
      case "wargame":
        return "워게임"
      case "ctf":
        return "CTF"
      case "curriculum":
        return "커리큘럼"
      default:
        return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            통합 검색
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder="사용자, 워게임, CTF, 커리큘럼 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10 h-12 text-base"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {searchQuery && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {!searchQuery && recentSearches.length > 0 && (
            <div className="p-6 pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                최근 검색
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecentSearchClick(query)}
                    className="h-8 text-xs"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && (
            <div className="overflow-y-auto max-h-96">
              {searchResults.length === 0 && !isSearching ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">검색 결과가 없습니다</p>
                  <p className="text-sm">다른 키워드로 검색해보세요</p>
                </div>
              ) : (
                <div className="p-4">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200 group",
                        selectedIndex === index ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center overflow-hidden">
                        {result.type === "user" && result.photoURL ? (
                          <img
                            src={result.photoURL || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getTypeIcon(result.type)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{result.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {getTypeName(result.type)}
                          </Badge>
                          {result.status === "진행중" && (
                            <Badge variant="default" className="text-xs bg-green-500">
                              LIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>↑↓ 이동</span>
              <span>Enter 선택</span>
              <span>Esc 닫기</span>
            </div>
            <span>{searchResults.length}개 결과</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
