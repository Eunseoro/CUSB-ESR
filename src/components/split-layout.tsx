// 이 파일은 실제 분할 레이아웃을 구현하는 컴포넌트입니다.
// 페이지를 물리적으로 분할하여 상단 영역과 하단 영역이 독립적인 공간으로 존재합니다.
'use client'

import { ReactNode } from 'react'

interface SplitLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  className?: string
}

export function SplitLayout({ leftPanel, rightPanel, className = '' }: SplitLayoutProps) {
  return (
    // 모바일: flex-col-reverse (상단: 비디오 30%, 하단: 목록 70%), PC: flex-row (왼쪽: 목록 50%, 오른쪽: 비디오 50%)
    <div className={`w-full split-layout-height flex flex-col-reverse lg:flex-row ${className}`}>
      {/* 모바일: 하단(노래 목록 70%), PC: 왼쪽(노래 목록 50%) */}
      <div className="w-full split-bottom-70 lg:h-full lg:w-1/2 border-t lg:border-t-0 lg:border-r border-gray-200 dark:border-gray-700">
        <div className="h-full overflow-y-auto scrollbar-custom">
          {leftPanel}
        </div>
      </div>
      {/* 모바일: 상단(비디오 30%), PC: 오른쪽(비디오 50%) */}
      <div className="w-full split-top-30 lg:h-full lg:w-1/2">
        <div className="h-full overflow-y-auto scrollbar-custom">
          {rightPanel}
        </div>
      </div>
    </div>
  )
} 