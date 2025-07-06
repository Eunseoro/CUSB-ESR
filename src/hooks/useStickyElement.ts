// 비디오 플레이어가 화면을 따라다니도록 하는 커스텀 훅
import { useEffect, useRef, useState, useCallback } from 'react'

interface UseStickyElementProps {
  offset?: number
  enabled?: boolean
}

export function useStickyElement({ offset = 100, enabled = true }: UseStickyElementProps = {}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)
  const originalPositionRef = useRef<{ top: number; left: number; width: number } | null>(null)
  const lastScrollY = useRef(0)
  const isLargeScreenRef = useRef(false)

  const updateOriginalPosition = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const parentRect = element.parentElement?.getBoundingClientRect()
    
    if (parentRect) {
      originalPositionRef.current = {
        top: rect.top + window.scrollY,
        left: parentRect.left,
        width: parentRect.width
      }
    }
  }, [])

  const handleScroll = useCallback(() => {
    const element = elementRef.current
    if (!element || !originalPositionRef.current) return

    const scrollTop = window.scrollY
    const scrollDirection = scrollTop > lastScrollY.current ? 'down' : 'up'
    lastScrollY.current = scrollTop

    // lg 상태에서는 항상 sticky 상태 유지
    const isLarge = window.innerWidth >= 1024
    isLargeScreenRef.current = isLarge
    
    const shouldBeSticky = isLarge || scrollTop + offset >= originalPositionRef.current.top

    if (shouldBeSticky && !isSticky) {
      setIsSticky(true)
      element.style.position = 'fixed'
      element.style.top = `${offset}px`
      element.style.left = `${originalPositionRef.current.left}px`
      element.style.width = `${originalPositionRef.current.width}px`
      element.style.zIndex = '50'
      element.style.transition = 'all 0.1s ease-in-out' // 전환 속도 개선
      element.style.transform = 'translateY(0)'
    } else if (!shouldBeSticky && isSticky) {
      setIsSticky(false)
      element.style.position = 'static'
      element.style.top = 'auto'
      element.style.left = 'auto'
      element.style.width = 'auto'
      element.style.zIndex = 'auto'
      element.style.transform = 'none'
    } else if (isSticky && !isLarge) {
      // lg가 아닐 때만 스크롤 방향에 따른 미세 조정
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight - offset
      
      if (scrollDirection === 'down' && scrollTop < maxScroll) {
        element.style.transform = 'translateY(-2px)'
      } else if (scrollDirection === 'up' && scrollTop > offset) {
        element.style.transform = 'translateY(2px)'
      } else {
        element.style.transform = 'translateY(0)'
      }
    }
  }, [offset, isSticky])

  const handleResize = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    const isLarge = window.innerWidth >= 1024
    const wasLarge = isLargeScreenRef.current
    isLargeScreenRef.current = isLarge

    // lg→md 전환 시 즉시 위치 재계산
    if (wasLarge !== isLarge) {
      updateOriginalPosition()
      
      if (isLarge && !isSticky) {
        // lg로 전환 시 즉시 sticky 상태로 변경
        setIsSticky(true)
        if (originalPositionRef.current) {
          element.style.position = 'fixed'
          element.style.top = `${offset}px`
          element.style.left = `${originalPositionRef.current.left}px`
          element.style.width = `${originalPositionRef.current.width}px`
          element.style.zIndex = '50'
          element.style.transition = 'all 0.1s ease-in-out'
          element.style.transform = 'translateY(0)'
        }
      } else if (!isLarge && isSticky) {
        // md로 전환 시 sticky 해제
        setIsSticky(false)
        element.style.position = 'static'
        element.style.top = 'auto'
        element.style.left = 'auto'
        element.style.width = 'auto'
        element.style.zIndex = 'auto'
        element.style.transform = 'none'
      }
    } else if (isSticky && originalPositionRef.current) {
      // 일반적인 리사이즈 처리
      const parentRect = element.parentElement?.getBoundingClientRect()
      if (parentRect) {
        element.style.width = `${parentRect.width}px`
        element.style.left = `${parentRect.left}px`
        originalPositionRef.current = {
          ...originalPositionRef.current,
          left: parentRect.left,
          width: parentRect.width
        }
      }
    } else {
      updateOriginalPosition()
    }
  }, [isSticky, updateOriginalPosition, offset])

  useEffect(() => {
    if (!enabled) return

    // 초기 위치 설정
    updateOriginalPosition()
    
    // 초기 화면 크기 확인
    isLargeScreenRef.current = window.innerWidth >= 1024

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled, handleScroll, handleResize, updateOriginalPosition])

  return { elementRef, isSticky }
} 