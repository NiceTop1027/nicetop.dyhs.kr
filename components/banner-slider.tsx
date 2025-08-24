"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Banner } from "@/lib/banner-types"

interface BannerSliderProps {
  banners: Banner[]
}

export function BannerSlider({ banners }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  // 자동 슬라이드
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [banners.length, isPaused])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  if (banners.length === 0) return null

  const currentBanner = banners[currentIndex]

  return (
    <div
      className="relative w-full h-48 rounded-lg overflow-hidden mb-8 shadow-lg"
      ref={sliderRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="w-full h-full flex items-center justify-center relative transition-all duration-500 ease-in-out"
        style={{
          backgroundColor: currentBanner.backgroundColor,
          color: currentBanner.textColor,
        }}
      >
        {/* 배경 이미지 */}
        {currentBanner.imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${currentBanner.imageUrl})` }}
          />
        )}

        {/* 콘텐츠 */}
        <div className="relative z-10 text-center px-8 max-w-3xl">
          <h2 className="text-2xl font-bold mb-2">{currentBanner.title}</h2>
          <p className="text-lg mb-4">{currentBanner.description}</p>
          {currentBanner.buttonText && currentBanner.linkUrl && (
            <Button
              asChild
              style={{
                backgroundColor: currentBanner.buttonColor || "#FFFFFF",
                color: currentBanner.backgroundColor,
              }}
              className="hover:opacity-90 transition-opacity"
            >
              <a href={currentBanner.linkUrl} target="_blank" rel="noopener noreferrer">
                {currentBanner.buttonText}
              </a>
            </Button>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        {banners.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* 인디케이터 */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-4" : "bg-white/50"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
