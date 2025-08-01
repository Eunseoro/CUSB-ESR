// 이 파일은 페이지 최상단으로 이동하는 TOP 버튼 컴포넌트입니다.
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronUp } from 'lucide-react'

export function TopButton() {
  const [isVisible, setIsVisible] = useState(false)

  // 스크롤 위치 감지하여 버튼 표시/숨김 처리
  useEffect(() => {
    const toggleVisibility = () => {
      // 스크롤이 300px 이상 내려가면 버튼 표시
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  // 최상단으로 스크롤하는 함수
  const scrollToTop = () => {
    // 더 빠른 스크롤을 위한 커스텀 애니메이션
    const scrollStep = () => {
      const currentPosition = window.pageYOffset
      if (currentPosition > 0) {
        // 스크롤 속도 조절 (값이 클수록 빠름)
        const step = Math.max(currentPosition / 8, 1)
        window.scrollTo(0, currentPosition - step)
        requestAnimationFrame(scrollStep)
      }
    }
    scrollStep()
  }

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          size="sm"
          className="fixed bottom-20 right-6 z-10 h-10 w-10 rounded-full bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-300 hover:scale-110">
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </>
  )
} 