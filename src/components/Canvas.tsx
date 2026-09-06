'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePixelStore } from '@/store/pixelStore'

const GRID_SIZE = 2000
const PIXEL_SIZE = 20 // Base size before zoom

interface Viewport {
  x: number
  y: number
  zoom: number
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null)

  const { pixels, placePixel, fetchPixels } = usePixelStore()

  useEffect(() => {
    fetchPixels()
    const interval = setInterval(fetchPixels, 5000) // Poll every 5s
    const unsubscribe = usePixelStore.getState().subscribeToPixels()
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [fetchPixels])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'

    // Clear
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Calculate visible range
    const pixelSize = PIXEL_SIZE * viewport.zoom
    const startX = Math.floor(-viewport.x / pixelSize)
    const startY = Math.floor(-viewport.y / pixelSize)
    const endX = startX + Math.ceil(rect.width / pixelSize) + 1
    const endY = startY + Math.ceil(rect.height / pixelSize) + 1

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5
    for (let x = Math.max(0, startX); x <= Math.min(GRID_SIZE - 1, endX); x++) {
      for (let y = Math.max(0, startY); y <= Math.min(GRID_SIZE - 1, endY); y++) {
        const px = viewport.x + x * pixelSize
        const py = viewport.y + y * pixelSize
        ctx.strokeRect(px, py, pixelSize, pixelSize)
      }
    }

    // Draw pixels
    pixels.forEach(pixel => {
      if (pixel.x < startX || pixel.x > endX || pixel.y < startY || pixel.y > endY) return
      const px = viewport.x + pixel.x * pixelSize
      const py = viewport.y + pixel.y * pixelSize

      // Apply intensity fade visually
      const alpha = pixel.is_permanent ? 1 : (pixel.intensity / 100)
      ctx.globalAlpha = alpha
      ctx.fillStyle = pixel.color
      ctx.fillRect(px + 0.5, py + 0.5, pixelSize - 1, pixelSize - 1)
      ctx.globalAlpha = 1
    })

    // Draw hover outline
    if (hoveredPixel) {
      const px = viewport.x + hoveredPixel.x * pixelSize
      const py = viewport.y + hoveredPixel.y * pixelSize
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeRect(px, py, pixelSize, pixelSize)
    }
  }, [viewport, pixels, hoveredPixel])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomFactor))

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setViewport(prev => ({
      zoom: newZoom,
      x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
      y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom)
    }))
  }, [viewport.zoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
    }
  }, [viewport])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }))
    }

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const pixelSize = PIXEL_SIZE * viewport.zoom
    const x = Math.floor((e.clientX - rect.left - viewport.x) / pixelSize)
    const y = Math.floor((e.clientY - rect.top - viewport.y) / pixelSize)

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      setHoveredPixel({ x, y })
    } else {
      setHoveredPixel(null)
    }
  }, [isDragging, dragStart, viewport])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback((_e: React.MouseEvent) => {
    if (isDragging) return
    if (!hoveredPixel) return

    placePixel(hoveredPixel.x, hoveredPixel.y, selectedColor)
  }, [hoveredPixel, selectedColor, isDragging, placePixel])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          className="block cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Color Picker */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border rounded-2xl shadow-xl p-4 flex gap-3 items-center">
        {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'].map(color => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-8 h-8 rounded-full overflow-hidden cursor-pointer"
        />
      </div>

      {/* Coordinates */}
      {hoveredPixel && (
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-mono">
          {hoveredPixel.x}, {hoveredPixel.y}
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button onClick={() => setViewport(p => ({...p, zoom: Math.min(10, p.zoom * 1.2)}))} className="w-10 h-10 bg-white rounded-lg shadow border flex items-center justify-center text-xl hover:bg-gray-50">+</button>
        <button onClick={() => setViewport(p => ({...p, zoom: Math.max(0.1, p.zoom / 1.2)}))} className="w-10 h-10 bg-white rounded-lg shadow border flex items-center justify-center text-xl hover:bg-gray-50">−</button>
      </div>
    </div>
  )
}
