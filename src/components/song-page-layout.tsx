// 이 파일은 노래 페이지의 공통 레이아웃을 담당하는 컴포넌트입니다.
'use client'

import { useState, useRef, useEffect } from 'react'
import { SongList, SongListRef } from '@/components/song-list'
import { VideoPlayer } from '@/components/video-player'
import { Song } from '@/types/song'

interface SongPageLayoutProps {
  category: string
}

export function SongPageLayout({ category }: SongPageLayoutProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [, setIsLargeScreen] = useState(false)
  const songListRef = useRef<SongListRef>(null)

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const isLarge = window.innerWidth >= 1024
      setIsLargeScreen(isLarge)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 수정/삭제 핸들러
  const handleSongUpdate = (updated: Song) => {
    setSelectedSong(updated)
    songListRef.current?.refresh()
  }
  
  const handleSongDelete = () => {
    setSelectedSong(null)
    songListRef.current?.refresh()
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 비디오 플레이어 - 상단 고정 */}
        {selectedSong && (
          <div className="mb-8">
            <VideoPlayer 
              song={selectedSong}
              onSongUpdate={handleSongUpdate}
              onSongDelete={handleSongDelete}
            />
          </div>
        )}
        
        {/* 노래 목록 */}
        <div className="w-full">
          <SongList 
            ref={songListRef}
            category={category}
            onSongSelect={setSelectedSong}
            selectedSong={selectedSong}
            songs={songs}
            setSongs={setSongs}
          />
        </div>
      </div>
    </div>
  )
} 