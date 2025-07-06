// 이 파일은 신곡(NEWSONG) 페이지입니다.
'use client'

import { useState, useRef } from 'react'
import { Song } from '@/types/song'
import { SongList, SongListRef } from '@/components/song-list'
import { VideoPlayer } from '@/components/video-player'
import { SplitLayout } from '@/components/split-layout'

export default function NewSongPage() {
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
    <SplitLayout
      leftPanel={
        <SongList
          ref={songListRef}
          category="NEWSONG"
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