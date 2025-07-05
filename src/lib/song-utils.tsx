// 이 파일은 노래 목록에서 사용하는 유틸리티 함수들을 모아둔 파일입니다.
import React from 'react'

// 날짜를 YYYY.MM.DD 포맷으로 반환
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`
}

// 카테고리별 색상 반환
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'KPOP': return 'bg-pink-100 text-pink-700'
    case 'POP': return 'bg-blue-100 text-blue-700'
    case 'MISSION': return 'bg-purple-100 text-purple-700'
    case 'NEWSONG': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// 카테고리별 표시 이름 반환
export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'KPOP': return 'K-POP'
    case 'POP': return 'POP'
    case 'MISSION': return '미션곡'
    case 'NEWSONG': return '신곡'
    default: return category
  }
}

// 진행도에 따른 색상 반환
export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-400'
  if (progress >= 70) return 'bg-yellow-300'
  if (progress >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

// 1절만 아이콘 컴포넌트
export function FirstVerseIcon() {
  return (
    <span className="inline-flex items-center text-m" title="1절만">
      <img src="/icons/1st-verse.png" alt="1절만 아이콘" className="h-5 w-5 mr-1" />
    </span>
  )
}

// 고난이도 아이콘 컴포넌트
export function HighDifficultyIcon() {
  return (
    <span className="inline-flex items-center text-m" title="고난이도">🔥</span>
  )
}

// 루프 스테이션 아이콘 컴포넌트
export function LoopStationIcon() {
  return (
    <span className="inline-flex items-center text-m" title="루프 스테이션">⚡</span>
  )
} 