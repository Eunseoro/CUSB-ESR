// 악보 이미지 업로드 페이지 (팝업)
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScoreUploadContent } from '@/components/score-upload-content'

function ScoreUploadPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ScoreUploadContent />
    </Suspense>
  )
}

export default ScoreUploadPage
