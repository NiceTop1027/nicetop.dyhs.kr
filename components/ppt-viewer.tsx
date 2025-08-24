"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  List,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Grid,
  Printer,
  AlertCircle,
} from "lucide-react"
import type { Slide } from "@/lib/curriculum-types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface PPTViewerProps {
  slides: Slide[]
  title: string
}

export function PPTViewer({ slides, title }: PPTViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(5) // 초 단위
  const [zoomLevel, setZoomLevel] = useState(1)
  // const [darkMode, setDarkMode] = useState(false)
  const darkMode = false // 항상 라이트모드로 설정
  const [showGrid, setShowGrid] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<NodeJS.Timeout | null>(null)
  const [renderError, setRenderError] = useState(false)

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else if (isPlaying) {
      // 자동 재생 중이고 마지막 슬라이드면 처음으로 돌아감
      setCurrentSlide(0)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const zoomIn = () => {
    if (zoomLevel < 2) {
      setZoomLevel(zoomLevel + 0.1)
    }
  }

  const zoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(zoomLevel - 0.1)
    }
  }

  const resetZoom = () => {
    setZoomLevel(1)
  }

  const downloadAsPDF = async () => {
    if (!slides || slides.length === 0) return

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
    })

    // 현재 슬라이드만 다운로드
    if (slideRef.current) {
      try {
        const canvas = await html2canvas(slideRef.current, {
          scale: 2,
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
        })
        const imgData = canvas.toDataURL("image/jpeg", 1.0)
        pdf.addImage(imgData, "JPEG", 10, 10, 190, 130)
        pdf.save(`${title}-slide-${currentSlide + 1}.pdf`)
      } catch (error) {
        console.error("PDF 생성 오류:", error)
      }
    }
  }

  const printSlides = () => {
    window.print()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      nextSlide()
    } else if (event.key === "ArrowLeft") {
      prevSlide()
    } else if (event.key === "Escape") {
      setIsFullscreen(false)
    } else if (event.key === " ") {
      togglePlayback()
    }
  }

  // 자동 재생 효과
  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        nextSlide()
      }, playbackSpeed * 1000)
    } else if (playbackRef.current) {
      clearInterval(playbackRef.current)
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
      }
    }
  }, [isPlaying, currentSlide, playbackSpeed])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)

    // 풀스크린 변경 감지
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [currentSlide])

  if (!slides || slides.length === 0) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">슬라이드가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full transition-all duration-300",
          isFullscreen ? "fixed inset-0 z-50" : "h-[500px] rounded-lg border",
          darkMode ? "bg-gray-900" : "bg-background",
        )}
      >
        {/* 슬라이드 컨트롤 */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/30 to-transparent",
            isFullscreen ? "p-6" : "",
          )}
        >
          <div className={cn("drop-shadow-md", darkMode ? "text-white" : "text-gray-800")}>
            <h3 className={cn("font-bold", isFullscreen ? "text-xl" : "text-base")}>{title}</h3>
            <p className="text-sm">
              {currentSlide + 1} / {slides.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hover:bg-white/20", darkMode ? "text-white" : "text-gray-800")}
                  onClick={() => setShowThumbnails(!showThumbnails)}
                >
                  <List className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>슬라이드 목록</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hover:bg-white/20", darkMode ? "text-white" : "text-gray-800")}
                  onClick={togglePlayback}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? "일시정지" : "자동 재생"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hover:bg-white/20", darkMode ? "text-white" : "text-gray-800")}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? "전체화면 종료" : "전체화면"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 슬라이드 내용 */}
        <div
          className={cn(
            "relative w-full h-full overflow-hidden",
            showGrid ? "bg-grid-pattern" : "",
            darkMode ? "text-white" : "text-gray-800",
          )}
        >
          {renderError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">슬라이드를 표시할 수 없습니다</h3>
              <p className="text-center mb-4">슬라이드 렌더링 중 오류가 발생했습니다.</p>
              <Button onClick={() => setRenderError(false)}>다시 시도</Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white rounded-lg"
                style={{ transform: `scale(${zoomLevel})` }}
                ref={slideRef}
                onError={() => setRenderError(true)}
              >
                {(() => {
                  try {
                    return (
                      <>
                        {slides[currentSlide].imageUrl && (
                          <div className="w-full max-w-3xl mb-6 bg-white p-2 rounded-lg shadow-sm">
                            <img
                              src={slides[currentSlide].imageUrl || "/placeholder.svg"}
                              alt={slides[currentSlide].title || "슬라이드 이미지"}
                              className="w-full h-auto max-h-[50vh] object-contain rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            "w-full max-w-3xl text-center bg-white p-4 rounded-md shadow-sm",
                            isFullscreen ? "max-w-4xl" : "",
                          )}
                        >
                          {/* 제목이 있을 때만 표시 */}
                          {slides[currentSlide].title && (
                            <h2 className={cn("font-bold mb-4 text-gray-900", isFullscreen ? "text-3xl" : "text-2xl")}>
                              {slides[currentSlide].title}
                            </h2>
                          )}
                          <div
                            className={cn("prose mx-auto text-gray-800", isFullscreen ? "prose-lg" : "prose-sm")}
                            dangerouslySetInnerHTML={{ __html: slides[currentSlide].content || "" }}
                          />
                        </div>
                      </>
                    )
                  } catch (error) {
                    setRenderError(true)
                    return (
                      <div className="text-center">
                        <p>슬라이드를 표시할 수 없습니다.</p>
                      </div>
                    )
                  }
                })()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 flex items-center justify-between p-4",
            isFullscreen ? "p-6" : "",
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size={isFullscreen ? "default" : "sm"}
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={cn(
                "rounded-full bg-background/80 backdrop-blur-sm",
                isFullscreen ? "h-12 w-12" : "",
                darkMode ? "text-white border-gray-700" : "",
              )}
            >
              <ChevronLeft className={isFullscreen ? "h-6 w-6" : "h-4 w-4"} />
            </Button>

            <Button
              variant="outline"
              size={isFullscreen ? "default" : "sm"}
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1 && !isPlaying}
              className={cn(
                "rounded-full bg-background/80 backdrop-blur-sm",
                isFullscreen ? "h-12 w-12" : "",
                darkMode ? "text-white border-gray-700" : "",
              )}
            >
              <ChevronRight className={isFullscreen ? "h-6 w-6" : "h-4 w-4"} />
            </Button>
          </div>

          {/* 추가 컨트롤 */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={zoomIn}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>확대</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={zoomOut}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>축소</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetZoom}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>원래 크기로</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowGrid(!showGrid)}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      showGrid ? "bg-primary/20" : "",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>그리드 표시</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={downloadAsPDF}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>PDF로 저장</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={printSlides}
                    className={cn(
                      "rounded-full bg-background/80 backdrop-blur-sm",
                      darkMode ? "text-white border-gray-700" : "",
                    )}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>인쇄</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* 다크모드 토글 UI 요소 제거 */}
          </div>
        </div>

        {/* 썸네일 사이드바 */}
        {showThumbnails && (
          <div
            className={cn(
              "absolute top-0 right-0 bottom-0 w-64 backdrop-blur-sm border-l overflow-y-auto",
              isFullscreen ? "pt-20" : "pt-16",
              darkMode ? "bg-gray-900/90 border-gray-700 text-white" : "bg-background/90 text-gray-800",
            )}
          >
            <div className="p-4">
              <h3 className="font-medium mb-2">슬라이드 목록</h3>
              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlide(index)}
                    className={cn(
                      "p-2 rounded-md cursor-pointer transition-colors",
                      currentSlide === index
                        ? darkMode
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-primary/10 border border-primary/30"
                        : darkMode
                          ? "hover:bg-gray-800"
                          : "hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                          darkMode ? "bg-gray-800" : "bg-muted",
                        )}
                      >
                        {index + 1}
                      </div>
                      <p className="text-sm font-medium truncate">{slide.title || `슬라이드 ${index + 1}`}</p>
                    </div>
                    {slide.imageUrl && (
                      <div className="mt-2 h-12 overflow-hidden rounded">
                        <img
                          src={slide.imageUrl || "/placeholder.svg"}
                          alt={slide.title || `슬라이드 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isPlaying && (
                <div className="mt-4 p-3 rounded-md border border-primary/20 bg-primary/10">
                  <h4 className="text-sm font-medium mb-2">자동 재생 설정</h4>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor="playback-speed" className="text-xs">
                        재생 속도:
                      </Label>
                      <Select
                        value={playbackSpeed.toString()}
                        onValueChange={(value) => setPlaybackSpeed(Number.parseInt(value))}
                      >
                        <SelectTrigger id="playback-speed" className="h-8">
                          <SelectValue placeholder="재생 속도" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2초</SelectItem>
                          <SelectItem value="3">3초</SelectItem>
                          <SelectItem value="5">5초</SelectItem>
                          <SelectItem value="10">10초</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
