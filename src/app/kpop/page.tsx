// 이 파일은 한국노래(K-POP) 페이지입니다.
'use client'

import { useState, useRef } from 'react'
import { SongList, SongListRef } from '@/components/song-list'
import { VideoPlayer } from '@/components/video-player'
import { SplitLayout } from '@/components/split-layout'
import { Song } from '@/types/song'

export default function KpopPage() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const songListRef = useRef<SongListRef>(null)

  // 수정/삭제 핸들러
  const handleSongUpdate = (updated: Song) => {
    setSelectedSong(updated)
    // 목록 새로고침
    songListRef.current?.refresh()
  }
  
  const handleSongDelete = (id: string) => {
    setSelectedSong(null)
    // 목록 새로고침
    songListRef.current?.refresh()
  }

  return (
    <SplitLayout
      leftPanel={
        <SongList
          ref={songListRef}
          category="KPOP"
          onSongSelect={setSelectedSong}
          selectedSong={selectedSong}
          songs={songs}
          setSongs={setSongs}
        />
      }
      rightPanel={
        <VideoPlayer
          song={selectedSong}
          onSongUpdate={handleSongUpdate}
          onSongDelete={handleSongDelete}
        />
      }
    />
  )
} 