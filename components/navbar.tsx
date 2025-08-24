"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Shield,
  Menu,
  LogOut,
  Terminal,
  Trophy,
  Code,
  Settings,
  Home,
  X,
  Search,
  Clock,
  ChevronDown,
  Zap,
  Users,
  BookOpen,
  Award,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { SearchModal } from "./search-modal"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pathname = usePathname()
  const { user, userProfile, signOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 키보드 단축키 (Ctrl+K 또는 Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      // ESC 키로 드롭다운 닫기
      if (e.key === "Escape") {
        setActiveDropdown(null)
        setHoveredItem(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 드롭다운 메뉴 제어 함수들
  const handleMouseEnter = (itemTitle: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
    }
    setHoveredItem(itemTitle)
    setActiveDropdown(itemTitle)
  }

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null)
      setHoveredItem(null)
    }, 150) // 150ms 지연으로 부드러운 전환
  }

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
    }
  }

  const handleDropdownMouseLeave = () => {
    setActiveDropdown(null)
    setHoveredItem(null)
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const navItems = [
    {
      title: "워게임",
      href: "/wargame",
      icon: Terminal,
      description: "실전 해킹 시뮬레이션",
      gradient: "from-green-400 to-emerald-600",
      items: [
        { title: "모든 문제", href: "/wargame", description: "워게임 문제 목록" },
        { title: "내 풀이", href: "/mypage", description: "해결한 문제 확인" },
        { title: "랭킹", href: "/ranking", description: "워게임 랭킹" },
        { title: "문제 제안", href: "/contact", description: "새로운 문제 제안" },
      ],
    },
    {
      title: "CTF",
      href: "/ctf",
      icon: Shield,
      description: "경쟁형 해킹 대회",
      gradient: "from-blue-400 to-cyan-600",
      items: [
        { title: "진행중인 대회", href: "/ctf", description: "현재 참가 가능한 CTF" },
        { title: "예약하기", href: "/ctf/reserve", description: "CTF 대회 예약" },
        { title: "랭킹", href: "/ranking", description: "CTF 랭킹" },
        { title: "내 참가 기록", href: "/mypage", description: "참가한 CTF 기록" },
      ],
    },
    {
      title: "커뮤니티",
      href: "/community",
      icon: Users,
      description: "지식 공유 플랫폼",
      gradient: "from-purple-400 to-pink-600",
      items: [
        { title: "전체 게시글", href: "/community", description: "모든 커뮤니티 게시글" },
        { title: "내 게시글", href: "/mypage", description: "작성한 게시글 확인" },
        { title: "인기 게시글", href: "/community", description: "인기있는 게시글" },
        { title: "글 작성하기", href: "/community", description: "새 게시글 작성" },
      ],
    },
    {
      title: "커리큘럼",
      href: "/curriculum",
      icon: BookOpen,
      description: "체계적인 학습 과정",
      gradient: "from-orange-400 to-red-600",
      items: [
        { title: "전체 커리큘럼", href: "/curriculum", description: "모든 학습 과정" },
        { title: "내 진도", href: "/mypage", description: "학습 진행 상황" },
        { title: "추천 과정", href: "/curriculum", description: "맞춤형 학습 과정" },
        { title: "수료증", href: "/mypage", description: "완료한 과정 확인" },
      ],
    },
  ]

  const quickLinks = [
    { title: "연혁", href: "/history", icon: Clock },
    { title: "랭킹", href: "/ranking", icon: Trophy },
    { title: "제작자", href: "/creators", icon: Code },
  ]

  const isAdmin = userProfile?.role === "admin"

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full backdrop-blur-xl transition-all duration-500",
          isScrolled ? "bg-background/80 border-b border-border/50 shadow-2xl shadow-primary/5" : "bg-transparent",
        )}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3 group" onClick={closeMenu}>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-primary/90 to-primary/70 shadow-2xl shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40 group-hover:scale-105">
                <Shield className="h-6 w-6 text-primary-foreground transition-transform duration-300 group-hover:rotate-12" />
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40"></div>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                NT-SecurityChallenges
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.title}
                className="relative group"
                onMouseEnter={() => handleMouseEnter(item.title)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                    pathname.startsWith(item.href)
                      ? "text-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "text-foreground/70 hover:text-foreground hover:bg-accent/50",
                    hoveredItem === item.title && "text-foreground bg-accent/50",
                  )}
                >
                  <item.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>{item.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-300",
                      activeDropdown === item.title ? "rotate-180" : "group-hover:rotate-180",
                    )}
                  />

                  {/* Hover effect background */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                      hoveredItem === item.title && "opacity-100",
                      `bg-gradient-to-r ${item.gradient} bg-opacity-10`,
                    )}
                  />
                </Link>

                {/* Mega Menu Dropdown */}
                <div
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 transition-all duration-300 transform",
                    activeDropdown === item.title
                      ? "opacity-100 visible translate-y-0 pointer-events-auto"
                      : "opacity-0 invisible translate-y-2 pointer-events-none",
                  )}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <div className="bg-background/95 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 p-6 relative overflow-hidden">
                    {/* Background gradient */}
                    <div className={cn("absolute inset-0 opacity-5", `bg-gradient-to-br ${item.gradient}`)} />

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className={cn("p-2 rounded-xl bg-gradient-to-r", item.gradient)}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-1 relative z-10">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group/item"
                          onClick={() => {
                            setActiveDropdown(null)
                            setHoveredItem(null)
                          }}
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-2 transition-all duration-200 group-hover/item:scale-150",
                              `bg-gradient-to-r ${item.gradient}`,
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors duration-200">
                              {subItem.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{subItem.description}</div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-border/30 relative z-10">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 bg-gradient-to-r text-white shadow-lg hover:shadow-xl hover:scale-105",
                          item.gradient,
                        )}
                        onClick={() => {
                          setActiveDropdown(null)
                          setHoveredItem(null)
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        모든 {item.title} 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Links */}
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-border/30">
              {quickLinks.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 group",
                    pathname === item.href
                      ? "text-primary bg-primary/10"
                      : "text-foreground/60 hover:text-foreground hover:bg-accent/30",
                  )}
                >
                  <item.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="hidden xl:inline">{item.title}</span>
                </Link>
              ))}
            </div>

            {/* Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="ml-4 h-10 w-10 p-0 bg-background/50 border-border/50 hover:bg-accent/50 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* User Menu */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-12 w-12 rounded-2xl p-0 overflow-hidden border-2 border-border/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Image
                      src={user.photoURL || "/placeholder.svg"}
                      alt={user.displayName || "사용자"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: "center" }}
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-72 bg-background/95 backdrop-blur-2xl border-border/50 shadow-2xl"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Image
                          src={user.photoURL || "/placeholder.svg"}
                          alt={user.displayName || "사용자"}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-xl object-cover border-2 border-primary/20"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-none">{user.displayName || "사용자"}</p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">{user.email}</p>
                        {userProfile?.role === "admin" && (
                          <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                            <Award className="h-3 w-3" />
                            관리자
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-200">
                    <Home className="mr-3 h-4 w-4" />
                    <Link href="/mypage" className="flex-1">
                      마이페이지
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-200">
                    <Settings className="mr-3 h-4 w-4" />
                    <Link href="/profile" className="flex-1">
                      프로필 설정
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-200">
                      <Zap className="mr-3 h-4 w-4 text-purple-500" />
                      <Link href="/admin" className="flex-1">
                        관리자 대시보드
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="p-3 cursor-pointer hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-colors duration-200"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-10 px-6 text-sm font-medium hover:bg-accent/50 transition-all duration-300"
                  >
                    로그인
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="rounded-xl h-10 px-6 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    회원가입
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-xl hover:bg-accent/50 transition-all duration-300"
            >
              <Search className="h-5 w-5" />
            </Button>
            <button
              className="flex items-center justify-center p-2 rounded-xl hover:bg-accent/50 transition-all duration-300"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="fixed inset-0 top-20 z-50 bg-background/95 backdrop-blur-2xl lg:hidden">
            <nav className="container mx-auto flex flex-col p-4 h-full overflow-y-auto">
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <div key={item.title} className="space-y-2">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 text-base font-semibold py-4 px-5 rounded-2xl border border-border/20 transition-all duration-300 relative overflow-hidden group",
                        pathname.startsWith(item.href)
                          ? "text-primary bg-primary/10 border-primary/30 shadow-lg"
                          : "text-foreground/80 hover:text-foreground hover:bg-accent/50 hover:border-border/40",
                      )}
                      onClick={closeMenu}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-xl bg-gradient-to-r transition-transform duration-300 group-hover:scale-110",
                          item.gradient,
                        )}
                      >
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div>{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Link>

                    {/* Mobile Submenu */}
                    <div className="ml-4 space-y-1">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="flex items-center gap-3 py-2 px-4 rounded-xl text-sm text-foreground/70 hover:text-foreground hover:bg-accent/30 transition-all duration-200"
                          onClick={closeMenu}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full", `bg-gradient-to-r ${item.gradient}`)} />
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Quick Links Mobile */}
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="grid grid-cols-3 gap-2">
                    {quickLinks.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/20 transition-all duration-300",
                          pathname === item.href
                            ? "text-primary bg-primary/10 border-primary/30"
                            : "text-foreground/70 hover:text-foreground hover:bg-accent/30",
                        )}
                        onClick={closeMenu}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile User Section */}
              <div className="mt-6 pt-6 border-t border-border/30">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-accent/30 to-accent/10 border border-border/20">
                      <div className="relative">
                        <Image
                          src={user.photoURL || "/placeholder.svg"}
                          alt={user.displayName || "사용자"}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-2xl object-cover border-2 border-primary/20"
                          style={{ objectPosition: "center" }}
                          priority
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{user.displayName || "사용자"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {userProfile?.role === "admin" && (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                            <Award className="h-3 w-3" />
                            관리자
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <Link href="/mypage" onClick={closeMenu}>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 rounded-xl bg-transparent border-border/30 hover:bg-accent/30 transition-all duration-300"
                        >
                          <Home className="mr-3 h-4 w-4" />
                          마이페이지
                        </Button>
                      </Link>
                      <Link href="/profile" onClick={closeMenu}>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 rounded-xl bg-transparent border-border/30 hover:bg-accent/30 transition-all duration-300"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          프로필 설정
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={closeMenu}>
                          <Button
                            variant="outline"
                            className="w-full justify-start h-12 rounded-xl bg-transparent border-border/30 hover:bg-accent/30 transition-all duration-300"
                          >
                            <Zap className="mr-3 h-4 w-4 text-purple-500" />
                            관리자 대시보드
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30 transition-all duration-300"
                        onClick={() => {
                          signOut()
                          closeMenu()
                        }}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        로그아웃
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/login" onClick={closeMenu}>
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl bg-transparent border-border/30 hover:bg-accent/30 transition-all duration-300"
                      >
                        로그인
                      </Button>
                    </Link>
                    <Link href="/register" onClick={closeMenu}>
                      <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300">
                        회원가입
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 검색 모달 */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
