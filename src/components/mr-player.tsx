'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Music, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { getMRFileUrl } from '@/lib/mr-api'

interface MRPlayerProps {
  songId: string
  songTitle: string
  refreshTrigger?: number
}

export function MRPlayer({ songId, songTitle, refreshTrigger }: MRPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // MR 파일 로드
  useEffect(() => {
    loadMRAudio()
  }, [songId, refreshTrigger])

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      // Signed URL은 자동으로 만료되므로 별도 cleanup 불필요
    }
  }, [])

  const loadMRAudio = async () => {
    if (!songId) return
    
    console.log('MR 파일 로드 시작:', songId)
    setIsLoading(true)
    setAudioUrl(null) // 이전 URL 초기화
    
    try {
      // Signed URL 생성
      const signedUrl = await getMRFileUrl(songId)
      
      if (!signedUrl) {
        console.log('MR 파일이 없음:', songId)
        setIsLoading(false)
        return
      }
      
      console.log('MR 파일 URL 생성 성공:', songId)
      setAudioUrl(signedUrl)
    } catch (error) {
      console.error('MR 파일 로드 실패:', error)
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 오디오 이벤트 핸들러
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleTimeUpdate = () => {
      if (audio.currentTime && !isNaN(audio.currentTime) && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (e: Event) => {
      console.error('오디오 로드 오류:', e)
      setAudioUrl(null)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl]) // audioUrl이 변경될 때마다 이벤트 리스너 재설정

  // 재생/정지 토글
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      setIsPaused(true)
    } else {
      try {
        await audio.play()
        setIsPlaying(true)
        setIsPaused(false)
      } catch (error) {
        console.error('오디오 재생 실패:', error)
        alert('오디오 재생에 실패했습니다.')
      }
    }
  }

  // 정지 버튼
  const handleStop = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
  }

  // 진행률 클릭 핸들러
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !progressRef.current || !duration || isNaN(duration) || !isFinite(duration)) return

    try {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const width = rect.width
      const clickTime = Math.max(0, Math.min(duration, (clickX / width) * duration))
      
      audio.currentTime = clickTime
      setCurrentTime(clickTime)
    } catch (error) {
      console.error('진행률 변경 실패:', error)
    }
  }

  // 볼륨 변경
  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    try {
      const newVolume = Math.max(0, Math.min(1, value[0] || 0))
      setVolume(newVolume)
      audio.volume = newVolume
      setIsMuted(newVolume === 0)
    } catch (error) {
      console.error('볼륨 변경 실패:', error)
    }
  }

  // 음소거 토글
  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isMuted) {
        const newVolume = Math.max(0, Math.min(1, volume || 1))
        audio.volume = newVolume
        setIsMuted(false)
      } else {
        audio.volume = 0
        setIsMuted(true)
      }
    } catch (error) {
      console.error('음소거 토글 실패:', error)
    }
  }

  // 시간 포맷팅
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time) || time < 0) return '0:00'
    
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 진행률 계산
  const progress = duration > 0 && !isNaN(duration) && !isNaN(currentTime) && isFinite(duration) && isFinite(currentTime)
    ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
    : 0

  if (isLoading) {
    return (
      <div className="w-full p-1 border rounded-lg bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">MR</h4>
        </div>
        <div className="text-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            MR 파일을 로딩 중입니다...
          </p>
        </div>
      </div>
    )
  }

  // MR 파일이 없으면 아무것도 표시하지 않음
  if (!audioUrl) {
    return null
  }

  return (
    <div className="w-full p-2 border mb-2 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium pl-2 text-sm">MR</h4>
      </div>

      {/* 진행률 바 */}
      <div 
        ref={progressRef}
        className={`relative h-3 bg-muted rounded-full mb-3 transition-colors group ${
          audioUrl ? 'cursor-pointer hover:bg-muted/80' : 'cursor-not-allowed opacity-50'
        }`}
        onClick={audioUrl ? handleProgressClick : undefined}
      >
        <div 
          className="absolute h-full bg-gray-600 dark:bg-primary rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-600 dark:bg-primary rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* 시간 표시 및 재생 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={!audioUrl}
            className="h-8 w-8 p-0"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            disabled={!audioUrl}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          {/* 볼륨 컨트롤 */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              disabled={!audioUrl}
              className="h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="w-16 sm:w-20">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.1}
                disabled={!audioUrl}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 숨겨진 오디오 엘리먼트 */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}
    </div>
  )
} 