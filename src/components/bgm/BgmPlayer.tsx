// BGM 플레이어 메인 컨테이너 컴포넌트
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BgmTrack, BgmGenre, PlaybackMode, BgmPlayerState } from '@/types/bgm'
import { getBgmLibraryApi } from '@/lib/bgm-api'
import { MiniPlayer } from './MiniPlayer'
import { ExpandedPlayer } from './ExpandedPlayer'

export function BgmPlayer() {
  const [playerState, setPlayerState] = useState<BgmPlayerState>({
    currentTrack: null,
    currentGenre: null,
    isPlaying: false,
    isExpanded: false,
    playbackMode: PlaybackMode.NORMAL,
    queue: [],
    volume: 0.3
  })

  const [library, setLibrary] = useState<{ [genre: string]: BgmTrack[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  // YouTube URL에서 비디오 ID 추출
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }
    return null
  }

  // YouTube Player API 로드
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

        window.onYouTubeIframeAPIReady = () => {
          resolve()
        }
      })
    }

    loadYouTubeAPI()
  }, [])

  // 재생/일시정지 토글
  const togglePlayPause = useCallback(() => {
    if (youtubePlayer && isPlayerReady) {
      if (playerState.isPlaying) {
        youtubePlayer.pauseVideo()
      } else {
        youtubePlayer.playVideo()
      }
    } else {
      // YouTube Player가 준비되지 않은 경우 상태만 토글
      setPlayerState(prev => ({
        ...prev,
        isPlaying: !prev.isPlaying
      }))
    }
  }, [youtubePlayer, isPlayerReady, playerState.isPlaying])

  // 스페이스바 단축키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 텍스트 입력 중인지 확인
      const activeElement = document.activeElement
      const isTextInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      // 텍스트 입력 중이 아니고 스페이스바를 눌렀을 때만 재생 컨트롤 실행
      if (event.code === 'Space' && playerState.currentTrack && !isTextInput) {
        event.preventDefault()
        togglePlayPause()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [playerState.currentTrack, playerState.isPlaying, togglePlayPause])

  // BGM 라이브러리 로드
  const loadLibrary = async () => {
    try {
      setLoading(true)
      console.log('Loading BGM library...')
      const data = await getBgmLibraryApi()
      console.log('BGM library loaded:', data)
      setLibrary(data)
    } catch (error) {
      console.error('Failed to load BGM library:', error)
      setLibrary({})
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadLibrary()
  }, [])

  // BGM 라이브러리 새로고침 이벤트 리스너
  useEffect(() => {
    const handleLibraryRefresh = () => {
      console.log('BGM library refresh event triggered')
      loadLibrary()
    }

    window.addEventListener('bgmLibraryRefresh', handleLibraryRefresh)
    return () => {
      window.removeEventListener('bgmLibraryRefresh', handleLibraryRefresh)
    }
  }, [])

  // 현재 트랙 변경 시 비디오 ID 업데이트
  useEffect(() => {
    if (playerState.currentTrack) {
      const videoId = extractVideoId(playerState.currentTrack.videoUrl)
      setCurrentVideoId(videoId)
    } else {
      setCurrentVideoId(null)
    }
  }, [playerState.currentTrack])

  // YouTube Player 초기화
  const initializeYouTubePlayer = (iframeElement: HTMLIFrameElement) => {
    if (!window.YT || !currentVideoId) return

    const player = new window.YT.Player(iframeElement, {
      height: '100%',
      width: '100%',
      videoId: currentVideoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        disablekb: 0,
        enablejsapi: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        origin: window.location.origin,
        mute: 0,
        playsinline: 1
      },
      events: {
        onReady: (event: any) => {
          console.log('YouTube player ready')
          setYoutubePlayer(event.target)
          setIsPlayerReady(true)
          // 초기 볼륨 설정
          event.target.setVolume(playerState.volume * 100)
        },
        onStateChange: (event: any) => {
          console.log('Player state changed:', event.data)
          // 재생 상태 동기화
          if (event.data === window.YT.PlayerState.PLAYING) {
            setPlayerState(prev => ({ ...prev, isPlaying: true }))
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setPlayerState(prev => ({ ...prev, isPlaying: false }))
          }
        },
        onError: (event: any) => {
          console.error('YouTube player error:', event.data)
        }
      }
    })
  }

  // 다음 트랙
  const nextTrack = () => {
    if (playerState.queue.length > 0) {
      const currentIndex = playerState.queue.findIndex(track => track.id === playerState.currentTrack?.id)
      const nextIndex = (currentIndex + 1) % playerState.queue.length
      const nextTrack = playerState.queue[nextIndex]
      
      setPlayerState(prev => ({
        ...prev,
        currentTrack: nextTrack,
        currentGenre: nextTrack.genre
      }))
    }
  }

  // 이전 트랙
  const previousTrack = () => {
    if (playerState.queue.length > 0) {
      const currentIndex = playerState.queue.findIndex(track => track.id === playerState.currentTrack?.id)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : playerState.queue.length - 1
      const prevTrack = playerState.queue[prevIndex]
      
      setPlayerState(prev => ({
        ...prev,
        currentTrack: prevTrack,
        currentGenre: prevTrack.genre
      }))
    }
  }

  // 트랙 재생
  const playTrack = (track: BgmTrack) => {
    setPlayerState(prev => ({
      ...prev,
      currentTrack: track,
      currentGenre: track.genre,
      isPlaying: true
    }))
  }

  // 큐 설정
  const setQueue = (tracks: BgmTrack[]) => {
    setPlayerState(prev => ({
      ...prev,
      queue: tracks
    }))
  }

  // 볼륨 설정
  const setVolume = (volume: number) => {
    setPlayerState(prev => ({
      ...prev,
      volume
    }))
    
    // YouTube Player에 볼륨 적용
    if (youtubePlayer && isPlayerReady) {
      youtubePlayer.setVolume(volume * 100)
    }
  }

  // 재생 모드 설정
  const setPlaybackMode = (mode: PlaybackMode) => {
    setPlayerState(prev => ({
      ...prev,
      playbackMode: mode
    }))
  }

  // 확장 패널 토글
  const toggleExpanded = () => {
    setPlayerState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded
    }))
  }

  // 확장 패널 닫기
  const closeExpanded = () => {
    setPlayerState(prev => ({
      ...prev,
      isExpanded: false
    }))
  }

  return (
    <>
      <MiniPlayer
        playerState={playerState}
        onToggleExpanded={toggleExpanded}
        onTogglePlayPause={togglePlayPause}
        onNextTrack={nextTrack}
        onPreviousTrack={previousTrack}
        onSetVolume={setVolume}
        loading={loading}
      />

      {/* ExpandedPlayer는 항상 렌더링되지만 확장 패널 상태에 따라 보이지 않음 */}
      <ExpandedPlayer
        playerState={playerState}
        library={library}
        onPlayTrack={playTrack}
        onTogglePlayPause={togglePlayPause}
        onNextTrack={nextTrack}
        onPreviousTrack={previousTrack}
        onSetPlaybackMode={setPlaybackMode}
        onSetQueue={setQueue}
        onClose={closeExpanded}
        onInitializePlayer={initializeYouTubePlayer}
        youtubePlayer={youtubePlayer}
        isPlayerReady={isPlayerReady}
      />
    </>
  )
}

// YouTube API 타입 선언
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
} 