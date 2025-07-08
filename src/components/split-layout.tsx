// 이 파일은 실제 분할 레이아웃을 구현하는 컴포넌트입니다.
// 페이지를 물리적으로 분할하여 상단 영역과 하단 영역이 독립적인 공간으로 존재합니다.
'use client'

import { ReactNode, useRef, useState, useEffect } from 'react'

interface SplitLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  className?: string
}

export function SplitLayout({ leftPanel, rightPanel, className = '' }: SplitLayoutProps) {
  // 분할 비율 상태: 0.1~0.9 사이, 기본값 모바일 0.7(70%), PC 0.5(50%)
  const [ratio, setRatio] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0.5 : 0.7))
  const [dragging, setDragging] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)
  // PC: 가로 1024px 이상 & 실제 레이아웃도 1024px 이상일 때만 진짜 PC 모드로 간주
  const [isPc, setIsPc] = useState(false)

  // 드래그 시작
  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    document.body.style.cursor = isPc ? 'col-resize' : 'row-resize';
  }

  // 드래그 중
  // requestAnimationFrame으로 부드럽게
  const rafRef = useRef<number | null>(null)
  const lastRatio = useRef(ratio)
  const onDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging || !layoutRef.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const rect = layoutRef.current!.getBoundingClientRect()
      let pos = 0
      if (isPc) {
        pos = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width
      } else {
        pos = 1 - (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height
      }
      const newRatio = Math.max(0.1, Math.min(0.9, pos))
      if (Math.abs(newRatio - lastRatio.current) > 0.001) {
        setRatio(newRatio)
        lastRatio.current = newRatio
      }
    })
  }

  // 드래그 끝
  const onDragEnd = () => {
    setDragging(false)
    document.body.style.cursor = ''
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  // 이벤트 등록/해제
  useEffect(() => {
    if (!dragging) return
    const move = (e: any) => onDragMove(e)
    const up = () => onDragEnd()
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [dragging])

  useEffect(() => {
    const check = () => {
      setIsPc(window.innerWidth >= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 모바일: flex-col-reverse, PC: flex-row
  // 비율 동적 적용
  const leftStyle = isPc
    ? { width: `${ratio * 100}%`, height: '100%' }
    : { height: `${ratio * 100}%`, width: '100%' }
  const rightStyle = isPc
    ? { width: `${(1 - ratio) * 100}%`, height: '100%' }
    : { height: `${(1 - ratio) * 100}%`, width: '100%' }

  // 기준선(Separator) 스타일
  const separatorStyle = isPc
    ? { cursor: 'col-resize', width: 12, minWidth: 12, background: undefined, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }
    : { cursor: 'row-resize', height: 12, minHeight: 12, background: undefined, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }

  return (
    <div ref={layoutRef} className={`w-full split-layout-height flex flex-col-reverse lg:flex-row ${className}`} style={{ position: 'relative' }}>
      {/* 모바일: 하단(노래 목록), PC: 왼쪽(노래 목록) */}
      <div style={leftStyle} className="border-t lg:border-t-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-custom py-[-5px]">
          {leftPanel}
        </div>
      </div>
      {/* 기준선(Separator) */}
      <div
        style={separatorStyle}
        className={
          `flex-shrink-0 transition-colors group ` +
          (dragging
            ? 'bg-gray-400 dark:bg-[#222]'
            : 'bg-gray-200 dark:bg-[#171717] hover:bg-gray-300 dark:hover:bg-[#222]')
        }
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        role="separator"
        aria-orientation={isPc ? 'vertical' : 'horizontal'}
        tabIndex={-1}
      >
        {/* 시각적 안내용 버튼(≡), 실제 드래그는 기준선 전체에서 인식 */}
        <span className="pointer-events-none text-gray-500 dark:text-gray-200 text-lg select-none mx-auto my-0">
          =
        </span>
      </div>
      {/* 모바일: 상단(비디오), PC: 오른쪽(비디오) */}
      <div style={rightStyle} className="overflow-hidden min-w-0 max-w-full relative">
        <div className="h-full overflow-y-auto scrollbar-custom py-[-20px]">
          {rightPanel}
        </div>
        {isPc && (
          <img src="/video_player_org.png" className="absolute right-4 bottom-0 w-70 h-70 opacity-70 pointer-events-none z-10" />
        )}
      </div>
    </div>
  )
} 