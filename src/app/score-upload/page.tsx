// 악보 이미지 업로드 페이지 (팝업)
'use client'

import { Suspense, useEffect, useLayoutEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScoreUploadContent } from '@/components/score-upload-content'

function ScoreUploadPage() {
  // 브라우저 창 제목 설정 (useLayoutEffect로 더 강력하게)
  useLayoutEffect(() => {
    const setTitle = () => {
      document.title = '유할매 악보'
      // 추가로 head 태그 직접 조작
      const titleElement = document.querySelector('title')
      if (titleElement) {
        titleElement.textContent = '유할매 악보'
      }
    }
    
    setTitle()
    
    // 주기적으로 제목 확인 및 재설정 (layout.tsx metadata 덮어쓰기 방지)
    const interval = setInterval(setTitle, 100)
    
    return () => clearInterval(interval)
  }, [])

  // 추가로 useEffect로도 설정 (이중 보장)
  useEffect(() => {
    const setTitle = () => {
      document.title = '유할매 악보'
    }
    
    setTitle()
    
    // 주기적으로 제목 확인 및 재설정
    const interval = setInterval(setTitle, 200)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ScoreUploadContent />
    </Suspense>
  )
}

export default ScoreUploadPage
