// 푸터 미니 플레이어 컴포넌트
'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BgmPlayerState } from '@/types/bgm'
import { getBgmTagColor } from '@/lib/song-utils'

interface MiniPlayerProps {
  playerState: BgmPlayerState
  onToggleExpanded: () => void
  onTogglePlayPause: () => void
  onNextTrack: () => void
  onPreviousTrack: () => void
  onSetVolume: (volume: number) => void
  loading?: boolean
}

export function MiniPlayer({
  playerState,
  onToggleExpanded,
  onTogglePlayPause,
  onNextTrack,
  onPreviousTrack,
  onSetVolume,
  loading = false
}: MiniPlayerProps) {
  const [showVolumeControl, setShowVolumeControl] = useState(false)
  const [volumeTimeout, setVolumeTimeout] = useState<NodeJS.Timeout | null>(null)

  // 볼륨 변경 핸들러
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value)
    onSetVolume(volume)
  }

  // 볼륨 음소거 토글
  const toggleMute = () => {
    if (playerState.volume > 0) {
      onSetVolume(0)
    } else {
      onSetVolume(0.3)
    }
  }

  // 볼륨 컨트롤 마우스 이벤트
  const handleVolumeMouseEnter = () => {
    if (volumeTimeout) {
      clearTimeout(volumeTimeout)
      setVolumeTimeout(null)
    }
    setShowVolumeControl(true)
  }

  const handleVolumeMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowVolumeControl(false)
    }, 1000) // 1초 후 숨김
    setVolumeTimeout(timeout)
  }

  // 볼륨 슬라이더 마우스 이벤트
  const handleSliderMouseEnter = () => {
    if (volumeTimeout) {
      clearTimeout(volumeTimeout)
      setVolumeTimeout(null)
    }
  }

  const handleSliderMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowVolumeControl(false)
    }, 1000) // 1초 후 숨김
    setVolumeTimeout(timeout)
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (volumeTimeout) {
        clearTimeout(volumeTimeout)
      }
    }
  }, [volumeTimeout])

  return (
    <>
      {/* 푸터 미니 플레이어 - 항상 표시 */}
      <div className="fixed bottom-0 left-0 right-0 z-100 bg-background/95 backdrop-blur-md border-t border-border shadow-lg md:left-16" data-footer-player>
        <div className="flex items-center justify-between px-4 py-3">
          {/* 왼쪽: 트랙 정보 */}
          <div 
            className="flex-1 flex items-center space-x-3 cursor-pointer"
            onClick={onToggleExpanded}
          >
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              ) : playerState.currentTrack ? (
                <Music className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Music className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="text-sm text-muted-foreground">BGM 로딩 중...</div>
              ) : playerState.currentTrack ? (
                <>
                  <div className="text-sm font-medium text-foreground truncate">
                    {playerState.currentTrack.title || 'Unknown Track'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {playerState.currentTrack.genre}
                    </div>
                    {/* 태그 표시 */}
                    {playerState.currentTrack.tags && playerState.currentTrack.tags.length > 0 && (
                      <div className="flex gap-1">
                        {playerState.currentTrack.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${getBgmTagColor(tag as any)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {playerState.currentTrack.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{playerState.currentTrack.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-foreground">Playlist</div>
                  <div className="text-xs text-muted-foreground">BGM</div>
                </>
              )}
            </div>
          </div>

          {/* 오른쪽: 볼륨 컨트롤 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              disabled={!playerState.currentTrack}
              className="p-2"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              {playerState.volume > 0 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            
            {showVolumeControl && playerState.currentTrack && (
              <div 
                className="absolute bottom-full right-[40px] mb-[-35px] p-2"
                onMouseEnter={handleSliderMouseEnter}
                onMouseLeave={handleSliderMouseLeave}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={playerState.volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* 중앙: 재생 컨트롤 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousTrack}
              disabled={!playerState.currentTrack || playerState.queue.length === 0}
              className="p-2"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlayPause}
              disabled={!playerState.currentTrack || loading}
              className="p-2"
            >
              {playerState.isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextTrack}
              disabled={!playerState.currentTrack || playerState.queue.length === 0}
              className="p-2"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          
        </div>
      </div>
    </>
  )
} 