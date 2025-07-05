// 이 파일은 팝송(POP) 페이지입니다.
'use client'

import { useState, useRef } from 'react'
import { Song } from '@/types/song'
import { SongList, SongListRef } from '@/components/song-list'
import { VideoPlayer } from '@/components/video-player'

export default function PopPage() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const songListRef = useRef<SongListRef>(null)

  const handleSongUpdate = (updated: Song) => {
    setSelectedSong(updated)
    songListRef.current?.refresh()
  }

  const handleSongDelete = (id: string) => {
    setSelectedSong(null)
    songListRef.current?.refresh()
  }

  return (
    <div className="flex flex-col lg:flex-row w-full">
      {/* 모바일/태블릿에서는 비디오 플레이어가 상단에, 데스크톱에서는 우측에 */}
      <div className="order-2 lg:order-1 lg:flex-1">
        <SongList
          ref={songListRef}
          category="POP"
          onSongSelect={setSelectedSong}
          selectedSong={selectedSong}
          songs={songs}
          setSongs={setSongs}
        />
      </div>
      <div className="order-1 lg:order-2 lg:flex-1">
        <VideoPlayer
          song={selectedSong}
          onSongUpdate={handleSongUpdate}
          onSongDelete={handleSongDelete}
        />
      </div>
    </div>
  )
} 