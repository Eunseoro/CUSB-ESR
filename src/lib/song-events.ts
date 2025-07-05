// 이 파일은 노래 목록 업데이트를 위한 이벤트 시스템입니다.

import { Song } from '@/types/song'

// 노래 목록 새로고침 이벤트
export function triggerSongListRefresh(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('songListRefresh'))
}

// 노래 목록 새로고침 이벤트 리스너 등록
export function onSongListRefresh(callback: () => void): () => void {
  const handleRefresh = () => {
    callback()
  }
  
  window.addEventListener('songListRefresh', handleRefresh)
  
  // 클린업 함수 반환
  return () => {
    window.removeEventListener('songListRefresh', handleRefresh)
  }
}

// 특정 노래 업데이트 이벤트
export function triggerSongUpdate(songId: string, updatedSong?: Song): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('songUpdate', { 
    detail: { songId, updatedSong } 
  }))
}

// 특정 노래 업데이트 이벤트 리스너 등록
export function onSongUpdate(callback: (songId: string, updatedSong?: Song) => void): () => void {
  const handleSongUpdate = (event: CustomEvent) => {
    callback(event.detail.songId, event.detail.updatedSong)
  }
  
  window.addEventListener('songUpdate', handleSongUpdate as EventListener)
  
  // 클린업 함수 반환
  return () => {
    window.removeEventListener('songUpdate', handleSongUpdate as EventListener)
  }
}

// 노래 삭제 이벤트
export function triggerSongDelete(songId: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('songDelete', { 
    detail: { songId } 
  }))
}

// 노래 삭제 이벤트 리스너 등록
export function onSongDelete(callback: (songId: string) => void): () => void {
  const handleSongDelete = (event: CustomEvent) => {
    callback(event.detail.songId)
  }
  
  window.addEventListener('songDelete', handleSongDelete as EventListener)
  
  // 클린업 함수 반환
  return () => {
    window.removeEventListener('songDelete', handleSongDelete as EventListener)
  }
} 