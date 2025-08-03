// 이 파일은 노래 목록에서 사용하는 유틸리티 함수들을 모아둔 파일입니다.
import React from 'react'
import { BgmTag } from '@/types/bgm'
import { Song, SongCategory } from '@/types/song'

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

// 숫자-한글-알파벳 순서로 정렬하는 함수
export function getKoreanSortKey(text: string): string {
  const firstChar = text.trim().charAt(0)
  

  if (/^[0-9]/.test(firstChar)) {
    return '1' + text
  }
  

  if (/^[가-힣]/.test(firstChar)) {
    return '2' + text
  }
  

  if (/^[a-zA-Z]/.test(firstChar)) {
    return '3' + text
  }
  

  return '4' + text
}

// BGM 태그별 색상 반환
export function getBgmTagColor(tag: BgmTag): string {
  switch (tag) {
    case '신나는': return 'bg-red-100 text-red-700'
    case '잔잔한': return 'bg-blue-100 text-blue-700'
    case '멋있는': return 'bg-purple-100 text-purple-700'
    case '감성적인': return 'bg-yellow-100 text-yellow-700'
    case '재밌는': return 'bg-green-100 text-green-700'
    case '애니메이션': return 'bg-pink-100 text-pink-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// 선택되지 않은 BGM 태그 색상 반환 (흐릿한 버전)
export function getBgmTagUnselectedColor(tag: BgmTag): string {
  switch (tag) {
    case '신나는': return 'bg-red-50 text-red-500'
    case '잔잔한': return 'bg-blue-50 text-blue-500'
    case '멋있는': return 'bg-purple-50 text-purple-500'
    case '감성적인': return 'bg-gray-50 text-yellow-500'
    case '재밌는': return 'bg-green-50 text-green-500'
    case '애니메이션': return 'bg-pink-50 text-pink-500'
    default: return 'bg-gray-50 text-gray-500'
  }
}

// 정확한 카테고리 필터링 함수
export function filterSongsByCategory(songs: Song[], targetCategory: SongCategory): Song[] {
  return songs.filter(song => {
    if (!song.categories || song.categories.length === 0) {
      return false
    }
    
    // POP 페이지의 경우 KPOP 카테고리를 제외
    if (targetCategory === 'POP') {
      return song.categories.includes(targetCategory) && !song.categories.includes('KPOP')
    }
    
    // 해당 카테고리가 포함된 모든 곡 표시
    return song.categories.includes(targetCategory)
  })
}

// 1절만 아이콘 컴포넌트
export function FirstVerseIcon() {
  return (
    <span className="inline-flex items-center text-m" title="1절만">
      <img src="/icons/1st-verse.webp" className="h-5 w-5 mr-1"/>
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

// MR 아이콘 컴포넌트
export function MrIcon() {
  return (
    <span className="inline-flex items-center text-m" title="MR">
      <img src="/icons/mr.webp" className="h-5 w-5 mr-1"/>
    </span>
  )
} 