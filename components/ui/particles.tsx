"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface ParticlesProps {
  quantity?: number
  className?: string
}

const Particles: React.FC<ParticlesProps> = ({ quantity = 50, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    // Set canvas dimensions
    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      color: string
      opacity: number
      speedX: number
      speedY: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 2 + 1
        this.color = "rgba(255, 255, 255, 0.5)"
        this.opacity = Math.random() * 0.5 + 0.2
        this.speedX = Math.random() * 0.4 - 0.2
        this.speedY = Math.random() * 0.4 - 0.2
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x < 0 || this.x > canvas.width) {
          this.speedX = -this.speedX
        }
        if (this.y < 0 || this.y > canvas.height) {
          this.speedY = -this.speedY
        }
      }

      draw() {
        ctx.fillStyle = this.color
        ctx.globalAlpha = this.opacity
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1 // Reset opacity
      }
    }

    // Create particles
    const particlesArray: Particle[] = []
    for (let i = 0; i < quantity; i++) {
      particlesArray.push(new Particle())
    }

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update()
        particlesArray[i].draw()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", setCanvasSize)
    }
  }, [quantity])

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />
}

export { Particles }
