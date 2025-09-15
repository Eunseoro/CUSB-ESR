// 이 파일은 한국노래(K-POP) 페이지입니다.
'use client'

import { useState, useRef, useEffect } from 'react'
import { SongList, SongListRef } from '@/components/song-list'
import { VideoPlayer } from '@/components/video-player'
import { SplitLayout } from '@/components/split-layout'
import { Song } from '@/types/song'

export default function KpopPage() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const songListRef = useRef<SongListRef>(null)

  // 팝업 창에서 오는 메시지 처리
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'UPDATE_SELECTED_SONG') {
        const { artistTitle } = event.data
        console.log('팝업에서 받은 노래 정보:', artistTitle)
        
        try {
          // '아티스트 - 제목' 형식 파싱
          const parts = artistTitle.split(' - ')
          if (parts.length !== 2) {
            console.log('올바른 형식이 아닙니다:', artistTitle)
            return
          }

          const title = parts[1].trim()

          // 제목만으로 노래 검색 API 호출 (성능 최적화)
          const response = await fetch(`/api/songs?title=${encodeURIComponent(title)}`)
          
          if (response.ok) {
            const songs = await response.json()
            if (songs.length > 0) {
              setSelectedSong(songs[0])
              console.log('선택된 노래 업데이트:', songs[0])
            } else {
              console.log('노래를 찾을 수 없습니다:', title)
            }
          } else {
            console.error('노래 검색 실패')
          }
        } catch (error) {
          console.error('노래 업데이트 중 오류:', error)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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