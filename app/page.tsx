"use client"

import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Code,
  Trophy,
  Users,
  ChevronRight,
  Zap,
  Lock,
  Server,
  Database,
  ArrowRight,
  Terminal,
  Cpu,
  Sparkles,
  Rocket,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"

// 파일 상단에 다음 import 추가:
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { Banner } from "@/lib/banner-types"
import { BannerSlider } from "@/components/banner-slider"

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const [banners, setBanners] = useState<Banner[]>([])
  const { user } = useAuth()

  // Mouse position tracking for interactive elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Scroll tracking for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 배너 데이터 가져오기
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannersRef = collection(db, "banners")
        const bannersQuery = query(bannersRef, where("isActive", "==", true), orderBy("order", "asc"))
        const bannersSnapshot = await getDocs(bannersQuery)

        const bannersData: Banner[] = []
        bannersSnapshot.forEach((doc) => {
          const data = doc.data()
          bannersData.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            linkUrl: data.linkUrl,
            isActive: data.isActive || false,
            order: data.order || 0,
            backgroundColor: data.backgroundColor || "#3B82F6",
            textColor: data.textColor || "#FFFFFF",
            buttonText: data.buttonText,
            buttonColor: data.buttonColor,
            createdAt: data.createdAt || { toDate: () => new Date() },
            updatedAt: data.updatedAt || { toDate: () => new Date() },
            createdBy: data.createdBy || "",
            startDate: data.startDate,
            endDate: data.endDate,
          })
        })
        setBanners(bannersData)
      } catch (error) {
        console.error("Error fetching banners:", error)
      }
    }

    fetchBanners()
  }, [])

  // Calculate parallax effect for hero elements
  const calculateParallax = (factor: number) => {
    return -scrollY * factor
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* 배너 섹션 */}
        {banners.length > 0 && (
          <section className="py-6">
            <div className="container mx-auto px-4 md:px-6">
              <BannerSlider banners={banners} />
            </div>
          </section>
        )}

        {/* Hero Section - Ultra Premium Version */}
        <section
          ref={heroRef}
          className="relative min-h-screen overflow-hidden py-20 flex items-center"
          style={{ perspective: "1000px" }}
        >
          {/* Dynamic 3D grid background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.3)), url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='none'/%3E%3Cpath d='M0 0h1v1H0z' fill='rgba(255, 255, 255, 0.03)'/%3E%3Cpath d='M99 0h1v1h-1z' fill='rgba(255, 255, 255, 0.03)'/%3E%3Cpath d='M0 99h1v1h-1z' fill='rgba(255, 255, 255, 0.03)'/%3E%3Cpath d='M99 99h1v1h-1z' fill='rgba(255, 255, 255, 0.03)'/%3E%3Cpath d='M10 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M20 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M30 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M40 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M50 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M60 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M70 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M80 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M90 0h1v100h-1z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 10h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 20h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 30h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 40h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 50h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 60h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 70h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 80h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3Cpath d='M0 90h100v1H0z' fill='rgba(255, 255, 255, 0.01)'/%3E%3C/svg%3E")`,
              backgroundSize: "100px 100px",
              transform: `translateZ(${calculateParallax(0.1)}px) rotateX(${scrollY * 0.01}deg)`,
            }}
          />

          {/* Animated gradient orbs */}
          <div
            className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl"
            style={{
              transform: `translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px, 0)`,
              animation: "pulse 12s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-primary/10 to-cyan-500/10 blur-3xl"
            style={{
              transform: `translate3d(${-mousePosition.x * 0.01}px, ${-mousePosition.y * 0.01}px, 0)`,
              animation: "pulse 15s ease-in-out infinite alternate-reverse",
            }}
          />

          {/* Glowing particles */}
          <div className="absolute inset-0 z-0">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 3 + 1}px`,
                  height: `${Math.random() * 3 + 1}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.4 + 0.1,
                  animation: `float ${Math.random() * 10 + 15}s linear infinite`,
                  animationDelay: `${Math.random() * 10}s`,
                }}
              />
            ))}
          </div>

          {/* Hexagon grid pattern */}
          <div className="absolute inset-0 z-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="hexagons"
                  width="50"
                  height="43.4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="scale(2)"
                >
                  <polygon
                    points="25,0 50,14.4 50,43.3 25,57.7 0,43.3 0,14.4"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hexagons)" />
            </svg>
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <motion.div
                className="flex flex-col justify-center space-y-8"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Badge className="w-fit group relative overflow-hidden" variant="outline">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-700"></div>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  <span className="relative z-10">덕영고등학교 정보보안소프트웨어과 제작</span>
                </Badge>

                <div className="space-y-4">
                  <motion.h1
                    className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                      NT-Security
                    </span>
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-primary">
                      Challenges
                    </span>
                  </motion.h1>
                  <motion.p
                    className="max-w-[600px] text-xl text-muted-foreground"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    최고의 보안 전문가가 되기 위한 여정을 시작하세요. 실전 보안 도전과 함께 성장하는 플랫폼입니다.
                  </motion.p>
                </div>

                <motion.div
                  className="flex flex-col gap-4 sm:flex-row"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  <Link href="/wargame">
                    <Button
                      size="lg"
                      className="group relative h-14 overflow-hidden rounded-full bg-gradient-to-r from-primary to-blue-600 px-8 text-primary-foreground shadow-xl transition-all duration-300 hover:shadow-primary/30"
                    >
                      <span className="relative z-10 flex items-center gap-2 font-medium">
                        도전 시작하기
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      <span className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                    </Button>
                  </Link>
                  {!user ? (
                    <Link href="/register">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 rounded-full border-primary/20 px-8 backdrop-blur-sm bg-background/30 hover:bg-primary/10"
                      >
                        회원가입
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/mypage">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 rounded-full border-primary/20 px-8 backdrop-blur-sm bg-background/30 hover:bg-primary/10"
                      >
                        마이페이지
                      </Button>
                    </Link>
                  )}
                </motion.div>
              </motion.div>

              <motion.div
                className="relative flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{
                  transform: `translate3d(${mousePosition.x * 0.01 - 10}px, ${mousePosition.y * 0.01 - 10}px, 0)`,
                }}
              >
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/30 to-blue-500/30 opacity-20 blur-xl"></div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 to-blue-500/20 opacity-10 animate-pulse"></div>

                <div className="relative aspect-square w-full max-w-[500px] overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 backdrop-blur-xl animate-float shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5"></div>

                  {/* Glowing border effect */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-blue-500/50 animate-rotate-gradient"></div>
                    <div className="absolute inset-[1px] rounded-2xl bg-black"></div>
                  </div>

                  <div className="relative h-full w-full rounded-xl bg-black/80 p-6 backdrop-blur-sm">
                    {/* Terminal-like header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="text-xs text-white/50 font-mono">NT-Security Terminal</div>
                      <div className="h-3 w-3"></div>
                    </div>

                    <div className="mt-12 space-y-6">
                      {/* Terminal-like typing effect */}
                      <div className="font-mono text-xs text-green-500 mb-4">
                        <div className="flex">
                          <span className="text-primary mr-2">$</span>
                          <span className="typing-effect">initializing security challenge platform...</span>
                        </div>
                        <div className="flex mt-1">
                          <span className="text-primary mr-2">$</span>
                          <span>
                            loading modules: [<span className="text-blue-400">web</span>,{" "}
                            <span className="text-blue-400">crypto</span>, <span className="text-blue-400">system</span>
                            ] ✓
                          </span>
                        </div>
                        <div className="flex mt-1">
                          <span className="text-primary mr-2">$</span>
                          <span>system ready</span>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-muted/20">
                        <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { icon: Lock, label: "웹 해킹", color: "from-red-500/20 to-red-600/20" },
                          { icon: Server, label: "시스템 해킹", color: "from-blue-500/20 to-blue-600/20" },
                          { icon: Database, label: "암호학", color: "from-green-500/20 to-green-600/20" },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="group flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-gradient-to-br from-primary/5 to-blue-500/5 p-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20 group-hover:from-primary/30 group-hover:to-blue-500/30 transition-all duration-300">
                              <item.icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="h-2 w-full rounded-full bg-muted/20">
                          <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/20">
                          <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-primary/5 to-blue-500/5 p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary to-blue-500">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">실시간 도전</span>
                        </div>
                        <span className="text-sm font-bold text-primary animate-pulse">진행 중</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating security icons */}
                <div
                  className="absolute -top-10 -right-10 h-20 w-20 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 p-1 backdrop-blur-sm animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-black/50">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div
                  className="absolute -bottom-8 -left-8 h-16 w-16 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 p-1 backdrop-blur-sm animate-float"
                  style={{ animationDelay: "2s" }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-black/50">
                    <Code className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-2">스크롤</span>
              <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce mt-2"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background"></div>

          {/* Hexagon pattern background */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="hexagons-features"
                  width="50"
                  height="43.4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="scale(5)"
                >
                  <polygon
                    points="25,0 50,14.4 50,43.3 25,57.7 0,43.3 0,14.4"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hexagons-features)" />
            </svg>
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto mb-16 max-w-[800px] text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-yellow-400" />
                최고의 보안 도전 플랫폼
              </Badge>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white">
                다양한 보안 도전 카테고리
              </h2>
              <p className="text-xl text-muted-foreground">
                NT-SecurityChallenges에서 제공하는 다양한 보안 도전 카테고리를 통해 실력을 향상시키세요
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Terminal,
                  title: "워게임",
                  description: "워게임을 통해 해킹 기술을 연습하세요",
                  color: "from-blue-600/80 to-blue-400/80",
                  delay: 0,
                  href: "/wargame",
                },
                {
                  icon: Shield,
                  title: "CTF",
                  description: "다양한 CTF 문제를 풀며 보안 지식을 쌓고 실력을 검증하세요",
                  color: "from-purple-600/80 to-purple-400/80",
                  delay: 0.1,
                  href: "/ctf",
                },
                {
                  icon: Users,
                  title: "커뮤니티",
                  description: "다른 사용자들과 지식을 공유하고 함께 성장하세요",
                  color: "from-green-600/80 to-green-400/80",
                  delay: 0.2,
                  href: "/community",
                },
                {
                  icon: Trophy,
                  title: "랭킹",
                  description: "자신의 실력을 다른 참가자들과 비교하고 순위를 확인하세요",
                  color: "from-amber-600/80 to-amber-400/80",
                  delay: 0.3,
                  href: "/ranking",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: item.delay }}
                >
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                    <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md"></div>
                    </div>
                    <div className="relative h-full rounded-xl bg-black/80 p-6 backdrop-blur-sm">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-primary/20 to-blue-500/20 shadow-inner group-hover:from-primary/30 group-hover:to-blue-500/30 transition-all duration-300">
                        <item.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="mb-2 text-xl font-bold group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="mb-4 text-muted-foreground">{item.description}</p>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                      >
                        자세히 보기
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Challenges Section */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/5 to-background"></div>

          {/* Animated background elements */}
          <div
            className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-primary/5 to-blue-500/5 blur-3xl animate-pulse"
            style={{ animationDuration: "20s" }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-purple-500/5 to-blue-500/5 blur-3xl animate-pulse"
            style={{ animationDuration: "25s", animationDelay: "1s" }}
          ></div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto mb-16 max-w-[800px] text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Badge className="mb-4" variant="outline">
                <Rocket className="h-3.5 w-3.5 mr-1 text-blue-400" />
                최신 도전 과제
              </Badge>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-white">
                최신 보안 도전 과제
              </h2>
              <p className="text-xl text-muted-foreground">새롭게 추가된 보안 도전 과제를 확인하고 도전하세요</p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "웹 해킹",
                  category: "웹 해킹",
                  difficulty: "중급",
                  points: 300,
                  icon: Code,
                  tags: ["XSS", "CSRF", "SQL Injection"],
                  color: "from-red-600/80 to-red-400/80",
                  delay: 0,
                  href: "/wargame",
                },
                {
                  title: "시스템 해킹",
                  category: "시스템 해킹",
                  difficulty: "초급",
                  points: 200,
                  icon: Cpu,
                  tags: ["Assembly", "Debugging", "Binary Analysis"],
                  color: "from-blue-600/80 to-blue-400/80",
                  delay: 0.1,
                  href: "/wargame",
                },
                {
                  title: "암호학",
                  category: "암호학",
                  difficulty: "고급",
                  points: 500,
                  icon: Lock,
                  tags: ["RSA", "AES", "Cryptanalysis"],
                  color: "from-green-600/80 to-green-400/80",
                  delay: 0.2,
                  href: "/wargame",
                },
              ].map((challenge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: challenge.delay }}
                >
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                    <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md"></div>
                    </div>
                    <div className="relative h-full rounded-xl bg-black/80 p-6 backdrop-blur-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary/20 to-blue-500/20 group-hover:from-primary/30 group-hover:to-blue-500/30 transition-all duration-300">
                          <challenge.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-white/10 bg-black/50 backdrop-blur-sm">
                            {challenge.difficulty}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-gradient-to-r from-primary/20 to-blue-500/20 text-white border-0"
                          >
                            {challenge.points} 포인트
                          </Badge>
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-bold group-hover:text-primary transition-colors">
                        {challenge.title}
                      </h3>
                      <p className="mb-4 text-sm text-muted-foreground">{challenge.category}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-r from-primary/20 to-blue-500/20"
                            >
                              <span className="text-xs font-bold">{i + 1}</span>
                            </div>
                          ))}
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-r from-primary/20 to-blue-500/20">
                            <span className="text-xs font-bold">+5</span>
                          </div>
                        </div>
                        <Link
                          href={challenge.href}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                        >
                          도전하기
                          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-12 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/wargame">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/10 bg-black/30 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/20 px-8"
                >
                  모든 도전 과제 보기
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative overflow-hidden rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-20"></div>
                <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary-foreground/10 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary-foreground/10 blur-3xl"></div>

                <div className="relative z-10 grid gap-6 p-8 md:grid-cols-2 md:gap-12 md:p-12 lg:p-16">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
                      지금 바로 시작하세요
                    </h2>
                    <p className="text-xl text-primary-foreground/90">
                      NT-SecurityChallenges에 가입하고 다양한 보안 도전에 참여하세요. 실력을 향상시키고 보안 전문가로
                      성장할 수 있는 기회입니다.
                    </p>
                    <ul className="space-y-2">
                      {[
                        "워게임으로 실력 향상",
                        "다른 사용자와 지식 공유",
                        "다양한 해킹 기법 학습",
                        "개인 맞춤형 학습 경로",
                      ].map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-primary-foreground/90">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20">
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4">
                      <Link href="/register">
                        <Button
                          size="lg"
                          className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg hover:shadow-white/10"
                        >
                          무료로 시작하기
                          <ArrowRight className="ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  )
}
