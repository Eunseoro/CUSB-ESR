'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  onContextMenu?: (e: React.MouseEvent) => void
  draggable?: boolean
  [key: string]: unknown
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  onContextMenu,
  draggable = false,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // 50px 전에 미리 로드
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(true)
  }, [])

  // 이미지 로드 최적화를 위한 preload
  useEffect(() => {
    if (isInView && !isLoaded && !hasError) {
      const img = new window.Image()
      img.onload = handleLoad
      img.onerror = handleError
      img.src = src
    }
  }, [isInView, isLoaded, hasError, src, handleLoad, handleError])

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <>
          {!hasError ? (
            <Image
              src={src}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              onContextMenu={onContextMenu}
              draggable={draggable}
              className={`transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              } ${className}`}
              width={500}
              height={500}
              {...props}
            />
          ) : (
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 rounded">
              이미지 로드 실패
            </div>
          )}
        </>
      )}
      
      {/* 로딩 플레이스홀더 */}
      {!isLoaded && isInView && !hasError && (
        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center rounded">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
