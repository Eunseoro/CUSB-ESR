// components/SongItem.tsx
import React, { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Copy } from 'lucide-react'
import { Song } from '@/types/song'
import { FirstVerseIcon, HighDifficultyIcon, LoopStationIcon, getProgressColor } from '@/lib/song-utils'
import { handleProgressChangeApi } from '@/lib/song-api'

interface SongItemProps {
  song: Song
  index: number
  songs: Song[]
  selectedSong?: Song | null
  onSongSelect: (song: Song) => void
  sort: string
  category?: string
  isAdmin: boolean
  likedSongs: Set<string>
  handleLike: (songId: string) => void
  handleCopy: (artist: string, title: string, e: React.MouseEvent, songId: string) => void
  copiedId: string | null
  setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void
  isUpdatingLike: boolean
}

export const SongItem = React.memo<SongItemProps>(({
  song,
  index,
  songs,
  selectedSong,
  onSongSelect,
  sort,
  category,
  isAdmin,
  likedSongs,
  handleLike,
  handleCopy,
  copiedId,
  setSongs,
  isUpdatingLike
}) => {
  const [localProgress, setLocalProgress] = useState<number>(song.progress ?? 0)
  const [isDragging, setIsDragging] = useState(false)

  // 그룹 구분선 로직
  const shouldShowDivider = (): string | null => {
    if (index === 0) return null
    
    const prevSong = songs[index - 1]
    if (!prevSong) return null

    if (sort === 'title' || sort === 'artist') {
      const getInitial = (str: string) => {
        const ch = str.trim().charAt(0)
        const code = ch.charCodeAt(0) - 44032
        if (code >= 0 && code < 11172) {
          const cho = Math.floor(code / 588)
          return 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[cho]
        }
        return ch.toUpperCase()
      }
      const currInitial = getInitial(sort === 'title' ? song.title : song.artist)
      const prevInitial = getInitial(sort === 'title' ? prevSong.title : prevSong.artist)
      return currInitial !== prevInitial ? currInitial : null
    }

    if (sort === 'latest' || sort === 'oldest') {
      const getMonth = (dateString: string) => {
        const d = new Date(dateString)
        return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}`
      }
      const currMonth = getMonth(song.createdAt)
      const prevMonth = getMonth(prevSong.createdAt)
      return currMonth !== prevMonth ? currMonth : null
    }

    if (sort === 'popular') {
      const getLikeGroup = (likeCount: number) => {
        const base = Math.floor((likeCount || 0) / 10) * 10
        return `${base}~${base+9}`
      }
      const currGroup = getLikeGroup(song.likeCount || 0)
      const prevGroup = getLikeGroup(prevSong.likeCount || 0)
      return currGroup !== prevGroup ? currGroup : null
    }

    if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station') {
      const getConditionStatus = (song: Song) => {
        if (sort === 'first-verse') return song.isFirstVerseOnly ? '1절만' : '일반'
        if (sort === 'high-difficulty') return song.isHighDifficulty ? '🔥' : '일반'
        return song.isLoopStation ? '⚡' : '일반'
      }
      const currStatus = getConditionStatus(song)
      const prevStatus = getConditionStatus(prevSong)
      return currStatus !== prevStatus ? currStatus : null
    }

    return null
  }

  // 그룹 구분선 컴포넌트
  const GroupDivider = ({ label }: { label: string }) => (
    <div className="flex items-center my-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="mx-3 text-base font-bold text-gray-400 select-none">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )

  // 진행도 변경 핸들러
  const handleProgressChange = useCallback(async (value: number) => {
    if (!isAdmin) return
    try {
      await handleProgressChangeApi(song.id, value)
      setSongs((prev: Song[]) => prev.map((s) => s.id === song.id ? { ...s, progress: value } : s))
    } catch (e) {
      // 실패 시 무시
    }
  }, [song.id, isAdmin, setSongs])

  const handleSliderChange = useCallback((value: number) => {
    setLocalProgress(value)
    setIsDragging(true)
  }, [])

  const handleSliderCommit = useCallback(() => {
    setIsDragging(false)
    if (localProgress !== song.progress) {
      handleProgressChange(localProgress)
    }
  }, [localProgress, song.progress, handleProgressChange])

  const dividerLabel = shouldShowDivider()

  return (
    <div>
      {dividerLabel && <GroupDivider label={dividerLabel} />}
      <Card
        className={`cursor-pointer hover:shadow-md transition-all ${
          selectedSong?.id === song.id ? 'bg-primary/5 border-primary/20' : ''
        } mt-2`}
        onClick={() => onSongSelect(song)}
      >
        <CardHeader className="pb-0 pt-2 -my-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight flex items-center gap-1">
                {song.isFirstVerseOnly && <FirstVerseIcon />}
                {song.isHighDifficulty && <HighDifficultyIcon />}
                {song.isLoopStation && <LoopStationIcon />}
                {song.title}
              </CardTitle>
              <p className="text-muted-foreground mt-0">
                {song.artist}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleCopy(song.artist, song.title, e, song.id)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {copiedId === song.id ? (
                  <span className="font-bold text-xs text-black dark:text-white">Copy!</span>
                ) : (
                  <Copy className="h-4 w-5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isUpdatingLike) {
                    handleLike(song.id)
                  }
                }}
                disabled={isUpdatingLike}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {likedSongs.has(song.id) ? (
                  <Heart className="h-4 w-4 fill-current text-red-500" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
                <span>{song.likeCount || 0}</span>
              </button>
            </div>
          </div>
        </CardHeader>
        {category === 'MISSION' && (
          <div className={`px-4 ${isAdmin ? 'pt-2 pb-0' : 'pt-2 pb-2'} mt-0 mb-[-8px]`}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">진행도</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-full h-3 rounded bg-gray-200 relative">
                  <div
                    className={`h-3 rounded ${getProgressColor(song.progress ?? 0)}`}
                    style={{ width: `${song.progress ?? 0}%`, transition: 'width 0.3s' }}
                  />
                </div>
                <span className="text-xs font-bold w-10 text-right">{song.progress ?? 0}%</span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 mr-1">수정</span>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={localProgress}
                    onChange={e => handleSliderChange(Number(e.target.value))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    className="w-full accent-blue-500"
                    onClick={e => e.stopPropagation()}
                    style={{ touchAction: 'none' }}
                  />
                  <span className="text-xs font-bold text-blue-600 min-w-[2.5rem] text-right">{localProgress}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
})