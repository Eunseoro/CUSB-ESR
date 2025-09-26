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

// 이미지 캐시를 위한 전역 Map (URL별 로드 상태 추적)
const imageCache = new Map<string, boolean>()
const loadingImages = new Set<string>() // 현재 로딩 중인 이미지 추적

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

  // 이미지 로드 최적화를 위한 preload - 중복 로드 방지
  useEffect(() => {
    if (isInView && !isLoaded && !hasError) {
      // 이미 캐시된 이미지는 preload 생략
      if (imageCache.has(src)) {
        setIsLoaded(true)
        return
      }
      
      // 현재 로딩 중인 이미지는 중복 로드 방지
      if (loadingImages.has(src)) {
        return
      }
      
      loadingImages.add(src)
      const img = new window.Image()
      img.onload = () => {
        imageCache.set(src, true)
        loadingImages.delete(src)
        handleLoad()
      }
      img.onerror = () => {
        loadingImages.delete(src)
        handleError()
      }
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
              onLoad={() => {
                imageCache.set(src, true)
                handleLoad()
              }}
              onError={handleError}
              onContextMenu={onContextMenu}
              draggable={draggable}
              className={`transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              } ${className}`}
              width={500}
              height={500}
              priority={false} // 우선순위 로딩 비활성화
              unoptimized={false} // Next.js 최적화 유지
              quality={75} // 품질 통일
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // 반응형 크기 통일
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
